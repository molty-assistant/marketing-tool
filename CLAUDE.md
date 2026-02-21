# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered marketing content generator. Paste an App Store, Google Play, or website URL → get ready-to-post social content (captions, images, video, carousels) in 60 seconds, with a full marketing suite underneath.

**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, SQLite (better-sqlite3), Google Gemini 2.5 Pro + 2.5 Flash (text — single API key, model selected per route), Nano Banana Pro via Kie.ai (images), Kling 3.0 via Kie.ai (video), Perplexity (optional — competitive research).

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals + typescript)
```

No test framework is configured. Playwright is used only as a headless renderer for PNG/ZIP export, not for testing.

## Environment

Copy `.env.example` → `.env.local`. See `.env.example` for full documentation of all 13 env vars.

**Required:** `GEMINI_API_KEY` (all text AI — single key for both Pro and Flash), `KIE_API_KEY` (images + video via Kie.ai).

**Optional:** `PERPLEXITY_API_KEY` (competitive analysis, keyword research — routes 500 without it), `ZAPIER_MCP_TOKEN` (Buffer publishing), `BASIC_AUTH_ENABLED`/`BASIC_AUTH_USER`/`BASIC_AUTH_PASS` (basic auth), `API_KEY` (API key auth via header/query), `PUBLIC_BASE_URL` or `NEXT_PUBLIC_BASE_URL` (Buffer media URLs), `IMAGE_DIR` (storage path override), `GOOGLE_API_KEY` (legacy fallback for `GEMINI_API_KEY` in 2 routes).

## Architecture

### Routing & Rendering

- **App Router** with `(marketing)` route group for top-level pages
- **Plan detail** lives at `src/app/plan/[id]/` with a sidebar layout and 25+ sub-pages
- **Server Components** read SQLite directly via `getDb()` — no fetch wrappers needed for own data
- **Client Components** (`'use client'`) for interactive pages; they call API routes via `fetch()`
- **No server actions** — all mutations are POST API routes under `src/app/api/`

### Navigation Structure

The plan sidebar (`src/components/PlanSidebar.tsx`) uses a 7-section progressive disclosure layout:

- **Create** (always expanded, no collapse) — Quick Win, Social Posts, Carousel
- **Plan** (default open) — Overview
- **Strategy** (collapsed) — Brief, Foundation, Competitors, Reviews
- **Content** (collapsed) — Draft, Tone Compare, Emails, Templates, Translations, Approvals
- **Distribution** (collapsed) — Schedule, Calendar, Distribute, Performance
- **SEO & ASO** (collapsed) — Keywords, SERP Preview, Variants
- **Export** (collapsed) — Assets, Preview, Digest

Collapsed state persists via `localStorage` (key: `sidebar-collapsed`). Mobile nav shows Create items as primary row with a "More" button for suite sections.

The plan overview page (`src/app/plan/[id]/page.tsx`) uses a two-tier layout:
- **Top tier:** 3 large gradient ActionCards (Quick Win, Carousel, Social Posts)
- **Bottom tier:** 12 smaller SuiteCards grid for the full marketing suite

### API Routes (`src/app/api/`)

67+ route handlers. Key patterns:
- **Streaming endpoints** (`generate-all`, `orchestrate-pack`) use `ReadableStream` + NDJSON for real-time AI pipeline progress, consumed by `GenerationOverlay`
- **Rate limiting** via `guardApiRoute()` in `src/lib/api-guard.ts` (tracked in SQLite)
- **Auth guard** via `src/lib/auth-guard.ts` for cron/orchestration endpoints — uses `secureCompare()` with `timingSafeEqual` for timing-safe comparisons
- **Internal server-to-server calls** use `internalBaseUrl()` from `src/lib/orchestrator.ts` (never derive from request headers — SSRF protection)

### Database

SQLite at `data/marketing-tool.db` — raw SQL via singleton `getDb()` in `src/lib/db.ts`. WAL mode, foreign keys ON. Schema created inline at startup (no migration files). Tables: `plans`, `plan_content`, `approval_queue`, `content_schedule`, `social_posts`.

### AI Integration

- **Text (Pro):** Gemini 2.5 Pro for creative content — `generate-social-post`, `caption-to-image-brief`, `generate-carousel`, `brand-voice`, `generate-draft`. Raw `fetch()` to REST API (no SDK).
- **Text (Flash):** Gemini 2.5 Flash for structured/bulk tasks — all pipeline functions in `src/lib/pipeline.ts` + scheduling, calendar, translations, variants, etc.
- **Images:** Nano Banana Pro via Kie.ai async task API (create task → poll status → get URL). See `src/app/api/generate-hero-bg/route.ts`.
- **Video:** Kling 3.0 via Kie.ai async task API. See `src/app/api/generate-video/route.ts`.
- **Research (optional):** Perplexity for competitive analysis, keyword research, review scraping fallback. Requires `PERPLEXITY_API_KEY`.

### Key Libraries

| Lib | Path | Purpose |
|---|---|---|
| `src/lib/db.ts` | Database CRUD | SQLite operations |
| `src/lib/pipeline.ts` | AI pipeline | Gemini API calls (brand-voice, draft, translations) |
| `src/lib/orchestrator.ts` | Orchestration | Multi-step pipeline runner + `internalBaseUrl()` |
| `src/lib/auth-guard.ts` | Auth | `secureCompare()`, `hasValidApiKey()`, `hasValidBasicAuth()` |
| `src/lib/scraper.ts` | URL scraping | App Store, Play Store, generic web |
| `src/lib/asset-generator.ts` | Asset gen | HTML templates for visual assets |
| `src/lib/screenshot-compositor.ts` | Rendering | Playwright HTML → PNG |
| `src/lib/utils.ts` | Utility | `cn()` = clsx + tailwind-merge |

## Conventions

- **Tailwind v4** — CSS-first config in `src/app/globals.css` (no `tailwind.config` file). Design tokens use `oklch()` in CSS custom properties with `.dark` class for dark mode.
- **Theme tokens** — Always use semantic tokens (`bg-card`, `text-foreground`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `bg-destructive`). Never use hardcoded colors like `bg-slate-800` or `text-white` — they break in light/dark mode.
- **shadcn/ui** — new-york style, components in `src/components/ui/`, configured in `components.json`. Icons: `lucide-react`. Use `<Button>` from `@/components/ui/button` for interactive buttons, not raw `<button>`.
- **Path alias:** `@/*` → `./src/*`
- **Spacing (UX-27):** page top padding `pt-6`, section gap `mb-8`, card padding `p-6`, form field gap `space-y-4`.
- **Theme:** `ThemeProvider`/`ThemeScript` in `src/components/theme/` — `class` strategy, localStorage-persisted.
- **Playwright** is a server external package (`next.config.ts: serverExternalPackages`), not a test runner.

## Key Documentation

- `PRODUCT-STRATEGY.md` — Product vision, core flows, AI models, tech stack, marketing recommendations, build phases
- `REVIEW-AND-FIX-PLAN.md` — Post-review fix plan (Phase 1+2+3 complete, Phase 3.5 pre-deploy in progress)
- `AUTH-ARCHITECTURE.md` — Supabase auth migration plan
- `STAFF-REVIEW-REPORT.md` — Original code audit (superseded by Feb 21 verified review in PRODUCT-STRATEGY.md)

## Deployment

Railway (auto-deploy from `main`). Config in `railway.toml` (Dockerfile builder). Playwright Chromium installed at container start. SQLite needs Railway volume at `/app/data`. Auth via `src/middleware.ts` (basic auth + API key). Supabase migration planned (see `AUTH-ARCHITECTURE.md`).
