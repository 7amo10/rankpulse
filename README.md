# RankPulse — Automated SEO Health & Competitor Content Auditor

RankPulse transforms manual 30-minute competitor and content inspections into a 10-second automated audit pipeline. Built with **JavaScript and Bun.js**, featuring native SQLite persistence, Cheerio web scraping, Google Gemini AI optimizations, and downloadable PDF reports.

---

## 1. Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.0.0+)

### Setup & Run
```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Set your GEMINI_API_KEY in .env

# 3. Start development server
bun run dev

# 4. Run automated test suite
bun test
```

Server runs on: **`http://localhost:3030`**

---

## 2. API Endpoints

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/health` | Health & database connectivity check | `200 OK` |
| `POST` | `/api/audits` | Submit a target URL for automated audit | `201 Created` / `400 Bad Request` |
| `GET` | `/api/audits` | List recent audits from database | `200 OK` |
| `GET` | `/api/audits/:id` | Retrieve audit details by ID | `200 OK` / `404 Not Found` |

---

## 3. Milestone Progression

- [x] **Milestone 1: The One-Pager** — Locked problem definition, 10x claim, 5+ concepts, non-goal, and submission doc `My 10x Solution - Ahmed Ashour.md`.
- [x] **Milestone 2: Walking Skeleton** — End-to-end slice running from HTTP endpoint → validation → SQLite persistence → JSON response with 5 passing tests.
- [ ] **Milestone 3: Core Concepts Implementation** — Scraper, Heuristic SEO Engine, Gemini LLM, PDF Generator, Caching, and JWT Authentication.
- [ ] **Milestone 4: Stranger-Runnable Packaging** — Seed script, demo data, 5-minute demo walkthrough.
- [ ] **Milestone 5: Submission & Verification** — Clean git history, zero secrets, final requirements audit.
