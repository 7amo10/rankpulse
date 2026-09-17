import PDFDocument from 'pdfkit';

/**
 * PDF Reporting Service
 * Generates an executive-ready, branded SEO Audit Report PDF using PDFKit.
 */
export function generateAuditPdf(audit) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: {
          Title: `RankPulse SEO Audit - ${audit.id}`,
          Author: 'RankPulse SEO Engine',
          Subject: `Technical SEO & AI Content Audit for ${audit.url}`
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const metrics = audit.metrics || {};
      const recommendations = audit.recommendations || {};
      const score = audit.health_score || 0;

      // Header Banner
      doc.rect(45, 40, 505, 55).fill('#1E293B');
      doc.fillColor('#38BDF8').fontSize(22).font('Helvetica-Bold').text('RankPulse', 60, 50, { continued: true });
      doc.fillColor('#94A3B8').fontSize(11).font('Helvetica').text('  |  Automated SEO Health & Competitor Audit');
      doc.fillColor('#FFFFFF').fontSize(9).text(`Audit ID: #${audit.id}  •  Generated: ${new Date(audit.created_at || Date.now()).toUTCString()}`, 60, 75);

      // Target URL & Focus Keyword Box
      doc.moveDown(2);
      const urlY = 110;
      doc.rect(45, urlY, 505, 42).strokeColor('#E2E8F0').stroke();
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Target URL: ', 55, urlY + 8, { continued: true });
      doc.fillColor('#2563EB').font('Helvetica').text(audit.url);
      doc.fillColor('#0F172A').font('Helvetica-Bold').text('Focus Keyword: ', 55, urlY + 24, { continued: true });
      doc.fillColor('#059669').font('Helvetica').text(audit.focus_keyword || 'None specified (General Technical Audit)');

      // Overall Score Badge
      let scoreColor = '#DC2626'; // Red
      let scoreLabel = 'POOR';
      if (score >= 80) {
        scoreColor = '#16A34A'; // Green
        scoreLabel = 'GOOD';
      } else if (score >= 50) {
        scoreColor = '#D97706'; // Yellow/Orange
        scoreLabel = 'NEEDS WORK';
      }

      const scoreY = 165;
      doc.rect(45, scoreY, 505, 60).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('OVERALL SEO HEALTH SCORE', 60, scoreY + 12);
      doc.fillColor(scoreColor).fontSize(26).font('Helvetica-Bold').text(`${score}/100`, 60, scoreY + 28, { continued: true });
      doc.fontSize(12).font('Helvetica-Bold').text(`  [${scoreLabel}]`);

      // Metrics Summary Table
      doc.moveDown(2);
      let curY = 240;
      doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('1. Technical On-Page Signals', 45, curY);
      curY += 20;

      const signalsList = [
        ['Page Title', audit.title ? `"${audit.title.slice(0, 45)}..." (${audit.title.length} chars)` : 'Missing tag'],
        ['Meta Description', audit.meta_description ? `Present (${audit.meta_description.length} chars)` : 'Missing description'],
        ['Headings', `H1: ${metrics.h1Count || 0}  |  H2: ${metrics.h2Count || 0}`],
        ['Word Count', `${audit.word_count || 0} words`],
        ['Image Alt Coverage', `${metrics.totalImages || 0} images (${metrics.imagesMissingAlt || 0} missing alt)`]
      ];

      signalsList.forEach(([label, val], idx) => {
        const rowY = curY + (idx * 20);
        doc.rect(45, rowY, 505, 18).fill(idx % 2 === 0 ? '#F1F5F9' : '#FFFFFF');
        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(label, 55, rowY + 4);
        doc.fillColor('#0F172A').font('Helvetica').text(val, 200, rowY + 4);
      });

      curY += signalsList.length * 20 + 20;

      // Section 2: AI Optimization Strategy (Google Gemini)
      doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('2. Gemini AI Optimization Strategy', 45, curY);
      curY += 20;

      if (recommendations.optimizedTitle) {
        doc.fillColor('#1E3A8A').fontSize(9).font('Helvetica-Bold').text('Recommended Title:', 45, curY);
        doc.fillColor('#1E293B').font('Helvetica').text(recommendations.optimizedTitle, 160, curY);
        curY += 16;
      }

      if (recommendations.optimizedMetaDescription) {
        doc.fillColor('#1E3A8A').fontSize(9).font('Helvetica-Bold').text('Recommended Meta:', 45, curY);
        doc.fillColor('#1E293B').font('Helvetica').text(recommendations.optimizedMetaDescription, 160, curY, { width: 380 });
        curY += 28;
      }

      // Priority Recommendations List
      const recs = Array.isArray(recommendations.recommendations) ? recommendations.recommendations : [];
      if (recs.length > 0) {
        doc.moveDown(1);
        doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Priority Fix Action Items:', 45, curY);
        curY += 16;

        recs.slice(0, 3).forEach((rec, i) => {
          doc.rect(45, curY, 505, 36).fillAndStroke('#FEF3C7', '#FDE68A');
          doc.fillColor('#B45309').fontSize(8).font('Helvetica-Bold').text(`[${rec.priority || 'Medium'}] ${rec.category || 'SEO'}:`, 55, curY + 6);
          doc.fillColor('#78350F').font('Helvetica-Bold').text(rec.issue, 140, curY + 6, { width: 400 });
          doc.fillColor('#1E293B').font('Helvetica').text(`Fix: ${rec.action}`, 55, curY + 18, { width: 485 });
          curY += 42;
        });
      }

      // Footer & Provenance
      doc.rect(45, 770, 505, 25).strokeColor('#CBD5E1').stroke();
      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(
        'RankPulse Audit Report  •  Deterministic Heuristics + Google Gemini Intelligence  •  Data Provenance Verified',
        55,
        778
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default { generateAuditPdf };
