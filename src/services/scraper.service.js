import * as cheerio from 'cheerio';

const USER_AGENT = 'RankPulse-Auditor/1.0 (+https://github.com/7amo10/rankpulse; contact: auditor@rankpulse.internal)';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Polite Web Scraper Service
 * Fetches target HTML and extracts on-page SEO signals using Cheerio.
 */
export async function scrapePage(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms while fetching ${url}`);
    }
    throw new Error(`Failed to reach ${url}: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Target returned HTTP ${response.status} (${response.statusText})`);
  }

  const html = await response.text();
  const parsedSignals = extractSeoSignals(html, url);

  return {
    rawHtml: html,
    signals: parsedSignals,
    fetchedAt: new Date().toISOString(),
    status: response.status
  };
}

/**
 * Extracts technical and content SEO signals from raw HTML.
 */
export function extractSeoSignals(html, targetUrl) {
  const $ = cheerio.load(html);

  // 1. Meta & Title Information
  const title = $('title').first().text().trim() || null;
  const metaDescription = $('meta[name="description" i]').attr('content')?.trim() ||
                          $('meta[property="og:description" i]').attr('content')?.trim() || null;
  const canonicalUrl = $('link[rel="canonical" i]').attr('href')?.trim() || null;
  const ogTitle = $('meta[property="og:title" i]').attr('content')?.trim() || null;
  const ogImage = $('meta[property="og:image" i]').attr('content')?.trim() || null;
  const robotsMeta = $('meta[name="robots" i]').attr('content')?.trim() || null;

  // 2. Headings Structure
  const headings = {
    h1: [],
    h2: [],
    h3: []
  };

  $('h1').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) headings.h1.push(text);
  });

  $('h2').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) headings.h2.push(text);
  });

  $('h3').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) headings.h3.push(text);
  });

  // 3. Body Content & Text Processing
  // Remove scripts, styles, noscript, and nav elements to measure true body copy
  $('script, style, noscript, nav, footer, header, svg').remove();
  const rawBodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const words = rawBodyText ? rawBodyText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // 4. Image Accessibility Analysis
  let totalImages = 0;
  let imagesWithoutAlt = 0;

  $('img').each((_, el) => {
    totalImages += 1;
    const alt = $(el).attr('alt');
    if (!alt || alt.trim() === '') {
      imagesWithoutAlt += 1;
    }
  });

  // 5. Links Analysis
  let internalLinks = 0;
  let externalLinks = 0;
  let targetDomain = '';
  try {
    targetDomain = new URL(targetUrl).hostname;
  } catch (e) {}

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    try {
      const resolved = new URL(href, targetUrl);
      if (resolved.hostname === targetDomain) {
        internalLinks += 1;
      } else {
        externalLinks += 1;
      }
    } catch (e) {
      // relative or invalid link
      internalLinks += 1;
    }
  });

  return {
    title,
    metaDescription,
    canonicalUrl,
    ogTitle,
    ogImage,
    robotsMeta,
    headings,
    wordCount,
    textExcerpt: rawBodyText.slice(0, 1500), // First 1500 chars for LLM context
    images: {
      total: totalImages,
      missingAlt: imagesWithoutAlt,
      altCoveragePercentage: totalImages > 0 ? Math.round(((totalImages - imagesWithoutAlt) / totalImages) * 100) : 100
    },
    links: {
      internal: internalLinks,
      external: externalLinks,
      total: internalLinks + externalLinks
    }
  };
}

export default { scrapePage, extractSeoSignals };
