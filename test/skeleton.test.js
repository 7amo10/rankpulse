process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/index.js';
import db from '../src/db/index.js';

let server;
const PORT = 3033;
const BASE_URL = `http://localhost:${PORT}`;

beforeAll(async () => {
  db.exec('DELETE FROM audits; DELETE FROM users; DELETE FROM cache_store;');
  server = app.listen(PORT);
});

afterAll(() => {
  if (server) server.close();
});

describe('Milestone 2 & 3: Integrated End-to-End Pipeline Tests', () => {
  let createdAuditId;

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

  it('[TEST 3] POST /api/audits performs full audit, persists to DB, and returns 201 Created', async () => {
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
    createdAuditId = json.data.id;
    expect(json.data.url).toContain('books.toscrape.com');
    expect(json.data.health_score).toBeGreaterThan(0);
    expect(json.data.pdf_report_url).toBe(`/api/audits/${createdAuditId}/pdf`);
  }, 25000);

  it('[TEST 4] POST /api/audits re-request serves from cache (cached: true)', async () => {
    const res = await fetch(`${BASE_URL}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
        focusKeyword: 'poetry'
      })
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.cached).toBe(true);
  });

  it('[TEST 5] GET /api/audits lists saved audits from database', async () => {
    const res = await fetch(`${BASE_URL}/api/audits`);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.count).toBeGreaterThanOrEqual(1);
    expect(json.data[0].url).toContain('books.toscrape.com');
  });

  it('[TEST 6] GET /api/audits/:id retrieves single audit details', async () => {
    const res = await fetch(`${BASE_URL}/api/audits/${createdAuditId}`);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe(createdAuditId);
    expect(json.data.metrics).toBeDefined();
  });

  it('[TEST 7] GET /api/audits/:id/pdf generates and serves PDF report with status 200', async () => {
    const res = await fetch(`${BASE_URL}/api/audits/${createdAuditId}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(500);
  });
});
