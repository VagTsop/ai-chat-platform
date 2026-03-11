import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
import { chunkText, estimateTokens } from '../utils/chunker.js';
import { readFileSync } from 'fs';

export async function processDocument(filePath: string, mimeType: string, docId: string) {
  let text: string;

  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = readFileSync(filePath);
    const pdf = await pdfParse(buffer);
    text = pdf.text;
  } else {
    text = readFileSync(filePath, 'utf-8');
  }

  const chunks = chunkText(text);
  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO document_chunks (id, document_id, chunk_index, content, token_count) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (let i = 0; i < chunks.length; i++) {
      insert.run(uuid(), docId, i, chunks[i], estimateTokens(chunks[i]));
    }
  });
  insertMany();

  db.prepare('UPDATE documents SET chunk_count = ? WHERE id = ?').run(chunks.length, docId);
  return chunks.length;
}

export function retrieveContext(conversationId: string, query: string, maxChunks = 5): string[] {
  const db = getDb();
  const docs = db.prepare(
    'SELECT id FROM documents WHERE conversation_id = ?'
  ).all(conversationId) as { id: string }[];

  if (docs.length === 0) return [];

  const docIds = docs.map(d => d.id);
  const placeholders = docIds.map(() => '?').join(',');
  const chunks = db.prepare(
    `SELECT content FROM document_chunks WHERE document_id IN (${placeholders}) ORDER BY chunk_index`
  ).all(...docIds) as { content: string }[];

  // Simple keyword scoring
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = chunks.map(chunk => {
    const lower = chunk.content.toLowerCase();
    const score = queryWords.reduce((acc, word) => {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return acc + (lower.match(regex) || []).length;
    }, 0);
    return { content: chunk.content, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .filter(s => s.score > 0)
    .map(s => s.content);
}
