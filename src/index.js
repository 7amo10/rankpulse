import express from 'express';
import config from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import auditRoutes from './routes/audit.routes.js';
import errorHandler from './middleware/errorHandler.js';

export const app = express();

app.use(express.json());

// Root endpoint metadata
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'RankPulse API',
    tagline: 'Automated SEO Health & Competitor Content Auditor',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/me',
      createAudit: 'POST /api/audits',
      listAudits: 'GET /api/audits',
      getAudit: 'GET /api/audits/:id',
      getPdf: 'GET /api/audits/:id/pdf'
    }
  });
});

// API Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', auditRoutes);

// Centralized error handling
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`RankPulse API running on http://localhost:${config.PORT} [env: ${config.NODE_ENV}]`);
  });
}

export default app;
