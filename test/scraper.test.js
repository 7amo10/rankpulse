import { describe, it, expect } from 'bun:test';
import { extractSeoSignals } from '../src/services/scraper.service.js';

describe('Concept 1: Web Scraping Pipeline Unit Tests', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Best SEO Practices for 2026 - Comprehensive Guide</title>
      <meta name="description" content="Discover the best actionable technical SEO practices for modern web applications. Learn how to rank higher on search engines.">
      <link rel="canonical" href="https://example.com/seo-guide">
      <meta property="og:title" content="Best SEO Practices Guide">
      <meta property="og:image" content="https://example.com/banner.png">
    </head>
    <body>
      <header><nav><a href="/">Home</a></nav></header>
      <main>
        <h1>Mastering Technical SEO in 2026</h1>
        <p>Search engine optimization has evolved rapidly with AI-driven search models. Quality and speed matter.</p>
        <h2>1. Optimize Your Headings Hierarchy</h2>
        <p>Headings must follow a logical hierarchy to assist crawlers and assistive technologies.</p>
        <h2>2. Image Accessibility & Speed</h2>
        <p>Always include descriptive alt attributes on your content images.</p>
        <img src="/img1.jpg" alt="SEO diagram">
        <img src="/img2.jpg">
        <a href="https://example.com/about">Internal About Page</a>
        <a href="https://google.com">External Link to Google</a>
      </main>
      <footer><p>Footer copyright notice</p></footer>
    </body>
    </html>
  `;

  it('[TEST 1] Extracts page title, meta description, and canonical URL', () => {
    const signals = extractSeoSignals(sampleHtml, 'https://example.com/seo-guide');
    expect(signals.title).toBe('Best SEO Practices for 2026 - Comprehensive Guide');
    expect(signals.metaDescription).toContain('Discover the best actionable technical SEO');
    expect(signals.canonicalUrl).toBe('https://example.com/seo-guide');
    expect(signals.ogTitle).toBe('Best SEO Practices Guide');
  });

  it('[TEST 2] Extracts heading structure (H1, H2, H3)', () => {
    const signals = extractSeoSignals(sampleHtml, 'https://example.com/seo-guide');
    expect(signals.headings.h1.length).toBe(1);
    expect(signals.headings.h1[0]).toBe('Mastering Technical SEO in 2026');
    expect(signals.headings.h2.length).toBe(2);
    expect(signals.headings.h2[0]).toContain('Optimize Your Headings');
  });

  it('[TEST 3] Calculates clean word count without scripts, nav, or footer', () => {
    const signals = extractSeoSignals(sampleHtml, 'https://example.com/seo-guide');
    expect(signals.wordCount).toBeGreaterThan(20);
    expect(signals.textExcerpt).toContain('Mastering Technical SEO');
  });

  it('[TEST 4] Computes image alt attribute metrics', () => {
    const signals = extractSeoSignals(sampleHtml, 'https://example.com/seo-guide');
    expect(signals.images.total).toBe(2);
    expect(signals.images.missingAlt).toBe(1);
    expect(signals.images.altCoveragePercentage).toBe(50);
  });

  it('[TEST 5] Distinguishes internal links from external links', () => {
    const signals = extractSeoSignals(sampleHtml, 'https://example.com/seo-guide');
    expect(signals.links.internal).toBe(1);
    expect(signals.links.external).toBe(1);
    expect(signals.links.total).toBe(2);
  });
});
