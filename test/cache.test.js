import { describe, it, expect } from 'bun:test';
import {
  generateCacheKey,
  getCached,
  setCached,
  invalidateCache,
  purgeExpiredCache
} from '../src/services/cache.service.js';

describe('Concept 3: Caching Logic Unit Tests', () => {
  it('[TEST 1] Generates deterministic cache keys with prefix', () => {
    const key1 = generateCacheKey('audit', 'https://example.com/page', 'keyword');
    const key2 = generateCacheKey('audit', 'https://example.com/page', 'keyword');
    const keyDiff = generateCacheKey('audit', 'https://example.com/other', 'keyword');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyDiff);
    expect(key1.startsWith('audit:')).toBe(true);
  });

  it('[TEST 2] Stores and retrieves values from cache', () => {
    const key = generateCacheKey('test', 'item-1');
    const payload = { score: 95, url: 'https://example.com' };

    setCached(key, payload, 60);
    const retrieved = getCached(key);

    expect(retrieved).toBeDefined();
    expect(retrieved.score).toBe(95);
    expect(retrieved.url).toBe('https://example.com');
  });

  it('[TEST 3] Invalidates and removes cache keys', () => {
    const key = generateCacheKey('test', 'delete-me');
    setCached(key, { toDelete: true }, 60);
    expect(getCached(key)).toBeDefined();

    invalidateCache(key);
    expect(getCached(key)).toBeNull();
  });

  it('[TEST 4] Ignores expired entries when TTL has elapsed', async () => {
    const key = generateCacheKey('test', 'expire-fast');
    // Set 1-second TTL
    setCached(key, { temporal: true }, 1);
    expect(getCached(key)).toBeDefined();

    // Wait 1.2 seconds for expiration
    await new Promise((r) => setTimeout(r, 1200));

    expect(getCached(key)).toBeNull();
  });
});
