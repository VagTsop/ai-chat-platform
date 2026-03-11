import { Router } from 'express';
import * as authService from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { TIERS } from '../config.js';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password, and name required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const user = authService.register(email, password, name);
    const loginResult = authService.login(email, password);
    res.status(201).json(loginResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const result = authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  const user = authService.getUser(req.userId!);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const usage = authService.getMonthlyUsage(req.userId!);
  const tier = TIERS[req.userTier as keyof typeof TIERS];
  res.json({ ...user as any, monthlyUsage: usage, tierLimits: tier });
});

// API Keys
router.get('/api-keys', requireAuth, (req, res) => {
  res.json(authService.listApiKeys(req.userId!));
});

router.post('/api-keys', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const key = authService.createApiKey(req.userId!, name);
  res.status(201).json(key);
});

router.delete('/api-keys/:id', requireAuth, (req, res) => {
  authService.deleteApiKey(req.params.id, req.userId!);
  res.status(204).end();
});

// Tiers info
router.get('/tiers', (_req, res) => {
  res.json(TIERS);
});

export default router;
