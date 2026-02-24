# Marketing Tool

AI-powered marketing content generator. Paste any App Store, Google Play, or website URL → get ready-to-post social content with AI-generated images and video in 60 seconds. Full marketing suite underneath when you need it.

## What It Does

**Quick Win flow (60 seconds):**
1. Paste a URL → scrape app/website metadata
2. Generate a marketing plan automatically
3. Get an Instagram post (caption + AI image) + TikTok script immediately
4. Copy, download, or queue to Buffer

**Full marketing suite:**
- **Carousel Builder** — Auto/guided/manual modes, drag-to-reorder slides, Nano Banana Pro hero images
- **Video Generation** — Kling 3.0 via Kie.ai, 15s clips from captions
- **Copy Drafts** — App Store descriptions, feature bullets, landing page hero, keywords
- **Tone Compare** — Generate same section in two tones side-by-side
- **Translations** — Localise into 10+ languages (marketing-aware, not literal)
- **SERP Preview** — See Google results appearance with SEO warnings
- **Content Calendar** — Schedule + queue posts to Buffer
- **Email Sequences** — AI-generated drip campaigns
- **Competitive Analysis** — Compare against competitors
- **Export Bundle** — PDF + ZIP of all assets

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
| Social | Buffer via Zapier MCP |
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
| `/plan/[id]` | Plan overview — 3 action cards + marketing suite grid |
| `/plan/[id]/quickwin` | Quick Win — auto-generates IG + TikTok + image |
| `/plan/[id]/social` | Full social flow — 4-step with video, Buffer queue |
| `/plan/[id]/carousel` | Carousel builder — auto/guided/manual modes |
| `/plan/[id]/draft` | AI copy drafts (4 tones) |
| `/plan/[id]/tone-compare` | Side-by-side tone comparison |
| `/plan/[id]/translate` | Multi-language translations |
| `/plan/[id]/serp` | Google SERP preview + SEO checks |
| `/plan/[id]/keywords` | Keyword research |
| `/plan/[id]/assets` | Visual asset generation |
| `/plan/[id]/emails` | Email sequence generation |
| `/plan/[id]/schedule` | Content scheduling |
| `/plan/[id]/calendar` | Visual content calendar |
| `/plan/[id]/competitors` | Competitive analysis |
| `/plan/[id]/templates` | Social media templates |
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
│   ├── PlanSidebar.tsx     # 7-section navigation with Create section
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
npm run test     # Run tests
npm run check:secrets  # Scan tracked files for known secret patterns
```

## Secret Scan Notes

- `tools/check-secrets.js` and `tools/check-secrets.test.js` are excluded from scanning to avoid false positives from scanner regex definitions and test fixtures.
- To intentionally keep a known-safe secret-like string in code/examples, add `secret-scan: ignore` on that line.

## Deployment

Railway with auto-deploy from `main`. SQLite requires a Railway volume mapped to `/app/data`. Playwright Chromium installed at container start.

## Documentation

| File | Description |
|------|-------------|
| `PRODUCT-STRATEGY.md` | Product vision, core flows, AI models, marketing recommendations, build phases |
| `REVIEW-AND-FIX-PLAN.md` | Post-review fix plan — Phase 1+2 complete, Phase 3 pending |
| `CLAUDE.md` | AI coding assistant guidance for this repo |
| `AUTH-ARCHITECTURE.md` | Supabase auth migration plan (future) |

## License

Private
