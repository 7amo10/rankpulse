import { describe, it, expect } from 'bun:test';
import { analyzeSeo } from '../src/services/analyzer.service.js';

describe('Concept 2: SEO Heuristic Analysis Engine Unit Tests', () => {
  const optimalSignals = {
    title: 'Top 10 Technical SEO Strategies for Ranking in 2026', // 51 chars
    metaDescription: 'Discover the most effective technical SEO strategies for 2026. Improve your site architecture, meta tags, and rankings with our expert guide.', // 144 chars
    canonicalUrl: 'https://example.com/seo-2026',
    headings: {
      h1: ['Top 10 Technical SEO Strategies for Modern Websites'],
      h2: ['1. Core Web Vitals', '2. Structured Data Markup', '3. Meta Tag Optimization'],
      h3: ['Deep Dive into Schema']
    },
    wordCount: 850,
    textExcerpt: 'Technical SEO strategies are crucial. Technical SEO improves crawlability.',
    images: { total: 4, missingAlt: 0, altCoveragePercentage: 100 },
    links: { internal: 5, external: 2, total: 7 }
  };

  it('[TEST 1] Scores an optimal page with high score (>= 80) and "Good" rating tier', () => {
    const analysis = analyzeSeo(optimalSignals, 'technical seo');
    expect(analysis.score).toBeGreaterThanOrEqual(80);
    expect(analysis.ratingTier).toBe('Good');
    expect(analysis.issues.length).toBe(0);
    expect(analysis.passedChecks.length).toBeGreaterThanOrEqual(6);
  });

  it('[TEST 2] Flags missing title and missing meta description as critical issues', () => {
    const poorSignals = {
      title: null,
      metaDescription: null,
      headings: { h1: [], h2: [], h3: [] },
      wordCount: 120,
      images: { total: 3, missingAlt: 3, altCoveragePercentage: 0 },
      links: { internal: 0, external: 0, total: 0 }
    };

    const analysis = analyzeSeo(poorSignals);
    expect(analysis.score).toBeLessThan(50);
    expect(analysis.ratingTier).toBe('Poor');
    expect(analysis.issues).toContain('Critical: Title tag is missing completely.');
    expect(analysis.issues).toContain('Critical: Meta description tag is missing.');
    expect(analysis.issues).toContain('Missing H1 heading: The page has no primary <h1> element.');
  });

  it('[TEST 3] Calculates keyword frequency, density, and placement', () => {
    const analysis = analyzeSeo(optimalSignals, 'technical seo');
    expect(analysis.keywordStats).toBeDefined();
    expect(analysis.keywordStats.keyword).toBe('technical seo');
    expect(analysis.keywordStats.inTitle).toBe(true);
    expect(analysis.keywordStats.inMetaDescription).toBe(true);
    expect(analysis.keywordStats.inH1).toBe(true);
    expect(analysis.keywordStats.occurrences).toBeGreaterThan(0);
  });

  it('[TEST 4] Identifies multiple H1 headings penalty', () => {
    const multiH1Signals = {
      ...optimalSignals,
      headings: {
        h1: ['First Main Heading', 'Second Conflicting Heading'],
        h2: ['Subheading']
      }
    };

    const analysis = analyzeSeo(multiH1Signals);
    const hasH1Issue = analysis.issues.some((msg) => msg.includes('Multiple H1 headings detected'));
    expect(hasH1Issue).toBe(true);
  });

  it('[TEST 5] Warns when images lack descriptive alt text', () => {
    const missingAltSignals = {
      ...optimalSignals,
      images: { total: 5, missingAlt: 3, altCoveragePercentage: 40 }
    };

    const analysis = analyzeSeo(missingAltSignals);
    const hasAltWarning = analysis.issues.some((msg) => msg.includes('missing alt attributes'));
    expect(hasAltWarning).toBe(true);
  });
});
