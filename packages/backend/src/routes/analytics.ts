import { Router } from 'express';
import * as analyticsService from '../services/analyticsService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  res.json(analyticsService.getUsageSummary(req.userId));
});

router.get('/usage', (req, res) => {
  const days = Number(req.query.days) || 30;
  res.json(analyticsService.getDailyUsage(days, req.userId));
});

router.get('/costs', (req, res) => {
  const days = Number(req.query.days) || 30;
  res.json(analyticsService.getCostsByModel(days, req.userId));
});

export default router;
