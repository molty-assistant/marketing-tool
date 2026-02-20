# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered marketing brief generator. Paste an App Store, Google Play, or website URL → get a 5-stage marketing plan with AI-generated copy, translations, SERP previews, and visual assets.

**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, SQLite (better-sqlite3), Google Gemini 2.5 Flash (raw fetch, no SDK).

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals + typescript)
```

No test framework is configured. Playwright is used only as a headless renderer for PNG/ZIP export, not for testing.

## Environment

Copy `.env.example` → `.env.local`. Required: `GEMINI_API_KEY`. Auth env vars (`BASIC_AUTH_USER`, `BASIC_AUTH_PASS`, `API_KEY`) are optional for local dev — auth is skipped when unset.

## Architecture

### Routing & Rendering

- **App Router** with `(marketing)` route group for top-level pages
- **Plan detail** lives at `src/app/plan/[id]/` with a sidebar layout and ~20 sub-pages (draft, translate, assets, etc.)
- **Server Components** read SQLite directly via `getDb()` — no fetch wrappers needed for own data
- **Client Components** (`'use client'`) for interactive pages; they call API routes via `fetch()`
- **No server actions** — all mutations are POST API routes under `src/app/api/`

### API Routes (`src/app/api/`)

~45+ route handlers. Key patterns:
- **Streaming endpoints** (`generate-all`, `orchestrate-pack`) use `ReadableStream` + NDJSON for real-time AI pipeline progress, consumed by `GenerationOverlay`
- **Rate limiting** via `guardApiRoute()` in `src/lib/api-guard.ts` (tracked in SQLite)
- **Auth guard** via `src/lib/auth-guard.ts` for cron/orchestration endpoints

### Database

SQLite at `data/marketing-tool.db` — raw SQL via singleton `getDb()` in `src/lib/db.ts`. WAL mode, foreign keys ON. Schema created inline at startup (no migration files). Tables: `plans`, `plan_content`, `approval_queue`, `content_schedule`.

### AI Integration

All Gemini calls use raw `fetch()` to the REST API (no `@google/generative-ai` SDK). Pipeline functions in `src/lib/pipeline.ts`. JSON responses are parsed via `parseGeminiJson()` which strips markdown fences.

### Key Libraries

| Lib | Path | Purpose |
|---|---|---|
| `src/lib/db.ts` | Database CRUD | SQLite operations |
| `src/lib/pipeline.ts` | AI pipeline | Gemini API calls (brand-voice, draft, translations) |
| `src/lib/orchestrator.ts` | Orchestration | Multi-step pipeline runner |
| `src/lib/scraper.ts` | URL scraping | App Store, Play Store, generic web |
| `src/lib/asset-generator.ts` | Asset gen | HTML templates for visual assets |
| `src/lib/screenshot-compositor.ts` | Rendering | Playwright HTML → PNG |
| `src/lib/utils.ts` | Utility | `cn()` = clsx + tailwind-merge |

## Conventions

- **Tailwind v4** — CSS-first config in `src/app/globals.css` (no `tailwind.config` file). Design tokens use `oklch()` in CSS custom properties with `.dark` class for dark mode.
- **shadcn/ui** — new-york style, components in `src/components/ui/`, configured in `components.json`. Icons: `lucide-react`.
- **Path alias:** `@/*` → `./src/*`
- **Spacing (UX-27):** page top padding `pt-6`, section gap `mb-8`, card padding `p-6`, form field gap `space-y-4`.
- **Theme:** `ThemeProvider`/`ThemeScript` in `src/components/theme/` — `class` strategy, localStorage-persisted.
- **Playwright** is a server external package (`next.config.ts: serverExternalPackages`), not a test runner.

## Deployment

Railway (auto-deploy from `main`). Config in `railway.json` + `nixpacks.toml`. Playwright Chromium installed at container start. SQLite is ephemeral on Railway — Supabase migration planned (see `AUTH-ARCHITECTURE.md`).
