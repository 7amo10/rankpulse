import { describe, it, expect } from 'bun:test';
import {
  generateSeoRecommendations,
  generateFallbackRecommendations,
  GeminiRecommendationSchema
} from '../src/services/gemini.service.js';

describe('Concept 4: Google Gemini LLM Integration Unit Tests', () => {
  const samplePageData = {
    url: 'https://example.com/best-shoes',
    focusKeyword: 'running shoes',
    signals: {
      title: 'Best Running Shoes 2026',
      metaDescription: 'Find top running shoes.',
      headings: { h1: ['Running Shoes Guide'], h2: ['Trail Shoes', 'Road Shoes'] },
      wordCount: 450,
      textExcerpt: 'Choosing the best running shoes is essential for injury prevention and speed.'
    },
    analysis: {
      score: 65,
      ratingTier: 'Needs Improvement',
      issues: ['Meta description is short (23 chars).', 'Content depth is under 600 words.']
    }
  };

  it('[TEST 1] Generates valid fallback recommendations matching schema', () => {
    const fallback = generateFallbackRecommendations(samplePageData);
    const parsed = GeminiRecommendationSchema.safeParse(fallback);

    expect(parsed.success).toBe(true);
    expect(fallback.optimizedTitle).toContain('running shoes');
    expect(fallback.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(fallback.llmUsage.model).toBe('fallback-heuristic');
  });

  it('[TEST 2] Calls Google Gemini API and validates structured recommendations & token usage', async () => {
    const result = await generateSeoRecommendations(samplePageData);

    const parsed = GeminiRecommendationSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.optimizedTitle).toBeDefined();
    expect(result.optimizedMetaDescription).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.llmUsage).toBeDefined();
    expect(result.llmUsage.model).toBeDefined();
  }, 20000);
});
