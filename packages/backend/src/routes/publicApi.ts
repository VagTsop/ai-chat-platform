import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
import * as msgService from '../services/messageService.js';
import * as analyticsService from '../services/analyticsService.js';
import { streamChat } from '../services/aiService.js';
import { checkTierLimits, validateApiKey } from '../services/authService.js';

const router = Router();

// API key auth middleware for public API
function apiKeyAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer sk-ai-')) {
    return res.status(401).json({ error: 'API key required. Use: Authorization: Bearer sk-ai-...' });
  }
  const apiKey = validateApiKey(authHeader.slice(7));
  if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
  req.userId = apiKey.user_id;
  req.userTier = apiKey.tier;
  next();
}

router.use(apiKeyAuth);

// Simple chat completion (non-streaming for API consumers)
router.post('/chat/completions', async (req, res) => {
  const { message, model = 'claude-sonnet-4-20250514', system_prompt, conversation_id, stream = false } = req.body;

  if (!message) return res.status(400).json({ error: 'message required' });

  const limits = checkTierLimits(req.userId!, model);
  if (!limits.allowed) return res.status(403).json({ error: limits.reason });

  // Create or use existing conversation
  const db = getDb();
  let convId = conversation_id;
  if (!convId) {
    convId = uuid();
    db.prepare('INSERT INTO conversations (id, user_id, title, model, system_prompt) VALUES (?, ?, ?, ?, ?)').run(
      convId, req.userId, message.slice(0, 50), model, system_prompt || null
    );
  }

  // Save user message
  msgService.createMessage({ conversation_id: convId, role: 'user', content: message });
  const history = msgService.getContextMessages(convId);

  if (stream) {
    // SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    let fullResponse = '';
    await streamChat(model, system_prompt || null, history, {
      onDelta: (text) => {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'delta', content: text })}\n\n`);
      },
      onDone: (usage) => {
        msgService.createMessage({ conversation_id: convId, role: 'assistant', content: fullResponse, model, ...usage });
        analyticsService.logUsage(convId, model, usage.input_tokens, usage.output_tokens, req.userId);
        res.write(`data: ${JSON.stringify({ type: 'done', conversation_id: convId, ...usage })}\n\n`);
        res.end();
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
        res.end();
      },
    });
  } else {
    // Non-streaming response
    let fullResponse = '';
    await streamChat(model, system_prompt || null, history, {
      onDelta: (text) => { fullResponse += text; },
      onDone: (usage) => {
        msgService.createMessage({ conversation_id: convId, role: 'assistant', content: fullResponse, model, ...usage });
        analyticsService.logUsage(convId, model, usage.input_tokens, usage.output_tokens, req.userId);
        res.json({
          conversation_id: convId,
          message: fullResponse,
          model,
          usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens },
        });
      },
      onError: (error) => res.status(500).json({ error }),
    });
  }
});

// List conversations via API
router.get('/conversations', (req, res) => {
  res.json(getDb().prepare('SELECT id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50').all(req.userId));
});

// Get conversation messages
router.get('/conversations/:id/messages', (req, res) => {
  const conv = getDb().prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(msgService.getMessages(req.params.id));
});

export default router;
