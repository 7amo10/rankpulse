import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import config from '../config/env.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Registers a new user with hashed password and returns JWT token.
 */
router.post('/auth/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    });
  }

  const { email, password } = result.data;

  // Check for existing user
  const existing = db.query('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO users (email, password_hash, created_at)
      VALUES (?, ?, ?)
      RETURNING id, email, created_at
    `);

    const user = insert.get(email, passwordHash, createdAt);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token.
 */
router.post('/auth/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    });
  }

  const { email, password } = result.data;

  try {
    const user = db.query('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile and audit history count.
 */
router.get('/auth/me', requireAuth, (req, res) => {
  try {
    const auditsCount = db.query('SELECT COUNT(*) as count FROM audits WHERE user_id = ?').get(req.user.id);

    res.status(200).json({
      user: req.user,
      audits_count: auditsCount.count
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile: ' + err.message });
  }
});

export default router;
