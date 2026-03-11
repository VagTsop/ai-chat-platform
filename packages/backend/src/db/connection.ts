import Database from 'better-sqlite3';
import { CONFIG } from '../config.js';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(CONFIG.dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    db = new Database(CONFIG.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
