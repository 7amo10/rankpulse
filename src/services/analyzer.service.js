/**
 * SEO Heuristic Analysis Engine
 * Calculates deterministic SEO Health Score (0-100), evaluates on-page signals,
 * and identifies critical technical shortcomings and strengths.
 */

export function analyzeSeo(signals, focusKeyword = '') {
  let score = 0;
  const issues = [];
  const passedChecks = [];
  const keyword = focusKeyword ? focusKeyword.trim().toLowerCase() : '';

  // 1. Title Tag Analysis (Weight: 25)
  if (signals.title) {
    const titleLen = signals.title.length;
    score += 15;
    passedChecks.push(`Title tag exists ("${signals.title.slice(0, 50)}${titleLen > 50 ? '...' : ''}")`);

    if (titleLen >= 50 && titleLen <= 60) {
      score += 5;
      passedChecks.push(`Title length is optimal (${titleLen} characters)`);
    } else if (titleLen < 30) {
      issues.push(`Title tag is too short (${titleLen} chars). Recommended: 50-60 chars.`);
    } else if (titleLen > 65) {
      issues.push(`Title tag exceeds 65 chars (${titleLen} chars) and may be truncated on SERPs.`);
    } else {
      score += 3;
    }

    if (keyword) {
      if (signals.title.toLowerCase().includes(keyword)) {
        score += 5;
        passedChecks.push(`Focus keyword "${keyword}" is present in the title tag`);
      } else {
        issues.push(`Title tag is missing the focus keyword "${keyword}".`);
      }
    }
  } else {
    issues.push('Critical: Title tag is missing completely.');
  }

  // 2. Meta Description Analysis (Weight: 25)
  if (signals.metaDescription) {
    const descLen = signals.metaDescription.length;
    score += 15;
    passedChecks.push('Meta description tag is present');

    if (descLen >= 120 && descLen <= 160) {
      score += 5;
      passedChecks.push(`Meta description length is optimal (${descLen} characters)`);
    } else if (descLen < 70) {
      issues.push(`Meta description is short (${descLen} chars). Expand to 120-160 chars for higher CTR.`);
    } else if (descLen > 165) {
      issues.push(`Meta description exceeds 165 chars (${descLen} chars) and will be cut off on Google.`);
    } else {
      score += 3;
    }

    if (keyword) {
      if (signals.metaDescription.toLowerCase().includes(keyword)) {
        score += 5;
        passedChecks.push(`Focus keyword "${keyword}" is present in the meta description`);
      } else {
        issues.push(`Meta description does not contain focus keyword "${keyword}".`);
      }
    }
  } else {
    issues.push('Critical: Meta description tag is missing.');
  }

  // 3. Heading Structure Analysis (Weight: 20)
  const h1Count = signals.headings?.h1?.length || 0;
  const h2Count = signals.headings?.h2?.length || 0;

  if (h1Count === 1) {
    score += 15;
    passedChecks.push('Single H1 tag hierarchy properly established');

    if (keyword) {
      const h1Text = signals.headings.h1[0].toLowerCase();
      if (h1Text.includes(keyword)) {
        score += 5;
        passedChecks.push(`Focus keyword "${keyword}" found in primary H1 heading`);
      } else {
        issues.push(`Primary H1 does not include focus keyword "${keyword}".`);
      }
    }
  } else if (h1Count === 0) {
    issues.push('Missing H1 heading: The page has no primary <h1> element.');
  } else {
    score += 5;
    issues.push(`Multiple H1 headings detected (${h1Count} found). Best practice is exactly one <h1> per page.`);
  }

  if (h2Count > 0) {
    score += 5;
    passedChecks.push(`Content structured with ${h2Count} secondary <h2> headings`);
  } else {
    issues.push('Content lacks subheadings: No <h2> elements found.');
  }

  // 4. Content Depth & Word Count (Weight: 15)
  const wordCount = signals.wordCount || 0;
  if (wordCount >= 600) {
    score += 15;
    passedChecks.push(`Comprehensive content depth (${wordCount} words)`);
  } else if (wordCount >= 300) {
    score += 10;
    passedChecks.push(`Moderate content depth (${wordCount} words)`);
  } else {
    score += 3;
    issues.push(`Thin content detected (${wordCount} words). Recommended minimum is 600+ words for competitive ranking.`);
  }

  // 5. Image Alt Accessibility (Weight: 10)
  const images = signals.images || { total: 0, missingAlt: 0, altCoveragePercentage: 100 };
  if (images.total === 0) {
    score += 5;
    passedChecks.push('No image accessibility issues detected');
  } else if (images.missingAlt === 0) {
    score += 10;
    passedChecks.push(`All ${images.total} images have descriptive alt attributes (100% coverage)`);
  } else {
    const coverage = images.altCoveragePercentage;
    if (coverage >= 60) score += 5;
    issues.push(`${images.missingAlt} of ${images.total} images are missing alt attributes (${coverage}% coverage).`);
  }

  // 6. Link Architecture (Weight: 5)
  const links = signals.links || { internal: 0, external: 0, total: 0 };
  if (links.internal > 0) {
    score += 5;
    passedChecks.push(`Internal link connectivity verified (${links.internal} internal links)`);
  } else {
    issues.push('Zero internal links detected: Internal page linking strengthens crawlability.');
  }

  // Final Health Score & Rating Tier
  const finalScore = Math.min(100, Math.max(0, score));
  let ratingTier = 'Poor';
  if (finalScore >= 80) ratingTier = 'Good';
  else if (finalScore >= 50) ratingTier = 'Needs Improvement';

  // Keyword Frequency & Density Calculation
  let keywordStats = null;
  if (keyword) {
    const bodyLower = (signals.textExcerpt || '').toLowerCase();
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'gi');
    const matches = bodyLower.match(regex);
    const count = matches ? matches.length : 0;
    const density = wordCount > 0 ? parseFloat(((count / wordCount) * 100).toFixed(2)) : 0;

    keywordStats = {
      keyword,
      occurrences: count,
      densityPercentage: density,
      inTitle: signals.title ? signals.title.toLowerCase().includes(keyword) : false,
      inMetaDescription: signals.metaDescription ? signals.metaDescription.toLowerCase().includes(keyword) : false,
      inH1: h1Count > 0 ? signals.headings.h1[0].toLowerCase().includes(keyword) : false
    };
  }

  return {
    score: finalScore,
    ratingTier,
    keywordStats,
    passedChecks,
    issues,
    summary: {
      titleLength: signals.title?.length || 0,
      metaDescriptionLength: signals.metaDescription?.length || 0,
      h1Count,
      h2Count,
      wordCount,
      totalImages: images.total,
      imagesMissingAlt: images.missingAlt
    }
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default { analyzeSeo };
