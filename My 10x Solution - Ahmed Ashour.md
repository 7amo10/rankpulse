# My 10x Solution - Ahmed Ashour

## Project Title: RankPulse — Automated SEO Health & Competitor Content Auditor

---

### 1. What is the Problem You Are Solving?

Content creators, SEO freelancers, and digital marketers routinely spend 30 to 45 minutes manually auditing competitor articles and web pages. They must open browser developer tools to inspect title and meta tags, tally heading structures (H1-H6), calculate word counts, check image alt attributes, and evaluate keyword distribution across disparate tools. Because this manual workflow is fragmented and repetitive, audits are frequently skipped or documented in informal notes that clients and writers struggle to execute. There is a clear need for a unified, instantaneous tool that extracts technical page signals, calculates a deterministic health score, and delivers concrete, AI-driven content optimization suggestions in a presentation-ready format.

#### Who Experiences This Problem?
- Freelance SEO specialists and content strategists auditing client and competitor websites.
- Independent website owners seeking actionable search ranking guidance without hiring an agency.
- Digital agencies needing rapid, standardized technical audit summaries for client proposals.

---

### 2. The 10x Claim

> **"RankPulse transforms a 30-minute manual page inspection into a single 10-second automated operation, extracting comprehensive technical SEO signals, computing an objective health score, generating Gemini-powered rewriting recommendations, and delivering an exportable PDF report at $0 cost."**

---

### 3. Core Concepts Implemented (5+ Program Concepts)

| # | Concept | Program Requirement | Implementation in RankPulse | Where It Lives in Code |
|---|---|---|---|---|
| 1 | **API Endpoints** | Real HTTP API with status codes & validation | RESTful endpoints with Zod request validation, uniform error handling, and standard HTTP status codes (`200`, `201`, `400`, `401`, `404`, `422`). | `src/routes/`, `src/schemas/` |
| 2 | **Database Persistence** | Real persistence surviving restarts | Zero-config, persistent SQLite database powered by native `bun:sqlite` with relational tables (`users`, `audits`, `llm_logs`). | `src/db/` |
| 3 | **Authentication** | Users log in; protected routes guarded | JWT Bearer token authentication with password hashing, secure token verification, and middleware guards. | `src/middleware/auth.js`, `src/routes/auth.routes.js` |
| 4 | **LLM Integration** | Narrow AI job with validation & cost/token log | Google Gemini API integration generating structured meta rewrites and content fixes, validated against Zod schema, with token logging. | `src/services/gemini.service.js` |
| 5 | **Reporting (PDF)** | System produces PDF report | Automated server-side PDF generator compiling metrics, scores, and AI recommendations into a downloadable audit document. | `src/services/report.service.js`, `src/routes/audit.routes.js` |
| 6 | **Caching Logic** | Expensive result stored and reused | Hash-based TTL caching for scraped HTML and Gemini responses to avoid duplicate network latency and redundant API consumption. | `src/services/cache.service.js` |
| 7 | **Web Scraping Pipeline** *(Swap 1)* | Polite collection of external data, validated | Cheerio-based scraper with identifying User-Agent, timeout protection, status checking, and semantic DOM extraction. | `src/services/scraper.service.js` |

*Note on Swap*: Swapped background job queue for a **Web Scraping Pipeline** because fetching and analyzing live web pages directly satisfies the core input requirement of the audit pipeline while keeping the architecture lean and synchronous for instant user feedback.

---

### 4. One Explicit Non-Goal

**What RankPulse Will NOT Build:**
RankPulse will **NOT** build an asynchronous multi-page domain crawler that spiders thousands of URLs, nor a recurring multi-tenant subscription billing engine. The solution focuses with extreme precision on delivering an instant, high-fidelity single-URL competitor and content audit.

---

### 5. Architectural Implementation: How It Works

RankPulse follows a clean, modular, layered architecture:

```
[ Client Request: POST /api/audits { url, focusKeyword } ]
                        │
                        ▼
            ┌───────────────────────┐
            │  Authentication Guard │ (JWT Bearer Middleware)
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │ Scraper & Cache Layer │ (Checks cache, fetches URL, parses DOM via Cheerio)
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │  SEO Analysis Engine  │ (Calculates title, meta, H1-H6, word count, density, health score)
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │   Google Gemini API   │ (Generates 3 actionable fixes & optimized title/description)
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │ SQLite Database Layer │ (Persists audit record, metrics, and token usage log)
            └───────────┬───────────┘
                        ▼
       [ Response: 201 Created + PDF Export Available ]
```

1. **Request Reception**: An authenticated user submits a target URL and optional focus keyword to `POST /api/audits`.
2. **Polite Extraction**: The scraper checks the local cache. If fresh, it reuses the DOM; otherwise, it sends an identifying User-Agent request with an `AbortController` timeout and extracts semantic tags (title, meta description, OpenGraph tags, heading tree, text body, and image alt attributes).
3. **Deterministic Scoring**: The analyzer computes an objective SEO Health Score (0-100) based on title length (50-60 chars), meta description presence (120-160 chars), single H1 tag, heading hierarchy, content depth (>600 words), and keyword presence.
4. **Targeted AI Enhancement**: The extracted data is sent to the Google Gemini API with strict system instructions to generate:
   - An optimized title and meta description incorporating the target keyword.
   - 3 prioritized, concrete recommendations.
   - The prompt and completion token counts are recorded in the audit database.
5. **PDF Export**: Users can call `GET /api/audits/:id/pdf` to generate and download a branded, professional audit report summarizing the findings.

---

### 6. Steps to Run

```bash
# 1. Clone repository & enter directory
git clone <repo-url>
cd rankpulse

# 2. Install dependencies via Bun
bun install

# 3. Configure environment variables
cp .env.example .env
# Set GEMINI_API_KEY and JWT_SECRET in .env

# 4. Seed demo data (creates demo user & sample audit)
bun run seed

# 5. Start development server
bun run dev

# 6. Run automated test suite
bun test
```

Server starts at: `http://localhost:3030`
