import { Database } from 'bun:sqlite';
import path from 'path';
import config from '../config/env.js';

const dbPath = path.resolve(process.cwd(), config.DB_PATH);
export const db = new Database(dbPath, { create: true });

// Enable Write-Ahead Logging for high concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initializes database tables and schemas.
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      url TEXT NOT NULL,
      focus_keyword TEXT,
      health_score INTEGER DEFAULT 0,
      title TEXT,
      meta_description TEXT,
      word_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      metrics TEXT,
      recommendations TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS llm_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id INTEGER,
      prompt_tokens INTEGER DEFAULT 0,
      candidate_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      model TEXT NOT NULL,
      cost_est_usd REAL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cache_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
}

// Automatically ensure schema on load
initDatabase();

export default db;
