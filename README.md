# RankPulse — Automated SEO Health & Competitor Content Auditor

A production-grade, schema-validated, and AI-augmented technical SEO auditing engine built with **JavaScript on Bun.js**, featuring native SQLite persistence, Cheerio DOM scraping, Google Gemini AI optimizations, and downloadable PDF reports.

---

## 1. Problem Statement & 10x Claim

### The Problem
Auditing competitor web pages and on-page technical health manually requires opening browser developer tools, measuring title and meta tag character counts, tallying heading hierarchies (H1-H6), inspecting image alt attributes, checking keyword placement, and documenting findings across separate spreadsheets. This tedious process takes 30 to 45 minutes per article. As a result, audits are either skipped, rushed, or captured in fragmented notes that clients cannot easily act upon.

### The 10x Claim
> **"RankPulse transforms a 30-minute manual page inspection into a single 10-second automated operation, extracting comprehensive technical SEO signals, computing an objective health score, generating Gemini-powered rewriting recommendations, and delivering an exportable PDF report at $0 cost."**

---

## 2. Program Concepts Implemented (5+ Concepts Rule)

RankPulse implements 6 distinct concepts from the FlyRank program (including 1 swap):

| # | Concept | Requirement | Implementation in RankPulse | Where It Lives |
|---|---|---|---|---|
| 1 | **API Endpoints** | Real HTTP API with status codes & validation | RESTful endpoints with Zod request validation, uniform error handling, and standard HTTP status codes (`200`, `201`, `400`, `401`, `404`, `409`, `422`). | `src/routes/`, `src/schemas/` |
| 2 | **Database Persistence** | Real persistence surviving restarts | File-backed SQLite database powered by native `bun:sqlite` with relational schemas (`users`, `audits`, `llm_logs`, `cache_store`). | `src/db/index.js` |
| 3 | **Authentication** | Users log in; protected routes guarded | JWT Bearer token authentication with `bcryptjs` password hashing, token verification, and route guards. | `src/middleware/auth.js`, `src/routes/auth.routes.js` |
| 4 | **LLM Integration** | Narrow AI job with validation & token log | Google Gemini 2.5 Flash API integration with structured JSON constraints, Zod schema validation, and per-audit token/cost logging. | `src/services/gemini.service.js` |
| 5 | **Reporting (PDF)** | System produces PDF report | Server-side PDF generator using `pdfkit` compiling health scores, on-page diagnostics, and AI recommendations into an executive report. | `src/services/report.service.js` |
| 6 | **Caching Logic** | Expensive result stored & reused | In-memory and SQLite-backed TTL cache storing scraped DOM signals and completed audits to prevent redundant latency and API costs. | `src/services/cache.service.js` |
| 7 | **Web Scraping** *(Swap 1)* | Polite collection of external data, validated | Cheerio-based scraper with identifying User-Agent, timeout protection, status checking, and semantic DOM extraction. | `src/services/scraper.service.js` |

---

## 3. Quick Start on a Clean Machine

### Prerequisites
- [Bun](https://bun.sh) (v1.0.0+)

### Setup Steps
```bash
# 1. Clone repository
git clone https://github.com/7amo10/rankpulse.git
cd rankpulse

# 2. Install dependencies
bun install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY (from Google AI Studio)

# 4. Seed demo data (creates demo user & sample audits)
bun run seed

# 5. Start development server
bun run dev

# 6. Run automated test suite
bun test
```

Default server port: **`http://localhost:3030`**

---

## 4. 5-Minute Stranger Demo Path

A stranger who has never seen this repository can verify the entire system in 5 minutes using the following sequence:

### Step 1: Verify System Health
Check database connectivity and API uptime:
```bash
curl -s http://localhost:3030/api/health
```
**Expected Response:** `200 OK` with `{"status":"ok","database":"connected"}`.

### Step 2: Authenticate with Seeded Demo Credentials
Log in as the seeded user:
```bash
curl -s -X POST http://localhost:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@rankpulse.io", "password": "DemoPassword123!"}'
```
**Expected Response:** `200 OK` returning a signed JWT access token and user profile. Save the token:
```bash
export TOKEN="<paste-token-here>"
```

### Step 3: Run an Instant Automated Audit
Submit a target webpage for live scraping, heuristic scoring, and Gemini optimization:
```bash
curl -s -X POST http://localhost:3030/api/audits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
    "focusKeyword": "poetry collection"
  }'
```
**Expected Response:** `201 Created` returning the computed health score, on-page breakdown (title, meta description, heading structure, word count), Gemini-rewritten title & meta description, 3 prioritized action items, and `pdf_report_url`.

### Step 4: Verify Instant Caching (10x Speedup)
Run the exact same command a second time:
```bash
curl -s -X POST http://localhost:3030/api/audits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
    "focusKeyword": "poetry collection"
  }'
```
**Expected Response:** `200 OK` returning immediately in `<5ms` with `"cached": true`, demonstrating zero redundant network fetches and zero Gemini token burn.

### Step 5: Download the Executive PDF Report
Download the compiled PDF report for any audit ID (e.g. audit `#1` or the newly created ID):
```bash
curl -s http://localhost:3030/api/audits/1/pdf -o audit-report.pdf
```
Open `audit-report.pdf` to view the branded, presentation-ready report.

### Step 6: Verify User-Protected Audit History
Inspect the authenticated user's private audit list:
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3030/api/audits/my
```
**Expected Response:** `200 OK` returning all audits created under this account.

---

## 5. API Reference

### Public Lobby & Health
- `GET /` — API metadata and available endpoints.
- `GET /api/health` — Database health check and uptime.

### Authentication
- `POST /api/auth/register` — Create account (`email`, `password`). Returns JWT (`201 Created`).
- `POST /api/auth/login` — Sign in (`email`, `password`). Returns JWT (`200 OK`).
- `GET /api/auth/me` — Get profile & audit count (`401 Unauthorized` without valid Bearer token).

### Audits & Reporting
- `POST /api/audits` — Submit URL for scraping, heuristic scoring, Gemini AI optimizations (`201 Created`).
- `GET /api/audits` — List recent public audits (`200 OK`).
- `GET /api/audits/my` — List audits belonging to authenticated user (`requireAuth`).
- `GET /api/audits/:id` — Get full JSON audit details by ID (`200 OK` / `404 Not Found`).
- `GET /api/audits/:id/pdf` — Download compiled executive PDF audit report.

---

## 6. Architecture & Data Flow

```
[ Client: POST /api/audits { url, focusKeyword } ]
                        |
                        v
              [ Optional JWT Guard ]
                        |
                        v
             [ Cache Check (Key/TTL) ] ── (Hit) ──> [ Return Cached 200 ]
                        | (Miss)
                        v
          [ Polite Scraper Service ] (User-Agent, Timeout, Cheerio DOM)
                        |
                        v
         [ SEO Heuristic Engine ] (Scores 0-100, Title, Meta, H1-H6, Words)
                        |
                        v
       [ Google Gemini 2.5 Flash ] (Structured JSON Schema, Token Tracking)
                        |
                        v
     [ SQLite Persistence Layer ] (Saves Audit, Metrics, and llm_logs)
                        |
                        v
 [ Client Response: 201 Created + PDF Export Available at /api/audits/:id/pdf ]
```

---

## 7. Test Suite

The automated test suite runs via Bun's native test runner with zero external dependencies:

```bash
bun test
```

### Covered Test Specs (30 passing tests, 90 assertions):
1. `test/skeleton.test.js` — End-to-end integration flow, DB persistence, caching behavior, and PDF endpoint.
2. `test/scraper.test.js` — Title, meta, heading hierarchy, clean word count, and image alt attribute extraction.
3. `test/analyzer.test.js` — Health score calculation, keyword density, issue detection, and rating tier logic.
4. `test/cache.test.js` — In-memory & SQLite persistent caching, TTL expiration, and cache invalidation.
5. `test/gemini.test.js` — Google Gemini API integration, JSON schema enforcement, and fallback generator.
6. `test/report.test.js` — PDF generation, magic byte validation (`%PDF-`), and byte stream integrity.
7. `test/auth.test.js` — User registration, bcrypt password hashing, login, JWT issuance, and route guards.

---

## 8. License & Authorship

- **Author**: Ahmed Ashour
- **Internship**: FlyRank Backend Track
- **License**: MIT
