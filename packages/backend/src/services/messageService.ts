import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
export function getMessages(conversationId: string): any[] {
  return getDb().prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(conversationId) as Message[];
}

export function createMessage(data: {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
}): any {
  const id = uuid();
  const db = getDb();
  db.prepare(
    'INSERT INTO messages (id, conversation_id, role, content, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.conversation_id, data.role, data.content, data.model || null, data.input_tokens || 0, data.output_tokens || 0);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message;
}

export function getContextMessages(conversationId: string, maxMessages = 50): { role: string; content: string }[] {
  const msgs = getDb().prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(conversationId, maxMessages) as { role: string; content: string }[];
  return msgs.reverse();
}
