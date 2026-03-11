import { getDb } from '../db/connection.js';
type Model = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
const MODEL_PRICING: Record<Model, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
};

export function logUsage(conversationId: string, model: string, inputTokens: number, outputTokens: number, userId?: string) {
  const pricing = MODEL_PRICING[model as Model];
  const cost = pricing
    ? (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
    : 0;
  getDb().prepare(
    'INSERT INTO usage_logs (conversation_id, user_id, model, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(conversationId, userId || null, model, inputTokens, outputTokens, cost);
}

export function getUsageSummary(userId?: string) {
  const db = getDb();
  const where = userId ? 'WHERE user_id = ?' : '';
  const params = userId ? [userId] : [];
  const usage = db.prepare(`
    SELECT COALESCE(SUM(input_tokens), 0) as totalInputTokens,
           COALESCE(SUM(output_tokens), 0) as totalOutputTokens,
           COALESCE(SUM(cost_usd), 0) as totalCostUsd
    FROM usage_logs ${where}
  `).get(...params) as any;

  const convWhere = userId ? 'WHERE user_id = ?' : '';
  const msgWhere = userId ? 'WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)' : '';
  const msgCount = (db.prepare(`SELECT COUNT(*) as c FROM messages ${msgWhere}`).get(...params) as any).c;
  const convCount = (db.prepare(`SELECT COUNT(*) as c FROM conversations ${convWhere}`).get(...params) as any).c;
  return { ...usage, messageCount: msgCount, conversationCount: convCount };
}

export function getDailyUsage(days = 30, userId?: string) {
  const where = userId ? 'AND user_id = ?' : '';
  const params = [`-${days} days`, ...(userId ? [userId] : [])];
  return getDb().prepare(`
    SELECT date(created_at) as date,
           SUM(input_tokens) as inputTokens,
           SUM(output_tokens) as outputTokens,
           SUM(cost_usd) as cost
    FROM usage_logs
    WHERE created_at >= datetime('now', ?) ${where}
    GROUP BY date(created_at) ORDER BY date ASC
  `).all(...params);
}

export function getCostsByModel(days = 30, userId?: string) {
  const where = userId ? 'AND user_id = ?' : '';
  const params = [`-${days} days`, ...(userId ? [userId] : [])];
  return getDb().prepare(`
    SELECT model, SUM(input_tokens) as inputTokens, SUM(output_tokens) as outputTokens, SUM(cost_usd) as cost
    FROM usage_logs WHERE created_at >= datetime('now', ?) ${where}
    GROUP BY model ORDER BY cost DESC
  `).all(...params);
}
