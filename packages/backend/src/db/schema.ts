import { getDb } from './connection.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export function initSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'enterprise')),
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
      system_prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      chunk_count INTEGER DEFAULT 0,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id, chunk_index);

    CREATE TABLE IF NOT EXISTS system_prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      conversation_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
  `);

  // Seed default system prompts
  const promptCount = db.prepare('SELECT COUNT(*) as c FROM system_prompts WHERE is_default = 1').get() as { c: number };
  if (promptCount.c === 0) {
    const insert = db.prepare('INSERT INTO system_prompts (id, name, content, is_default) VALUES (?, ?, ?, 1)');
    const defaults = [
      ['General Chat', 'You are a helpful, friendly assistant.'],
      ['Code Assistant', 'You are an expert programmer. Provide clean, well-commented code with explanations. Use markdown code blocks with language tags.'],
      ['Writing Helper', 'You are a skilled writer and editor. Help with drafting, editing, and improving text. Focus on clarity, style, and grammar.'],
      ['Data Analyst', 'You are a data analysis expert. Help interpret data, suggest visualizations, and write queries. Be precise with numbers.'],
    ];
    for (const [name, content] of defaults) {
      insert.run(uuid(), name, content);
    }
  }

  // Seed admin user
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const adminId = uuid();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, email, password, name, role, tier) VALUES (?, ?, ?, ?, ?, ?)').run(
      adminId, 'admin@aichat.com', hash, 'Admin', 'admin', 'enterprise'
    );
    // Demo user
    const userId = uuid();
    const userHash = bcrypt.hashSync('demo123', 10);
    db.prepare('INSERT INTO users (id, email, password, name, role, tier) VALUES (?, ?, ?, ?, ?, ?)').run(
      userId, 'demo@aichat.com', userHash, 'Demo User', 'user', 'pro'
    );
    console.log('[Schema] Seeded admin (admin@aichat.com / admin123) and demo user (demo@aichat.com / demo123)');
  }
}
