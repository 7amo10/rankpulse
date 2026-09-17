import { z } from 'zod';
import config from '../config/env.js';
import db from '../db/index.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Zod Schema to strictly validate AI output
export const GeminiRecommendationSchema = z.object({
  optimizedTitle: z.string().min(5).max(150),
  optimizedMetaDescription: z.string().min(20).max(300),
  recommendations: z.array(
    z.object({
      priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
      category: z.string().default('SEO'),
      issue: z.string().min(3),
      action: z.string().min(5)
    })
  ).min(1).max(10),
  competitiveAngle: z.string().min(5)
});

/**
 * Generates actionable SEO optimization recommendations using Google Gemini.
 */
export async function generateSeoRecommendations(pageData, auditId = null) {
  const { url, focusKeyword, signals, analysis } = pageData;

  // If no API key configured or in mock mode, use deterministic fallback
  if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'mock-key') {
    return generateFallbackRecommendations(pageData);
  }

  const prompt = `
You are a senior technical SEO copywriter and on-page optimization architect.
Analyze the following audited web page data and produce high-impact, actionable optimizations.

Target URL: ${url}
Focus Keyword: ${focusKeyword || 'None specified'}
Current Title: ${signals.title || 'None'} (${signals.title?.length || 0} chars)
Current Meta Description: ${signals.metaDescription || 'None'} (${signals.metaDescription?.length || 0} chars)
Heading Structure:
- H1: ${signals.headings?.h1?.join(' | ') || 'None'}
- H2s: ${signals.headings?.h2?.slice(0, 5).join(' | ') || 'None'}
Word Count: ${signals.wordCount || 0} words
SEO Health Score: ${analysis?.score || 0}/100 (${analysis?.ratingTier || 'Unknown'})
Detected Issues:
${(analysis?.issues || []).map((i) => `- ${i}`).join('\n')}

Content Excerpt:
"${(signals.textExcerpt || '').slice(0, 600)}"

Return STRICTLY a JSON object matching this schema:
{
  "optimizedTitle": "A compelling, 50-60 character title containing the focus keyword near the front",
  "optimizedMetaDescription": "A high-CTR, 130-155 character meta description addressing user search intent",
  "recommendations": [
    {
      "priority": "High",
      "category": "Content / On-Page / Architecture",
      "issue": "Specific weakness observed",
      "action": "Exact, concrete fix step the website owner should execute"
    }
  ],
  "competitiveAngle": "A 1-2 sentence assessment of how to outrank competitors targeting this topic"
}
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${config.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Gemini API returned HTTP ${response.status}: ${errText}. Using rule-based fallback.`);
      return generateFallbackRecommendations(pageData);
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return generateFallbackRecommendations(pageData);
    }

    const rawParsed = JSON.parse(candidateText);
    if (Array.isArray(rawParsed.recommendations)) {
      rawParsed.recommendations = rawParsed.recommendations.slice(0, 5);
    }
    const validated = GeminiRecommendationSchema.parse(rawParsed);

    // Log token usage to SQLite
    const usage = resJson.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || 0;
    const candidateTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || promptTokens + candidateTokens;

    // Approximate cost: Gemini 2.5 Flash (~$0.075 / 1M prompt tokens, $0.30 / 1M output tokens)
    const costUsd = (promptTokens * 0.000000075) + (candidateTokens * 0.0000003);

    if (auditId) {
      try {
        db.prepare(`
          INSERT INTO llm_logs (audit_id, prompt_tokens, candidate_tokens, total_tokens, model, cost_est_usd, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(auditId, promptTokens, candidateTokens, totalTokens, GEMINI_MODEL, costUsd, new Date().toISOString());
      } catch (logErr) {
        console.warn('Failed to log LLM usage:', logErr.message);
      }
    }

    return {
      ...validated,
      llmUsage: {
        model: GEMINI_MODEL,
        promptTokens,
        candidateTokens,
        totalTokens,
        estimatedCostUsd: Number(costUsd.toFixed(6))
      }
    };
  } catch (err) {
    console.warn('Gemini recommendation error:', err.message);
    return generateFallbackRecommendations(pageData);
  }
}

/**
 * Deterministic fallback generator when offline or in test environments.
 */
export function generateFallbackRecommendations(pageData) {
  const { focusKeyword, signals, analysis } = pageData;
  const kw = focusKeyword || 'Top Insights';

  return {
    optimizedTitle: `${signals.title ? signals.title.slice(0, 40) : 'Essential Guide'}: ${kw} [2026 Audit]`,
    optimizedMetaDescription: `Discover key insights and actionable strategies for ${kw}. Audited recommendations for higher search visibility and user engagement.`,
    recommendations: [
      {
        priority: 'High',
        category: 'Metadata',
        issue: 'Title & meta tags can be better aligned with search intent.',
        action: `Integrate "${kw}" into the first 30 characters of the page title and include an engaging call-to-action in the meta description.`
      },
      {
        priority: 'Medium',
        category: 'Content Structure',
        issue: 'Heading hierarchy and body length need reinforcement.',
        action: 'Ensure exactly one H1 tag is present and expand thin content sections to surpass 600 words.'
      },
      {
        priority: 'Low',
        category: 'Accessibility',
        issue: 'Image alt coverage should be 100%.',
        action: 'Add descriptive alt text to all embedded images to support screen readers and image SEO.'
      }
    ],
    competitiveAngle: `Competitors ranking in top positions maintain comprehensive headings and high keyword topical authority around "${kw}".`,
    llmUsage: {
      model: 'fallback-heuristic',
      promptTokens: 0,
      candidateTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0.0
    }
  };
}

export default {
  generateSeoRecommendations,
  generateFallbackRecommendations,
  GeminiRecommendationSchema
};
