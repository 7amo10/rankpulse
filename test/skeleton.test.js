process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/index.js';
import db from '../src/db/index.js';

let server;
const PORT = 3031;
const BASE_URL = `http://localhost:${PORT}`;

beforeAll(async () => {
  db.exec('DELETE FROM audits; DELETE FROM users;');
  server = app.listen(PORT);
});

afterAll(() => {
  if (server) server.close();
});

describe('Milestone 2: Walking Skeleton End-to-End Tests', () => {
  it('[TEST 1] GET /api/health returns database connectivity status 200', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database).toBe('connected');
  });

  it('[TEST 2] POST /api/audits with invalid URL returns 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-valid-url' })
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('[TEST 3] POST /api/audits creates audit in database and returns 201 Created', async () => {
    const res = await fetch(`${BASE_URL}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
        focusKeyword: 'poetry'
      })
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data).toBeDefined();
    expect(json.data.id).toBeGreaterThan(0);
    expect(json.data.url).toBe('https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html');
    expect(json.data.focus_keyword).toBe('poetry');
  });

  it('[TEST 4] GET /api/audits lists saved audits from database', async () => {
    const res = await fetch(`${BASE_URL}/api/audits`);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.count).toBeGreaterThanOrEqual(1);
    expect(json.data[0].url).toContain('books.toscrape.com');
  });

  it('[TEST 5] GET /api/audits/:id retrieves single audit details', async () => {
    const listRes = await fetch(`${BASE_URL}/api/audits`);
    const listJson = await listRes.json();
    const targetId = listJson.data[0].id;

    const res = await fetch(`${BASE_URL}/api/audits/${targetId}`);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe(targetId);
  });
});
