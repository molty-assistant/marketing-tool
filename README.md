# Marketing Tool

AI-powered brief + copy generator. Paste any App Store, Google Play, or website URL and get a structured marketing brief plus launch-ready copy drafts in about 60 seconds.

## What It Does

**Default flow (brief + copy):**
1. Paste a URL → scrape app/website metadata
2. Generate a marketing plan automatically
3. Land on your plan overview and review the brief
4. Generate copy drafts, tone variants, and export your launch pack

**Core workspace:**
- **Strategy Brief** — Positioning, audience, and messaging summary
- **Copy Drafts** — App Store descriptions, feature bullets, landing page hero, keywords
- **Tone Compare** — Generate same section in two tones side-by-side
- **Translations** — Localise into 10+ languages (marketing-aware, not literal)
- **Email Sequences** — AI-generated drip campaigns
- **Competitive Analysis** — Compare against competitors
- **Export Bundle** — PDF + ZIP of all assets
- **SERP Preview** — See Google results appearance with SEO warnings

**Optional/direct routes (kept):**
- **Social Posts, Schedule, Calendar, Digest, Distribution** — still available via direct URLs
- **Carousel Builder + Video Generation** — optional expansion workflows

## Stack

| Component | Detail |
|-----------|--------|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui (new-york), lucide-react |
| Database | SQLite via better-sqlite3 (WAL mode) |
| AI (text) | Gemini 2.5 Flash via Google AI Studio |
| AI (images) | Nano Banana Pro via Kie.ai |
| AI (video) | Kling 3.0 via Kie.ai |
| Rendering | Playwright (HTML → PNG for carousels/assets) |
| Social (optional) | Buffer via Zapier MCP |
| Hosting | Railway (auto-deploy from `main`) |

## Getting Started

```bash
git clone https://github.com/molty-assistant/marketing-tool.git
cd marketing-tool
npm install
cp .env.example .env.local
# Edit .env.local with your keys (see Environment below)
npm run dev
# Open http://localhost:3000
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key (all text generation) |
| `KIE_API_KEY` | Yes | Kie.ai API key (Nano Banana Pro images + Kling 3.0 video) |
| `ZAPIER_MCP_TOKEN` | For Buffer | Social publishing via Zapier MCP |
| `BASIC_AUTH_USER` | No | Basic auth username (auth skipped when unset) |
| `BASIC_AUTH_PASS` | No | Basic auth password |
| `API_KEY` | No | API key for automation/cron endpoints |
| `IMAGE_DIR` | No | Image storage path (defaults to `/app/data/images`) |
| `PUBLIC_BASE_URL` | No | Media attachment URLs in Buffer posts |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — paste a URL to start |
| `/wizard` | Guided onboarding — pick a goal, enter URL |
| `/dashboard` | All plans with search/filter |
| `/plan/[id]` | Default workspace — brief + copy first |
| `/plan/[id]/quickwin` | Optional quick social workflow |
| `/plan/[id]/social` | Optional full social flow (direct route) |
| `/plan/[id]/carousel` | Carousel builder — auto/guided/manual modes |
| `/plan/[id]/draft` | AI copy drafts (4 tones) |
| `/plan/[id]/tone-compare` | Side-by-side tone comparison |
| `/plan/[id]/translate` | Multi-language translations |
| `/plan/[id]/serp` | Google SERP preview + SEO checks |
| `/plan/[id]/keywords` | Keyword research |
| `/plan/[id]/assets` | Visual asset generation |
| `/plan/[id]/emails` | Email sequence generation |
| `/plan/[id]/schedule` | Optional content scheduling |
| `/plan/[id]/calendar` | Optional visual content calendar |
| `/plan/[id]/competitors` | Competitive analysis |
| `/plan/[id]/templates` | Copy and campaign templates |
| `/plan/[id]/export` | Export bundle (PDF + ZIP) |
| `/shared/[token]` | Public read-only shared plan |

## Architecture

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # 67+ API endpoints
│   ├── (marketing)/        # Top-level pages (home, wizard, dashboard)
│   ├── plan/[id]/          # Plan detail + 25+ sub-pages
│   └── shared/[token]/     # Public shared view
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui components
│   ├── PlanSidebar.tsx     # Brief/copy-first plan navigation
│   ├── ErrorBoundary.tsx   # Global error boundary
│   ├── GenerationOverlay.tsx # Scrape → plan → redirect overlay
│   └── Skeleton.tsx        # Loading skeleton variants
└── lib/                    # Core logic
    ├── db.ts               # SQLite database (CRUD + schema init)
    ├── pipeline.ts         # Gemini 2.5 Flash API wrappers
    ├── orchestrator.ts     # Multi-step pipeline runner
    ├── auth-guard.ts       # Auth utilities (secureCompare, API key, basic auth)
    ├── scraper.ts          # URL scraping (App Store, Play Store, web)
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

Railway with auto-deploy from `main`. SQLite requires a Railway volume mapped to `/app/data`. Playwright Chromium installed at container start.

## Documentation

| File | Description |
|------|-------------|
| `PRODUCT-STRATEGY.md` | Product vision and brief+copy-first strategy |
| `REVIEW-AND-FIX-PLAN.md` | Post-review fix plan — Phase 1+2 complete, Phase 3 pending |
| `CLAUDE.md` | AI coding assistant guidance for this repo |
| `AUTH-ARCHITECTURE.md` | Supabase auth migration plan (future) |

## License

Private
