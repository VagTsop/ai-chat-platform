import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
export function listConversations(): any[] {
  return getDb().prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as Conversation[];
}

export function getConversation(id: string): any | undefined {
  return getDb().prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

export function createConversation(data: { title?: string; model?: string; system_prompt?: string }): any {
  const id = uuid();
  const db = getDb();
  db.prepare(
    'INSERT INTO conversations (id, title, model, system_prompt) VALUES (?, ?, ?, ?)'
  ).run(id, data.title || 'New Chat', data.model || 'claude-sonnet-4-20250514', data.system_prompt || null);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

export function updateConversation(id: string, data: Partial<{ title: string; model: string; system_prompt: string }>): any | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.model !== undefined) { fields.push('model = ?'); values.push(data.model); }
  if (data.system_prompt !== undefined) { fields.push('system_prompt = ?'); values.push(data.system_prompt); }
  if (fields.length === 0) return getConversation(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getConversation(id);
}

export function deleteConversation(id: string): boolean {
  const result = getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return result.changes > 0;
}

export function touchConversation(id: string) {
  getDb().prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(id);
}
