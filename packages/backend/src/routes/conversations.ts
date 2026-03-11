import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import * as msgService from '../services/messageService.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId));
});

router.post('/', (req, res) => {
  const id = uuid();
  const { title, model, system_prompt } = req.body;
  getDb().prepare(
    'INSERT INTO conversations (id, user_id, title, model, system_prompt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.userId, title || 'New Chat', model || 'claude-sonnet-4-20250514', system_prompt || null);
  res.status(201).json(getDb().prepare('SELECT * FROM conversations WHERE id = ?').get(id));
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const { title, model, system_prompt } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (model !== undefined) { fields.push('model = ?'); values.push(model); }
  if (system_prompt !== undefined) { fields.push('system_prompt = ?'); values.push(system_prompt); }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json(db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

router.get('/:id/messages', (req, res) => {
  const conv = getDb().prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(msgService.getMessages(req.params.id));
});

router.get('/:id/export', (req, res) => {
  const conv = getDb().prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!conv) return res.status(404).json({ error: 'Not found' });
  const messages = msgService.getMessages(req.params.id);

  let md = `# ${conv.title}\n\n**Model:** ${conv.model}  \n**Date:** ${conv.created_at}\n\n---\n\n`;
  for (const msg of messages) {
    md += `### ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n${msg.content}\n\n---\n\n`;
  }
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${conv.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
  res.send(md);
});

export default router;
