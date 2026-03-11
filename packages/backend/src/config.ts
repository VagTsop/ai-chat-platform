import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

export const CONFIG = {
  port: Number(process.env.PORT) || 3002,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  dbPath: process.env.DB_PATH || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/ai-chat.db'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
  jwtExpiresIn: '7d',
};

export const TIERS = {
  free: { name: 'Free', monthlyTokens: 100_000, maxConversations: 10, maxDocs: 3, models: ['claude-haiku-4-5-20251001'] },
  pro: { name: 'Pro', monthlyTokens: 1_000_000, maxConversations: 100, maxDocs: 20, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514'] },
  enterprise: { name: 'Enterprise', monthlyTokens: 10_000_000, maxConversations: -1, maxDocs: -1, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514'] },
} as const;

export type Tier = keyof typeof TIERS;
