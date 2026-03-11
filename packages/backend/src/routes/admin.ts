import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as authService from '../services/authService.js';
import { getDb } from '../db/connection.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// List all users
router.get('/users', (_req, res) => {
  const users = authService.listUsers();
  // Add usage stats per user
  const db = getDb();
  const enriched = (users as any[]).map(u => {
    const usage = db.prepare(`
      SELECT COUNT(*) as conversations,
             (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ?) as messages
      FROM conversations WHERE user_id = ?
    `).get(u.id, u.id) as any;
    const tokens = db.prepare(`
      SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as totalTokens,
             COALESCE(SUM(cost_usd), 0) as totalCost
      FROM usage_logs WHERE user_id = ?
    `).get(u.id) as any;
    return { ...u, ...usage, ...tokens };
  });
  res.json(enriched);
});

// Update user (tier, role)
router.patch('/users/:id', (req, res) => {
  const user = authService.updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Delete user
router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
  authService.deleteUser(req.params.id);
  res.status(204).end();
});

// System stats
router.get('/stats', (_req, res) => {
  const db = getDb();
  const users = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const conversations = (db.prepare('SELECT COUNT(*) as c FROM conversations').get() as any).c;
  const messages = (db.prepare('SELECT COUNT(*) as c FROM messages').get() as any).c;
  const tokens = db.prepare('SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as total, COALESCE(SUM(cost_usd), 0) as cost FROM usage_logs').get() as any;
  const tierDist = db.prepare('SELECT tier, COUNT(*) as count FROM users GROUP BY tier').all();
  const dailySignups = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count FROM users
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at) ORDER BY date ASC
  `).all();
  const dailyUsage = db.prepare(`
    SELECT date(created_at) as date, SUM(input_tokens + output_tokens) as tokens, SUM(cost_usd) as cost
    FROM usage_logs WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at) ORDER BY date ASC
  `).all();
  const modelUsage = db.prepare(`
    SELECT model, COUNT(*) as calls, SUM(input_tokens + output_tokens) as tokens, SUM(cost_usd) as cost
    FROM usage_logs GROUP BY model ORDER BY calls DESC
  `).all();

  res.json({ users, conversations, messages, totalTokens: tokens.total, totalCost: tokens.cost, tierDist, dailySignups, dailyUsage, modelUsage });
});

export default router;
