import { Router } from 'express';
import db from '../db/index.js';
import { createAuditSchema, auditIdParamSchema } from '../schemas/audit.schema.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { scrapePage } from '../services/scraper.service.js';
import { analyzeSeo } from '../services/analyzer.service.js';
import { generateSeoRecommendations } from '../services/gemini.service.js';
import { generateAuditPdf } from '../services/report.service.js';
import { generateCacheKey, getCached, setCached } from '../services/cache.service.js';

const router = Router();

/**
 * POST /api/audits: Full Automated SEO & Content Audit Pipeline.
 * 1. Checks Cache
 * 2. Scrapes Target DOM politely via Cheerio
 * 3. Analyzes On-Page Heuristics
 * 4. Generates AI Recommendations via Google Gemini
 * 5. Persists Audit & LLM Token Logs in SQLite
 * 6. Returns Complete Audit Record + PDF Export URL
 */
router.post('/audits', optionalAuth, async (req, res) => {
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
  const cacheKey = generateCacheKey('audit', url, focusKeyword);

  // 1. Check TTL Cache
  const cachedAudit = getCached(cacheKey);
  if (cachedAudit) {
    return res.status(200).json({
      message: 'Audit retrieved from cache (instant 10x performance)',
      cached: true,
      data: cachedAudit
    });
  }

  const now = new Date().toISOString();
  let scraped;

  // 2. Web Scraping Phase
  try {
    scraped = await scrapePage(url);
  } catch (err) {
    return res.status(422).json({
      error: `Failed to scrape target URL: ${err.message}`,
      targetUrl: url
    });
  }

  // 3. Heuristic SEO Analysis Phase
  const analysis = analyzeSeo(scraped.signals, focusKeyword);

  // 4. Initial Database Record Insertion
  let auditRecord;
  try {
    const insertQuery = db.prepare(`
      INSERT INTO audits (user_id, url, focus_keyword, health_score, title, meta_description, word_count, status, metrics, recommendations, created_at)
      VALUES ($userId, $url, $focusKeyword, $healthScore, $title, $metaDesc, $wordCount, $status, $metrics, $recs, $createdAt)
      RETURNING *
    `);

    auditRecord = insertQuery.get({
      $userId: req.user?.id || null,
      $url: url,
      $focusKeyword: focusKeyword || null,
      $healthScore: analysis.score,
      $title: scraped.signals.title,
      $metaDesc: scraped.signals.metaDescription,
      $wordCount: scraped.signals.wordCount,
      $status: 'analyzing',
      $metrics: JSON.stringify({
        ...analysis.summary,
        ratingTier: analysis.ratingTier,
        passedChecks: analysis.passedChecks,
        issues: analysis.issues,
        keywordStats: analysis.keywordStats,
        images: scraped.signals.images,
        links: scraped.signals.links
      }),
      $recs: JSON.stringify([]),
      $createdAt: now
    });
  } catch (dbErr) {
    return res.status(500).json({ error: 'Failed to record audit in database: ' + dbErr.message });
  }

  // 5. LLM Optimization Phase (Google Gemini)
  let recommendations;
  try {
    recommendations = await generateSeoRecommendations({
      url,
      focusKeyword,
      signals: scraped.signals,
      analysis
    }, auditRecord.id);
  } catch (aiErr) {
    console.warn('Gemini optimization failed, falling back:', aiErr.message);
    recommendations = {};
  }

  // 6. Final Audit Update
  try {
    const updateQuery = db.prepare(`
      UPDATE audits
      SET status = 'completed', recommendations = $recs
      WHERE id = $id
      RETURNING *
    `);

    const finalAudit = updateQuery.get({
      $id: auditRecord.id,
      $recs: JSON.stringify(recommendations)
    });

    const formattedResponse = {
      id: finalAudit.id,
      url: finalAudit.url,
      focus_keyword: finalAudit.focus_keyword,
      health_score: finalAudit.health_score,
      status: finalAudit.status,
      title: finalAudit.title,
      meta_description: finalAudit.meta_description,
      word_count: finalAudit.word_count,
      metrics: JSON.parse(finalAudit.metrics),
      recommendations,
      pdf_report_url: `/api/audits/${finalAudit.id}/pdf`,
      created_at: finalAudit.created_at
    };

    // Cache the completed audit for subsequent instant lookups
    setCached(cacheKey, formattedResponse);

    res.status(201).json({
      message: 'Audit completed successfully',
      cached: false,
      data: formattedResponse
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to finalize audit: ' + err.message });
  }
});

/**
 * GET /api/audits: List recent audits from database.
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
 * GET /api/audits/my: Retrieve audits created by the authenticated user.
 */
router.get('/audits/my', requireAuth, (req, res) => {
  try {
    const audits = db.query(`
      SELECT id, user_id, url, focus_keyword, health_score, title, word_count, status, created_at
      FROM audits
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    res.status(200).json({
      count: audits.length,
      data: audits
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user audits: ' + err.message });
  }
});

/**
 * GET /api/audits/:id: Retrieve single audit details.
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
        recommendations: audit.recommendations ? JSON.parse(audit.recommendations) : {}
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit: ' + err.message });
  }
});

/**
 * GET /api/audits/:id/pdf: Generate and download executive PDF report.
 */
router.get('/audits/:id/pdf', async (req, res) => {
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

    const auditData = {
      ...audit,
      metrics: audit.metrics ? JSON.parse(audit.metrics) : {},
      recommendations: audit.recommendations ? JSON.parse(audit.recommendations) : {}
    };

    const pdfBuffer = await generateAuditPdf(auditData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rankpulse-audit-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
  }
});

export default router;
