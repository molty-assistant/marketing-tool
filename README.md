# Marketing Tool

AI-powered marketing brief generator. Paste an App Store, Google Play, or website URL → get a complete 5-stage marketing plan with AI-generated copy, translations, SERP previews, and visual assets.

**Live:** https://marketing-tool-production.up.railway.app

## What It Does

1. **Scrape** — Extract app info, metadata, and features from any URL
2. **Plan** — Generate a 5-stage marketing brief (Research → Foundation → Structure → Assets → Distribution)
3. **Draft** — AI-writes full copy (App Store descriptions, feature bullets, landing page hero, etc.)
4. **Translate** — Localise briefs into 10+ languages (not just literal translation)
5. **SERP Preview** — See how your listing looks in Google results, with SEO warnings
6. **Assets** — Generate OG images, social cards, and feature graphics

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS
- **Database:** SQLite (via better-sqlite3)
- **AI:** Google Gemini 2.5 Flash (copy generation, translations, enhancement)
- **Scraping:** Custom scraper (App Store, Play Store, generic websites)
- **Assets:** Playwright-based PNG rendering + ZIP export
- **Hosting:** Railway (auto-deploy from `main`)

## Getting Started

```bash
# Clone
git clone https://github.com/molty-assistant/marketing-tool.git
cd marketing-tool

# Install
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your keys (see Environment below)

# Run dev server
npm run dev
# Open http://localhost:3000
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key (for AI features) |
| `NEXT_PUBLIC_CONVEX_URL` | No | Convex backend URL (for Mission Control integration) |

### Rate Limiting + Usage Tracking

The API now includes lightweight SQLite-backed per-actor rate limiting and daily usage tracking.

- Actor resolution order: `x-api-key` header, then client IP, then `unknown`.
- Raw API keys are never stored in SQLite. Actor IDs are stored as hashes.
- Blocked requests return `429` with `Retry-After`.

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable/disable enforcement (usage still tracked when disabled). |
| `RATE_LIMIT_MAX_REQUESTS` | `60` | Global fallback max requests per window. |
| `RATE_LIMIT_WINDOW_SEC` | `60` | Global fallback window size in seconds. |
| `RATE_LIMIT_AI_MAX_REQUESTS` | `12` | Bucket default for AI-heavy endpoints. |
| `RATE_LIMIT_PUBLIC_MAX_REQUESTS` | `45` | Bucket default for public endpoints. |
| `RATE_LIMIT_HEAVY_MAX_REQUESTS` | `8` | Bucket default for expensive render/media endpoints. |
| `RATE_LIMIT_HASH_SALT` | empty | Optional salt used when hashing actor identifiers. |
| `RATE_LIMIT_RETENTION_DAYS` | `14` | How long to keep per-request events used for sliding-window checks. |

Per-endpoint env override format:

- `RATE_LIMIT_<ENDPOINT_KEY>_MAX_REQUESTS`
- `RATE_LIMIT_<ENDPOINT_KEY>_WINDOW_SEC`

Example: `/api/generate-draft` maps to `RATE_LIMIT_GENERATE_DRAFT_MAX_REQUESTS`.

Inspect usage from SQLite:

```bash
sqlite3 data/marketing-tool.db \\
  "SELECT usage_date, endpoint, total_requests, blocked_requests FROM api_usage_daily ORDER BY usage_date DESC, endpoint;"
```

```bash
sqlite3 data/marketing-tool.db \\
  "SELECT endpoint, SUM(total_requests) AS total, SUM(blocked_requests) AS blocked FROM api_usage_daily GROUP BY endpoint ORDER BY blocked DESC, total DESC;"
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — paste a URL to start |
| `/wizard` | Guided onboarding — pick a goal, enter URL |
| `/dashboard` | All plans with search/filter |
| `/analyze` | Legacy analyze flow |
| `/plan/[id]` | Plan detail with full brief |
| `/plan/[id]/draft` | AI-generated copy drafts (4 tones) |
| `/plan/[id]/translate` | Multi-language translations |
| `/plan/[id]/serp` | Google SERP preview + SEO checks |
| `/plan/[id]/assets` | Visual asset generation |
| `/shared/[token]` | Public read-only shared plan |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape` | POST | Scrape app/website metadata |
| `/api/generate-plan` | POST | Generate 5-stage marketing brief |
| `/api/generate-draft` | POST | AI-write copy sections |
| `/api/generate-translations` | POST | Translate brief into target languages |
| `/api/enhance-copy` | POST | Enhance existing copy with AI (4 tones) |
| `/api/generate-variants` | POST | Generate A/B/C copy variants |
| `/api/generate-assets` | POST | Generate visual asset HTML |
| `/api/render-png` | POST | Render HTML to PNG |
| `/api/render-zip` | POST | Bundle assets as ZIP download |
| `/api/plans` | GET | List all plans |
| `/api/plans/[id]` | GET/DELETE | Get or delete a plan |
| `/api/plans/[id]/share` | POST | Toggle public sharing |
| `/api/shared/[token]` | GET | Get shared plan by token |

## Architecture

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # 13 API endpoints
│   ├── plan/[id]/          # Plan detail + sub-pages (draft, translate, serp, assets)
│   ├── dashboard/          # Plan list with search/filter
│   ├── wizard/             # Goal-based onboarding
│   └── shared/[token]/     # Public shared view
├── components/             # Reusable UI components
│   ├── EnhanceButton.tsx   # AI copy enhancement button
│   ├── ErrorBoundary.tsx   # Global error boundary
│   ├── SerpPreview.tsx     # Google SERP preview component
│   └── VariantPicker.tsx   # A/B/C variant selector
└── lib/                    # Core logic
    ├── db.ts               # SQLite database (plans CRUD)
    ├── scraper.ts          # URL scraping (App Store, Play Store, web)
    ├── plan-generator.ts   # Marketing brief generation
    ├── asset-generator.ts  # HTML template generation for visuals
    └── types.ts            # TypeScript types
```

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Deployment

Deployed on Railway with auto-deploy from `main`. Every push triggers a build.

```bash
# Manual deploy (if needed)
railway up --detach
```

## Known Limitations

- **SQLite is ephemeral on Railway** — plans are lost on redeploy. Consider Postgres/Turso for persistence.
- **Playwright** required for asset rendering (PNG/ZIP) — works on Railway's Docker environment.

## License

Private — © molty-assistant
