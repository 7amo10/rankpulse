import crypto from 'crypto';
import db from '../db/index.js';
import config from '../config/env.js';

const memoryCache = new Map();

/**
 * Generates a deterministic SHA-256 cache key from input strings.
 */
export function generateCacheKey(prefix, ...args) {
  const normalized = args.map((a) => String(a || '').trim().toLowerCase()).join('|');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  return `${prefix}:${hash}`;
}

/**
 * Retrieves a cached JSON value by key.
 * Checks fast in-memory cache first, then SQLite backing store.
 */
export function getCached(key) {
  const now = Math.floor(Date.now() / 1000);

  // 1. Check in-memory Map
  if (memoryCache.has(key)) {
    const memEntry = memoryCache.get(key);
    if (memEntry.expiresAt > now) {
      return memEntry.value;
    }
    memoryCache.delete(key);
  }

  // 2. Check SQLite persistent cache
  try {
    const row = db.query('SELECT value, expires_at FROM cache_store WHERE key = ?').get(key);
    if (row) {
      if (row.expires_at > now) {
        const parsed = JSON.parse(row.value);
        // Hydrate memory cache
        memoryCache.set(key, { value: parsed, expiresAt: row.expires_at });
        return parsed;
      }
      // Expired row cleanup
      db.prepare('DELETE FROM cache_store WHERE key = ?').run(key);
    }
  } catch (err) {
    console.warn(`Cache read warning for ${key}:`, err.message);
  }

  return null;
}

/**
 * Stores a JSON-serializable value in both memory and SQLite cache.
 */
export function setCached(key, value, ttlSeconds = config.CACHE_TTL_SECONDS) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const serialized = JSON.stringify(value);

  // 1. Set in memory
  memoryCache.set(key, { value, expiresAt });

  // 2. Persist to SQLite
  try {
    const upsert = db.prepare(`
      INSERT INTO cache_store (key, value, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at
    `);
    upsert.run(key, serialized, expiresAt);
  } catch (err) {
    console.warn(`Cache write warning for ${key}:`, err.message);
  }

  return value;
}

/**
 * Deletes a specific cache entry.
 */
export function invalidateCache(key) {
  memoryCache.delete(key);
  try {
    db.prepare('DELETE FROM cache_store WHERE key = ?').run(key);
  } catch (err) {}
}

/**
 * Removes all expired entries from memory and SQLite.
 */
export function purgeExpiredCache() {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt <= now) memoryCache.delete(k);
  }

  try {
    db.prepare('DELETE FROM cache_store WHERE expires_at <= ?').run(now);
  } catch (err) {}
}

export default {
  generateCacheKey,
  getCached,
  setCached,
  invalidateCache,
  purgeExpiredCache
};
