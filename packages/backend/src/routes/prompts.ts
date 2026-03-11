import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (_req, res) => {
  res.json(getDb().prepare('SELECT * FROM system_prompts ORDER BY is_default DESC, created_at ASC').all());
});

router.post('/', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content required' });
  const id = uuid();
  getDb().prepare('INSERT INTO system_prompts (id, name, content) VALUES (?, ?, ?)').run(id, name, content);
  res.status(201).json(getDb().prepare('SELECT * FROM system_prompts WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  const prompt = getDb().prepare('SELECT * FROM system_prompts WHERE id = ?').get(req.params.id) as any;
  if (!prompt) return res.status(404).json({ error: 'Not found' });
  if (prompt.is_default) return res.status(400).json({ error: 'Cannot delete default prompts' });
  getDb().prepare('DELETE FROM system_prompts WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
