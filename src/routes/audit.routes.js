import { Router } from 'express';
import db from '../db/index.js';
import { createAuditSchema, auditIdParamSchema } from '../schemas/audit.schema.js';

const router = Router();

/**
 * Milestone 2 Walking Skeleton:
 * POST /api/audits: Validates URL, creates audit in DB, returns 201 Created.
 */
router.post('/audits', (req, res) => {
  const result = createAuditSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  const { url, focusKeyword } = result.data;
  const now = new Date().toISOString();

  try {
    const insertQuery = db.prepare(`
      INSERT INTO audits (user_id, url, focus_keyword, health_score, title, meta_description, word_count, status, metrics, recommendations, created_at)
      VALUES ($userId, $url, $focusKeyword, $healthScore, $title, $metaDesc, $wordCount, $status, $metrics, $recs, $createdAt)
      RETURNING *
    `);

    const newAudit = insertQuery.get({
      $userId: req.user?.id || null,
      $url: url,
      $focusKeyword: focusKeyword || null,
      $healthScore: 0,
      $title: null,
      $metaDesc: null,
      $wordCount: 0,
      $status: 'pending',
      $metrics: JSON.stringify({}),
      $recs: JSON.stringify([]),
      $createdAt: now
    });

    res.status(201).json({
      message: 'Audit initiated successfully (Walking Skeleton)',
      data: {
        id: newAudit.id,
        url: newAudit.url,
        focus_keyword: newAudit.focus_keyword,
        health_score: newAudit.health_score,
        status: newAudit.status,
        created_at: newAudit.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Database operation failed: ' + err.message });
  }
});

/**
 * GET /api/audits: List audits from database.
 */
router.get('/audits', (req, res) => {
  try {
    const audits = db.query(`
      SELECT id, user_id, url, focus_keyword, health_score, title, word_count, status, created_at
      FROM audits
      ORDER BY id DESC
      LIMIT 50
    `).all();

    res.status(200).json({
      count: audits.length,
      data: audits
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audits: ' + err.message });
  }
});

/**
 * GET /api/audits/:id: Retrieve single audit.
 */
router.get('/audits/:id', (req, res) => {
  const paramResult = auditIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid audit ID parameter' });
  }

  const { id } = paramResult.data;
  try {
    const audit = db.query('SELECT * FROM audits WHERE id = ?').get(id);

    if (!audit) {
      return res.status(404).json({ error: `Audit with ID ${id} not found` });
    }

    res.status(200).json({
      data: {
        ...audit,
        metrics: audit.metrics ? JSON.parse(audit.metrics) : {},
        recommendations: audit.recommendations ? JSON.parse(audit.recommendations) : []
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit: ' + err.message });
  }
});

export default router;
