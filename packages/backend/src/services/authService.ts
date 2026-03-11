import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CONFIG, TIERS, type Tier } from '../config.js';

export function register(email: string, password: string, name: string) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new Error('Email already registered');

  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(id, email, hash, name);
  return db.prepare('SELECT id, email, name, role, tier, avatar_url, created_at FROM users WHERE id = ?').get(id);
}

export function login(email: string, password: string) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) throw new Error('Invalid credentials');

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  const token = jwt.sign({ userId: user.id, role: user.role }, CONFIG.jwtSecret, { expiresIn: CONFIG.jwtExpiresIn } as any);
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tier: user.tier, avatar_url: user.avatar_url },
  };
}

export function verifyToken(token: string) {
  return jwt.verify(token, CONFIG.jwtSecret) as { userId: string; role: string };
}

export function getUser(id: string) {
  return getDb().prepare('SELECT id, email, name, role, tier, avatar_url, created_at, last_login FROM users WHERE id = ?').get(id);
}

export function listUsers() {
  return getDb().prepare('SELECT id, email, name, role, tier, created_at, last_login FROM users ORDER BY created_at DESC').all();
}

export function updateUser(id: string, data: Partial<{ name: string; tier: string; role: string }>) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name) { fields.push('name = ?'); values.push(data.name); }
  if (data.tier) { fields.push('tier = ?'); values.push(data.tier); }
  if (data.role) { fields.push('role = ?'); values.push(data.role); }
  if (fields.length === 0) return getUser(id);
  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUser(id);
}

export function deleteUser(id: string) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

// API Keys
export function createApiKey(userId: string, name: string) {
  const id = uuid();
  const rawKey = `sk-ai-${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12) + '...';
  getDb().prepare('INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?, ?)').run(id, userId, name, keyHash, keyPrefix);
  return { id, name, key: rawKey, key_prefix: keyPrefix }; // Only return raw key on creation
}

export function listApiKeys(userId: string) {
  return getDb().prepare('SELECT id, name, key_prefix, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function deleteApiKey(id: string, userId: string) {
  getDb().prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(id, userId);
}

export function validateApiKey(rawKey: string) {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const db = getDb();
  const apiKey = db.prepare(`
    SELECT ak.id, ak.user_id, u.tier, u.role FROM api_keys ak
    JOIN users u ON u.id = ak.user_id
    WHERE ak.key_hash = ?
  `).get(keyHash) as any;
  if (apiKey) {
    db.prepare("UPDATE api_keys SET last_used = datetime('now') WHERE id = ?").run(apiKey.id);
  }
  return apiKey;
}

// Usage limits
export function getMonthlyUsage(userId: string) {
  const result = getDb().prepare(`
    SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as totalTokens
    FROM usage_logs
    WHERE user_id = ? AND created_at >= datetime('now', 'start of month')
  `).get(userId) as { totalTokens: number };
  return result.totalTokens;
}

export function checkTierLimits(userId: string, model: string): { allowed: boolean; reason?: string } {
  const user = getDb().prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { allowed: false, reason: 'User not found' };

  const tierConfig = TIERS[user.tier as Tier];

  // Check model access
  if (!tierConfig.models.includes(model as any)) {
    return { allowed: false, reason: `${tierConfig.name} tier doesn't have access to this model. Upgrade to use it.` };
  }

  // Check token limit
  const monthlyUsage = getMonthlyUsage(userId);
  if (monthlyUsage >= tierConfig.monthlyTokens) {
    return { allowed: false, reason: `Monthly token limit reached (${tierConfig.monthlyTokens.toLocaleString()} tokens). Upgrade your plan.` };
  }

  // Check conversation limit
  if (tierConfig.maxConversations > 0) {
    const convCount = (getDb().prepare('SELECT COUNT(*) as c FROM conversations WHERE user_id = ?').get(userId) as any).c;
    if (convCount >= tierConfig.maxConversations) {
      return { allowed: false, reason: `Conversation limit reached (${tierConfig.maxConversations}). Delete old conversations or upgrade.` };
    }
  }

  return { allowed: true };
}
