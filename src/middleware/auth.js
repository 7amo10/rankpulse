import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import db from '../db/index.js';

/**
 * Strict Authentication Middleware:
 * Verifies Bearer JWT token in Authorization header and attaches req.user.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Access token cannot be empty.' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.query('SELECT id, email, created_at FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Optional Authentication Middleware:
 * If a valid token is provided, attaches req.user. If no token, continues as guest.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.query('SELECT id, email, created_at FROM users WHERE id = ?').get(decoded.userId);
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }

  next();
}

export default { requireAuth, optionalAuth };
