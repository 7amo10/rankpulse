process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/index.js';
import db from '../src/db/index.js';

let server;
const PORT = 3032;
const BASE_URL = `http://localhost:${PORT}`;

beforeAll(async () => {
  db.exec('DELETE FROM users;');
  server = app.listen(PORT);
});

afterAll(() => {
  if (server) server.close();
});

describe('Concept 6: Authentication & Protected User Routes Unit Tests', () => {
  let authToken;

  it('[TEST 1] POST /api/auth/register creates user account and returns JWT token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seo.expert@rankpulse.io',
        password: 'SuperSecurePassword123'
      })
    });

    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.token).toBeDefined();
    expect(json.user.email).toBe('seo.expert@rankpulse.io');
    authToken = json.token;
  });

  it('[TEST 2] POST /api/auth/register rejects duplicate registration with 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seo.expert@rankpulse.io',
        password: 'AnotherPassword123'
      })
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('already exists');
  });

  it('[TEST 3] POST /api/auth/login rejects invalid password with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seo.expert@rankpulse.io',
        password: 'WrongPassword'
      })
    });

    expect(res.status).toBe(401);
  });

  it('[TEST 4] POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seo.expert@rankpulse.io',
        password: 'SuperSecurePassword123'
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBeDefined();
  });

  it('[TEST 5] GET /api/auth/me rejects unauthenticated request with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it('[TEST 6] GET /api/auth/me returns user profile with valid Bearer token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.email).toBe('seo.expert@rankpulse.io');
    expect(json.audits_count).toBeDefined();
  });
});
