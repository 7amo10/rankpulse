import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/health', (req, res) => {
  try {
    db.query('SELECT 1').get();
    res.status(200).json({
      status: 'ok',
      service: 'RankPulse SEO Auditor',
      uptime_seconds: Math.floor(process.uptime()),
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

export default router;
