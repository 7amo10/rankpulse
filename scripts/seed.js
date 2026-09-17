import bcrypt from 'bcryptjs';
import db from '../src/db/index.js';

console.log('--- Seeding RankPulse Database ---');

// 1. Clean existing seed records
db.exec(`
  DELETE FROM llm_logs;
  DELETE FROM audits;
  DELETE FROM users WHERE email = 'demo@rankpulse.io';
`);

// 2. Create Demo User
const passwordHash = await bcrypt.hash('DemoPassword123!', 10);
const now = new Date().toISOString();

const userInsert = db.prepare(`
  INSERT INTO users (email, password_hash, created_at)
  VALUES (?, ?, ?)
  RETURNING id, email, created_at
`);

const demoUser = userInsert.get('demo@rankpulse.io', passwordHash, now);
console.log(`[USER] Created Demo User: ${demoUser.email} (ID: ${demoUser.id})`);

// 3. Seed Audit 1: High-Performing Content Audit (Score: 88)
const audit1Insert = db.prepare(`
  INSERT INTO audits (user_id, url, focus_keyword, health_score, title, meta_description, word_count, status, metrics, recommendations, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id
`);

const audit1Metrics = {
  titleLength: 54,
  metaDescriptionLength: 142,
  h1Count: 1,
  h2Count: 5,
  wordCount: 1250,
  totalImages: 4,
  imagesMissingAlt: 0,
  ratingTier: 'Good',
  passedChecks: [
    'Title tag exists ("Technical SEO Checklist 2026: Complete Guide")',
    'Title length is optimal (54 characters)',
    'Focus keyword "technical seo" is present in the title tag',
    'Meta description tag is present and optimal (142 characters)',
    'Single H1 tag hierarchy properly established',
    'Comprehensive content depth (1250 words)',
    'All 4 images have descriptive alt attributes (100% coverage)'
  ],
  issues: [],
  keywordStats: {
    keyword: 'technical seo',
    occurrences: 8,
    densityPercentage: 0.64,
    inTitle: true,
    inMetaDescription: true,
    inH1: true
  }
};

const audit1Recs = {
  optimizedTitle: 'Technical SEO Checklist 2026: Complete Strategy Guide',
  optimizedMetaDescription: 'Master technical SEO in 2026 with our comprehensive audit checklist. Learn speed, schema, and crawlability best practices.',
  recommendations: [
    {
      priority: 'Medium',
      category: 'Schema Markup',
      issue: 'Page lacks structured FAQ or Article schema.',
      action: 'Implement JSON-LD Article and BreadcrumbList markup to qualify for rich snippet search results.'
    },
    {
      priority: 'Low',
      category: 'Internal Linking',
      issue: 'Could link deeper to related topical cluster articles.',
      action: 'Add 2-3 contextual links to related crawlability and Core Web Vitals guides.'
    }
  ],
  competitiveAngle: 'The content provides excellent depth. Adding structured data schema will help outperform top ranking competitors in SERP features.',
  llmUsage: {
    model: 'gemini-2.5-flash',
    promptTokens: 412,
    candidateTokens: 185,
    totalTokens: 597,
    estimatedCostUsd: 0.000086
  }
};

const seeded1 = audit1Insert.get(
  demoUser.id,
  'https://example.com/technical-seo-checklist',
  'technical seo',
  88,
  'Technical SEO Checklist 2026: Complete Guide',
  'Master technical SEO with our comprehensive checklist. Discover best practices for crawlability, speed, and indexing.',
  1250,
  'completed',
  JSON.stringify(audit1Metrics),
  JSON.stringify(audit1Recs),
  now
);

// Log LLM Usage for Audit 1
db.prepare(`
  INSERT INTO llm_logs (audit_id, prompt_tokens, candidate_tokens, total_tokens, model, cost_est_usd, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(seeded1.id, 412, 185, 597, 'gemini-2.5-flash', 0.000086, now);

console.log(`[AUDIT #1] Seeded High-Score Audit (ID: ${seeded1.id}, Score: 88/100, URL: https://example.com/technical-seo-checklist)`);

// 4. Seed Audit 2: Underperforming Page (Score: 38)
const audit2Metrics = {
  titleLength: 18,
  metaDescriptionLength: 0,
  h1Count: 0,
  h2Count: 0,
  wordCount: 140,
  totalImages: 3,
  imagesMissingAlt: 3,
  ratingTier: 'Poor',
  passedChecks: [
    'Title tag exists ("Our Product Guide")'
  ],
  issues: [
    'Critical: Meta description tag is missing.',
    'Missing H1 heading: The page has no primary <h1> element.',
    'Title tag is too short (18 chars). Recommended: 50-60 chars.',
    'Title tag is missing the focus keyword "running shoes".',
    'Thin content detected (140 words). Recommended minimum is 600+ words.',
    '3 of 3 images are missing alt attributes (0% coverage).'
  ],
  keywordStats: {
    keyword: 'running shoes',
    occurrences: 0,
    densityPercentage: 0,
    inTitle: false,
    inMetaDescription: false,
    inH1: false
  }
};

const audit2Recs = {
  optimizedTitle: 'Best Running Shoes 2026: Expert Reviews & Buyer Guide',
  optimizedMetaDescription: 'Find the best running shoes for comfort, road running, and marathon training. Expert tested rankings and top picks for 2026.',
  recommendations: [
    {
      priority: 'High',
      category: 'On-Page Fundamentals',
      issue: 'Page is completely missing an H1 tag and meta description.',
      action: 'Insert a descriptive <h1> containing "running shoes" and craft a 140-character meta description.'
    },
    {
      priority: 'High',
      category: 'Content Depth',
      issue: 'Thin content of only 140 words cannot compete for search queries.',
      action: 'Expand copy to at least 700 words covering shoe categories, cushioning, and fit criteria.'
    },
    {
      priority: 'Medium',
      category: 'Accessibility',
      issue: 'All images lack alt text.',
      action: 'Add descriptive alt tags including shoe model names and viewpoints.'
    }
  ],
  competitiveAngle: 'Competitors average 1500+ words with detailed comparison tables and high image alt coverage.',
  llmUsage: {
    model: 'gemini-2.5-flash',
    promptTokens: 380,
    candidateTokens: 210,
    totalTokens: 590,
    estimatedCostUsd: 0.000091
  }
};

const seeded2 = audit1Insert.get(
  demoUser.id,
  'https://example.com/unoptimized-shoes',
  'running shoes',
  38,
  'Our Product Guide',
  null,
  140,
  'completed',
  JSON.stringify(audit2Metrics),
  JSON.stringify(audit2Recs),
  now
);

db.prepare(`
  INSERT INTO llm_logs (audit_id, prompt_tokens, candidate_tokens, total_tokens, model, cost_est_usd, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(seeded2.id, 380, 210, 590, 'gemini-2.5-flash', 0.000091, now);

console.log(`[AUDIT #2] Seeded Low-Score Audit (ID: ${seeded2.id}, Score: 38/100, URL: https://example.com/unoptimized-shoes)`);

console.log('\n--- Seed Complete ---');
console.log('Demo Credentials:');
console.log('  Email:    demo@rankpulse.io');
console.log('  Password: DemoPassword123!');
console.log('\nSample Commands:');
console.log(`  View Audit #1:     curl -s http://localhost:3030/api/audits/${seeded1.id}`);
console.log(`  Download PDF #1:   curl -s http://localhost:3030/api/audits/${seeded1.id}/pdf -o audit-${seeded1.id}.pdf`);
