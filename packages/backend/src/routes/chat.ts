import { Router } from 'express';
import { getDb } from '../db/connection.js';
import * as msgService from '../services/messageService.js';
import * as analyticsService from '../services/analyticsService.js';
import { streamChat } from '../services/aiService.js';
import { retrieveContext } from '../services/ragService.js';
import { checkTierLimits } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Content required' });
  }

  const db = getDb();
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, req.userId) as any;
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  // Check tier limits
  const limits = checkTierLimits(req.userId!, conv.model);
  if (!limits.allowed) {
    return res.status(403).json({ error: limits.reason });
  }

  // Save user message
  msgService.createMessage({ conversation_id: conversationId, role: 'user', content: content.trim() });

  // RAG context
  const ragChunks = retrieveContext(conversationId, content);
  let systemPrompt = conv.system_prompt || null;
  if (ragChunks.length > 0) {
    const ragContext = ragChunks.map((c: string, i: number) => `[Document Excerpt ${i + 1}]\n${c}`).join('\n\n---\n\n');
    systemPrompt = (systemPrompt || '') + `\n\nUse the following document excerpts as context when relevant:\n\n${ragContext}`;
  }

  const history = msgService.getContextMessages(conversationId);

  // SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let fullResponse = '';

  await streamChat(conv.model, systemPrompt, history, {
    onDelta: (text) => {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ type: 'delta', content: text })}\n\n`);
    },
    onDone: (usage) => {
      msgService.createMessage({
        conversation_id: conversationId, role: 'assistant', content: fullResponse,
        model: conv.model, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens,
      });

      analyticsService.logUsage(conversationId, conv.model, usage.input_tokens, usage.output_tokens, req.userId);

      // Auto-title
      const msgs = msgService.getMessages(conversationId);
      if (msgs.length <= 2 && conv.title === 'New Chat') {
        const title = content.trim().slice(0, 50) + (content.trim().length > 50 ? '...' : '');
        db.prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, conversationId);
      } else {
        db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
      }

      res.write(`data: ${JSON.stringify({ type: 'done', input_tokens: usage.input_tokens, output_tokens: usage.output_tokens })}\n\n`);
      res.end();
    },
    onError: (error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
      res.end();
    },
  });
});

export default router;
