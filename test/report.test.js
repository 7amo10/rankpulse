import { describe, it, expect } from 'bun:test';
import { generateAuditPdf } from '../src/services/report.service.js';

describe('Concept 5: PDF Reporting Service Unit Tests', () => {
  const sampleAudit = {
    id: 42,
    url: 'https://example.com/best-seo-tips',
    focus_keyword: 'technical seo',
    health_score: 84,
    title: 'Top 10 Technical SEO Tips for 2026',
    meta_description: 'Actionable technical SEO guide.',
    word_count: 950,
    created_at: new Date().toISOString(),
    metrics: {
      h1Count: 1,
      h2Count: 4,
      totalImages: 3,
      imagesMissingAlt: 0
    },
    recommendations: {
      optimizedTitle: 'Top 10 Technical SEO Tips [2026 Strategy Guide]',
      optimizedMetaDescription: 'Master technical SEO with our complete 2026 checklist. Learn speed, schema, and ranking optimizations.',
      recommendations: [
        {
          priority: 'High',
          category: 'Metadata',
          issue: 'Meta description is slightly short.',
          action: 'Expand with target keyword and clear value proposition.'
        }
      ]
    }
  };

  it('[TEST 1] Generates a valid PDF buffer starting with %PDF-', async () => {
    const pdfBuffer = await generateAuditPdf(sampleAudit);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfMagicBytes = pdfBuffer.slice(0, 5).toString('ascii');
    expect(pdfMagicBytes).toBe('%PDF-');
  });
});
