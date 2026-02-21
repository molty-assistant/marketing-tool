# Product Strategy: Marketing Tool

**Date:** 2026-02-20
**Updated:** 2026-02-21 (Phase 3 complete + post-review Phase 1+2+3 + P2 hardening; full 5-area code review verified — middleware, SSRF, Gemini model split, env var audit, dark mode/button audit)
**Status:** Pre-launch — Phase 3.5 (pre-deploy fixes) next, then dog-food test

---

## Context

You've built a technically mature marketing tool with 67+ API endpoints, 28+ pages, and a full AI content pipeline — but have never used it end-to-end for a real app. A major refactor just landed (19 feature branches merged: video pipeline, weekly digest, keyword research, competitive intel, export bundle, review monitoring, variant scoring, dark mode, rate limiting, and more). The codebase is stable — ESLint clean, build passing.

Your immediate need is simple: paste a URL, get great social content you'd actually post. This plan defines what the product *is*, the core flows, what you need from a marketing perspective, and how to evolve it toward SME sales.

---

## What the Product Is

**Positioning:** "Paste any app or website URL → get ready-to-post social content with AI-generated images and video in 60 seconds. Full marketing plan underneath when you need it."

**Core promise:** Remove the blank-page problem for founders and small businesses who know their product but don't know what to write, design, or post.

**Key differentiator:** Buffer/Hootsuite assume you already have content. Canva assumes you know what to say. This tool starts from a URL and produces the copy, image, and video together — informed by actual data about the product.

---

## Current Tech Stack (post-refactor)

| Component | Version/Detail |
|-----------|---------------|
| Framework | Next.js 16.1.6, React 19.2.3, TypeScript 5.9.3 (strict) |
| Styling | Tailwind CSS 4.1.18, shadcn/ui (new-york), lucide-react |
| Database | SQLite via better-sqlite3 12.6.2 (WAL mode) |
| AI (text — creative) | **Gemini 2.5 Pro** via Google AI Studio raw fetch — `GEMINI_API_KEY` |
| AI (text — structured) | **Gemini 2.5 Flash** via Google AI Studio raw fetch — `GEMINI_API_KEY` |
| AI (research) | **Perplexity** (sonar) via `api.perplexity.ai` — `PERPLEXITY_API_KEY` (optional) |
| AI (images) | **Nano Banana Pro** via Kie.ai (`nano-banana-pro`) — `KIE_API_KEY` |
| AI (video) | **Kling 3.0** via Kie.ai (`kling-3.0/video`) — `KIE_API_KEY` |
| Rendering | Playwright 1.58.2 (HTML → PNG) |
| Social publishing | Buffer via Zapier MCP (`ZAPIER_MCP_TOKEN` env var, JSON-RPC 2.0 + SSE) |
| Deployment | Railway (auto-deploy from `main`) |

**Environment variables:**

| Variable | Required | Used by |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | All text generation (Pro + Flash routes) via Google AI Studio. Single key, model selected per route. |
| `KIE_API_KEY` | Yes | Image generation (Nano Banana Pro) + video generation (Kling 3.0) via Kie.ai |
| `PERPLEXITY_API_KEY` | No | Competitive analysis, keyword research, review scraping fallback. Routes return 500 if called without it. |
| `ZAPIER_MCP_TOKEN` | For Buffer | Social publishing via Zapier MCP (JSON-RPC 2.0 + SSE) |
| `BASIC_AUTH_ENABLED` | No | Set `true` to enable basic auth on all routes via middleware |
| `BASIC_AUTH_USER` | If auth on | Basic auth username |
| `BASIC_AUTH_PASS` | If auth on | Basic auth password |
| `API_KEY` | No | Alternative auth via `x-api-key` header or `?api_key=` query param |
| `IMAGE_DIR` | No | Image storage path, defaults to `/app/data/images` |
| `PUBLIC_BASE_URL` or `NEXT_PUBLIC_BASE_URL` | No | Media attachment URLs in Buffer posts, falls back to request origin |
| `GOOGLE_API_KEY` | No | Legacy fallback alias for `GEMINI_API_KEY` in 2 routes (caption-to-image-brief, caption-to-veo-prompt) |

**Git workflow:** Single `main` branch. No feature branches — this is a solo pre-launch project. Commit directly to main.

---

## AI Models — Current

All text generation uses a single `GEMINI_API_KEY` (Google AI Studio free tier). The model string in the URL selects Pro vs Flash per route. Image and video generation use `KIE_API_KEY` (Kie.ai). Competitive research uses `PERPLEXITY_API_KEY` (optional).

| Purpose | Model | Provider | Free tier limits | Status |
|---------|-------|----------|-----------------|--------|
| Creative text (captions, briefs, concepts) | **Gemini 2.5 Pro** | Google AI Studio | 5 RPM / 100 RPD | **To do** — currently 2.0/2.5 Flash |
| Structured text (schedules, translations, bulk) | **Gemini 2.5 Flash** | Google AI Studio | 10 RPM / 250 RPD | Active |
| Image generation | **Nano Banana Pro** (`nano-banana-pro`) | Kie.ai | Paid per image | Done |
| Video generation | **Kling 3.0** (`kling-3.0/video`) | Kie.ai | Paid per second | Done — needs e2e testing |
| Competitive research | **Perplexity** (sonar) | Perplexity AI | Free tier | Active (optional) |

### Gemini Pro/Flash Split

**Use Pro** (better creative output, 5 RPM / 100 RPD) — user-facing content you'd actually post:

| Route | What it generates |
|-------|-------------------|
| `generate-social-post` | Instagram/TikTok captions — THE core output (called 2x per Quick Win) |
| `caption-to-image-brief` | Visual scene description for Nano Banana Pro |
| `generate-carousel` | Carousel concept + slide copy |
| `brand-voice` | Brand tone analysis from scraped data |
| `generate-draft` | Marketing copy drafts |

**Use Flash** (faster, 10 RPM / 250 RPD) — structured/mechanical/bulk tasks:

| Route | What it generates |
|-------|-------------------|
| `pipeline.ts` (shared helper) | Pipeline steps: translations, atomize, emails, competitive analysis, positioning |
| `caption-to-veo-prompt` | Video prompt formatting for Kling 3.0 |
| `generate-schedule` | Posting schedule (structured dates) |
| `content-calendar` | Calendar grid data |
| `auto-publish` | Publishing logic |
| `review-monitor` | Review analysis |
| `generate-translations` | Multi-language output |
| `generate-variants` / `score-variants` | A/B variant generation + scoring |
| `generate-emails` | Email sequences |
| `enhance-copy` | Copy refinement |
| `positioning-angles` | Marketing angles |
| `atomize-content` | Content repurposing |
| `weekly-digest` | Weekly summary |
| `review-sentiment` | Sentiment classification |
| `export-bundle` | Export formatting |
| `competitive-analysis` | Gemini step (Perplexity does the research) |

**Daily budget (1 internal user):** ~6 Pro + ~4 Flash per Quick Win session. Allows ~16 full sessions/day on Pro's 100 RPD limit, with Flash barely touched at 250 RPD.

### Nano Banana Pro capabilities (Kie.ai)
- Native text rendering in images (logos, CTAs, slide text)
- Up to 4K resolution (1K/2K at ~$0.09/image, 4K at ~$0.12/image via Kie.ai)
- Up to 8 reference images for brand consistency
- Aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

### Kling 3.0 capabilities (Kie.ai)
- Text-to-video and image-to-video generation
- 3-15 second clips with native audio
- Multi-shot storytelling mode
- Element references (@element_name) for character consistency
- Standard ($0.10/s no-audio) and Pro ($0.135/s no-audio) modes

### Perplexity capabilities (optional)
- Competitive intelligence gathering (used by `competitive-analysis`, `competitive-intel`)
- Keyword research (`keyword-research`)
- App review scraping fallback (`scrape-reviews`)
- Requires `PERPLEXITY_API_KEY` — routes return 500 if called without it, but all are non-core

### Kie.ai API pattern (shared by Nano Banana Pro and Kling 3.0)
```
Auth:     Authorization: Bearer $KIE_API_KEY
Create:   POST https://api.kie.ai/api/v1/jobs/createTask
          Body: { model: "<model-id>", input: { ... } }
          Returns: { data: { taskId: "..." } }
Poll:     GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
          Returns: { data: { state: "waiting|queuing|generating|success|fail", resultJson: "..." } }
Result:   JSON.parse(data.resultJson) → { resultUrls: ["https://..."] }
```
See `generate-hero-bg/route.ts` for the image implementation and `generate-video/route.ts` for video.

---

## Three Tiers (for future SME product)

### Tier 1 — Free (Quick Win)
- 1 Instagram post: AI caption + hashtags + Nano Banana Pro image (1080x1080 PNG)
- 1 TikTok: hook + caption + hashtags + scene breakdown (script only, no video)
- Plans saved 7 days without account

### Tier 2 — Starter ($19/month)
Everything in Tier 1, plus:
- Full orchestration pack (brand voice, positioning, competitive analysis, emails, atomization)
- TikTok/Instagram video generation (Kling 3.0)
- Instagram carousel generation (AI + user screenshots)
- Buffer integration via Zapier MCP
- Translations, A/B variants with scoring, SERP preview, keywords, 30-day content calendar
- Guided workflows (Launch Flow, Weekly Content Flow)
- Export bundle (PDF + ZIP)
- Review monitoring + sentiment analysis

### Tier 3 — Pro ($49/month)
Everything in Tier 2, plus: 50 plans/month, shareable reports, priority processing

### Tier 4 — Agency ($99/month) — *future*
Unlimited plans, multiple workspaces, API access, bulk generation

**Note:** For your personal use right now, you get everything. Tiers are for future SME gating only.

---

## Core Flows

### Flow 1: Quick Win (the "just give me a post" flow)

**Trigger:** Paste URL on homepage
**Time:** ~60 seconds
**Output:** 1 Instagram post + image, 1 TikTok script

```
URL --> Scrape --> Generate Plan --> Quick Win Page
                                      |-- POST /api/generate-social-post (instagram)
                                      |-- POST /api/generate-social-post (tiktok)
                                      +-- POST /api/generate-post-image (hero mode)
                                             |
                                    Three output cards:
                                    [Instagram]  [TikTok]  [Upgrade teaser]
                                             |
                                   Copy / Download / Queue to Buffer
```

**Built:** `/plan/[id]/quickwin` — auto-generates all three on load, shows progress, then reveals cards. Homepage redirects here after plan generation.

**What already exists to power this:**
- `/api/generate-social-post` — returns caption, hashtags, hook, media_concept, media_specs, cta, posting_time, engagement_tips. Supports `contentType`: post, reel, story, carousel. Temperature 0.8.
- `/api/generate-post-image` — three visual modes: screenshot, hero (Nano Banana Pro via Kie.ai), hybrid. Renders via Playwright at 1080x1080.
- `/api/caption-to-image-brief` — converts caption → structured image brief (hook, scene, subject, mood, palette, composition).
- `/plan/[id]/social/page.tsx` — the existing 4-step flow (choose platform → generate idea → create media → queue to Buffer) is the exact pattern to replicate in a simplified single-page Quick Win.

### Flow 2: Carousel Builder

**Trigger:** "Create Carousel" button on Quick Win or Social page
**Three modes:**

| Mode | How it works |
|------|-------------|
| **Full auto** | AI picks a carousel concept (e.g., "5 features of your app"), generates all slides with Nano Banana Pro, writes slide captions |
| **Guided** | AI suggests concept + slide structure, you upload your own screenshots, AI generates text overlays and arranges them |
| **Manual** | You provide direction ("show these 3 features"), upload screenshots, AI generates hero slide + overlays for the rest |

**Carousel structure (Instagram, up to 10 slides):**
- Slide 1: Hero image (AI-generated via Nano Banana Pro — the scroll-stopper)
- Slides 2-5+: Feature highlights, screenshots with text overlays, or AI-generated scenes
- Final slide: CTA ("Download now", "Link in bio", etc.)

**Implementation approach:**
- New endpoint: `POST /api/generate-carousel` — accepts mode, optional screenshots (base64/URLs), optional direction text
- Note: `/api/generate-social-post` already accepts `contentType: 'carousel'` — use this for the overall carousel caption/concept, then generate individual slides
- Uses Nano Banana Pro for hero slide + overlay generation
- Renders each slide as 1080x1350 PNG (Instagram carousel optimal size)
- Returns array of slide images + overall caption + hashtags
- UI: Drag-to-reorder slides, edit individual slide text, swap screenshots

### Flow 3: Video Post

**Trigger:** "Generate Video" button on Quick Win (TikTok card) or Social page
**Time:** ~90 seconds (Kling 3.0 generation is async)

```
Caption --> /api/caption-to-veo-prompt --> Kling 3.0 via Kie.ai --> Poll status (3s intervals) --> Video URL
                                                                                                    |
                                                                                          Preview + Download
                                                                                          Queue to Buffer
```

**Already built end-to-end in code:**
- `/api/caption-to-veo-prompt` — Gemini 2.0 Flash converts caption → cinematic Kling 3.0 prompt (up to 200 words, shot types, camera movement, mood)
- `/api/generate-video` — creates Kling 3.0 task via Kie.ai, returns taskId
- `/api/generate-video/status` — polls Kie.ai task status, returns video URL when complete
- `/api/download-video` — proxies video download for browser Content-Disposition header
- Social page already has video generation UI with polling + download

**Needs:** end-to-end production testing, mobile download flow, aspect ratio handling (1:1 Instagram, 9:16 TikTok).

### Flow 4: App Launch Campaign (guided workflow)

**Trigger:** "Launch My App" button on dashboard or plan overview
**What it does:** Walks you through a 2-week launch campaign, generating content for each day

| Day | Content | Type |
|-----|---------|------|
| -7 | Teaser: mysterious screenshot + "Something's coming" | Single image post |
| -5 | Feature reveal: "Here's what it does" | Carousel (3-5 slides) |
| -3 | Behind-the-scenes: dev story / why I built this | Single image or video |
| -1 | Countdown: "Tomorrow!" | Story/Reel |
| 0 | **Launch day:** Main announcement post + video | Image + Video + Carousel |
| +1 | How-to: "Here's how to get started" | Carousel |
| +3 | Social proof: first reviews/feedback | Single image |
| +7 | Week 1 recap: downloads, highlights, what's next | Single image |

**Implementation:** Uses existing content calendar (`/api/generate-schedule` + `/api/content-calendar`) and social generation. New orchestration step via `orchestrator.ts` (which already supports multi-step pipelines with progress tracking, retry logic, and streaming). User reviews each post before queuing to Buffer.

### Flow 5: Weekly Content Batch (guided workflow)

**Trigger:** "Generate This Week's Content" button on dashboard
**What it does:** Generates 3-5 posts for the week based on your content pillars

| Day | Content pillar | Example |
|-----|---------------|---------|
| Mon | Feature tip | "Did you know [app] can do X?" + screenshot |
| Wed | User story / use case | "How [persona] uses [app] to solve [problem]" + carousel |
| Fri | Behind-the-scenes / personality | Dev life, funny moment, milestone — video or image |

**Implementation:** New orchestration step. Takes plan ID + week number, generates platform-specific posts for each day, populates content calendar (existing `content_schedule` table with performance tracking columns), queues for review via approval queue (existing `approval_queue` table).

**Existing infrastructure that supports this:**
- `/api/weekly-digest` — already generates weekly content summaries
- `/api/generate-schedule` + `/api/content-schedule` — content calendar management
- `/api/approval-queue` — content review workflow
- `orchestrator.ts` — multi-step pipeline with progress tracking (max 295s for Railway)

---

## What You're Missing: Marketing Expert Recommendations

### Platforms you should be on (beyond Instagram + TikTok)

| Platform | Why | Priority | Content type |
|----------|-----|----------|-------------|
| **Instagram** | Visual discovery, carousels perform well for apps | **Now** | Posts, carousels, Reels, Stories |
| **TikTok** | Massive organic reach, hook-driven content | **Now** | Short video (15-60s), scripts |
| **Twitter/X** | Tech community, indie dev audience, launch amplification | **Soon** | Text posts, threads, screenshots |
| **Reddit** | r/sideproject, r/apps, niche subreddits — huge for indie apps | **Soon** | Text posts (authentic, not salesy) |
| **Product Hunt** | Critical for app launches, one-shot opportunity | **For launches** | Product page + assets |
| **LinkedIn** | B2B apps, professional tools, "building in public" narrative | **If relevant** | Text posts, articles |

**Recommendation:** Start with Instagram + TikTok (your current focus). Add Twitter/X in month 2 (easy — just text + screenshots). Reddit requires a human touch (the tool can draft but you should post manually). Product Hunt is a one-time event per app.

### Content pillars (the 4 themes you rotate through)

Every successful content strategy has 3-4 recurring themes. For an indie app developer:

1. **Product highlights** — Features, updates, "did you know" tips. Carousel-friendly.
2. **Behind-the-scenes** — Dev journey, challenges, decisions, milestones. TikTok/Reels-friendly.
3. **User stories** — How people use the app, testimonials, reviews. Trust-building.
4. **Educational** — Tips related to your app's domain (e.g., if LightScout is a photography app, share photography tips). Reach-building.

The tool should know these pillars and rotate through them when generating weekly content.

### Posting cadence

| Platform | Frequency | Best times (general) |
|----------|-----------|---------------------|
| Instagram | 3-4x/week (posts) + daily Stories | 11am-1pm, 7pm-9pm |
| TikTok | 3-5x/week | 7am-9am, 12pm-3pm, 7pm-11pm |
| Twitter/X | Daily (easy — short text) | 8am-10am, 12pm-1pm |

**Key insight:** Consistency beats volume. 3 good posts/week is better than 7 mediocre ones. The Weekly Content Flow should default to 3 posts.

### Brand consistency features the tool should enforce

- **Colour palette:** Extract from app icon/website and use consistently in all generated images
- **Tone of voice:** Set once per plan (casual/professional/bold) and apply to all generated copy — the enhance feature already supports 4 tones (professional, casual, bold, minimal)
- **Visual style:** Nano Banana Pro's few-shot feature can accept reference images — use your first approved post as the style reference for all future posts
- **Hashtag sets:** Maintain a curated set per platform (research-backed), reused across posts

### Things most beginners forget

1. **Call to action in every post** — "Link in bio", "Try it free", "Download now". The generate-social-post endpoint already includes a `cta` field — make sure it's always surfaced.
2. **Hook in the first line** — Instagram truncates after 2 lines. TikTok viewers decide in 1 second. The generate-social-post endpoint already returns a `hook` field — display it prominently.
3. **App Store screenshots are marketing** — The tool could generate optimised App Store screenshot layouts (Nano Banana Pro + your real screenshots).
4. **Reuse content across platforms** — One Instagram carousel can become a TikTok script can become a Twitter thread. The `/api/atomize-content` endpoint does this — surface it more prominently.
5. **Engage, don't just broadcast** — The tool can generate content but you need to reply to comments, DM people, engage with similar accounts. No tool replaces this.

---

## Pre-Flight Checklist (Before Building New Features)

### 1. Verify env vars on Railway (15 min)
Image/video routes now use Kie.ai — set `KIE_API_KEY` in Railway → Service → Variables. Text generation routes still need `GEMINI_API_KEY`. Both must be set for all features to work.

### 2. Verify SQLite persistence (15 min)
Railway redeploys wipe filesystem. Check Railway → Service → Volumes. If no volume mapped to `/app/data`, every deploy deletes all plans.

### 3. Test Buffer/Zapier end-to-end (30 min)
Integration uses Zapier MCP protocol (`ZAPIER_MCP_TOKEN` env var, JSON-RPC 2.0 with SSE streaming). Posts are logged to `social_posts` table. Generate a test post → queue to Buffer → verify it appears. Check both "Add to Queue" and "Share Now" methods.

### 4. ~~Upgrade image + video pipeline to Kie.ai~~ **[DONE]**
Images: Nano Banana Pro (`nano-banana-pro`) via Kie.ai. Video: Kling 3.0 (`kling-3.0/video`) via Kie.ai. Both use async task API with polling. Env var: `KIE_API_KEY`.

---

## Review Findings (Staff Review + Feb 21 Verified Review)

The following bugs and security issues were identified across two code audits. The Feb 21 review verified all claims against actual code — false positives removed, new verified issues added.

**Original Staff Review:**

| # | Severity | Issue | Status | Phase |
|---|----------|-------|--------|-------|
| 1 | **P1** | `post-to-buffer` crashes on fresh DB | **FIXED** | 1 |
| 2 | **P1** | `review-monitor` POST flow broken | **FIXED** | Post-review 3.5 |
| 3 | **P1** | Middleware dead code — auth never activates | Open | 3.5 |
| 4 | **P1** | SSRF / API-key exfiltration in scheduler | **FIXED** | Post-review 1.2 |
| 5 | **P1** | SSRF risk in scraper | **FIXED** | 1 |
| 6 | **P2** | Scheduler double-processing race | **FIXED** | Post-review 1.3 |
| 7 | **P2** | Image storage coupled to Railway path | **FIXED** | 2 |
| 8 | **P2** | Performance update false success | Open | 4 |
| 9 | **P2** | Media attachment base URL hardcoded | **FIXED** | 1 |
| 10 | **P3** | No test suite | Open | 5 |

**Feb 21 Verified Review — new findings:**

| # | Severity | Issue | Status | Phase |
|---|----------|-------|--------|-------|
| 11 | **P1** | `proxy.ts` is dead code — file named `proxy.ts` not `middleware.ts`, Next.js never discovers it. Middleware manifest is empty `{}`. Auth (basic auth + API key) is silently not running. | Open | 3.5 |
| 12 | **P2** | `export-pdf` SSRF — uses `x-forwarded-host` header to build fetch URLs. Same pattern fixed in process-schedule but missed here. | Open | 3.5 |
| 13 | **P2** | `.env.example` documents 4 of 13 env vars. Missing `KIE_API_KEY` (critical), `PERPLEXITY_API_KEY`, all auth vars, `PUBLIC_BASE_URL`. | Open | 3.5 |
| 14 | **P2** | `railway.toml` and `railway.json` conflict — toml says Dockerfile, json says Nixpacks. json wins, so toml is misleading. | Open | 3.5 |
| 15 | **P2** | 6 routes still on `gemini-2.0-flash` (including core `generate-social-post`) | Open | 3.5 |
| 16 | **P3** | 107 raw `<button>` elements across 25 files (only tone-compare migrated to shadcn Button) | Open | 4+ |
| 17 | **P3** | 1,238 bare hardcoded dark-mode color lines across 52 files (only 3 components fixed) | Open | 4+ |
| 18 | **P3** | `social_posts.plan_id` and `content_schedule.plan_id` missing FK constraints | Open | 4+ |

**Note on false positives from earlier Opus reviews:**
- "proxy.ts is active middleware" — **WRONG**. The build manifest is empty. Next.js only discovers `middleware.ts`, not `proxy.ts`.
- "3 additional SSRF vectors" — **OVERBLOWN**. Only `export-pdf` is a real SSRF (#12). The `request.nextUrl.origin` usages in `generate-post-image` and `generate-hero-bg` only build response URLs, not fetch targets.
- Staff #3 originally said "public-by-default design choice" — it's actually a **bug** (#11): the auth code exists but is never executed.

---

## What Needs to Be Built (Prioritised)

### Phase 1: Make it work — code fixes done, deploy verification remaining

**Infrastructure fixes (all done):**
1. ~~Verify env vars on Railway — set `KIE_API_KEY` + `GEMINI_API_KEY` in Railway → Service → Variables~~ needs deploy verification
2. ~~Verify SQLite persistence — ensure Railway volume mapped to `/app/data`~~ needs deploy verification
3. ~~**[Staff #1]** Add `social_posts` table to schema init in `db.ts`~~ **[DONE]**
4. ~~**[Staff #9]** Make `PUBLIC_BASE_URL` configurable via env var~~ **[DONE]**
5. ~~**[Staff #5]** Add private IP / metadata host blocklist to scraper~~ **[DONE]**

**Validation (manual — do after deploy):**
6. Dog-food test: generate content for LightScout end-to-end, queue to Buffer, verify it arrives
7. Fix whatever breaks

### Phase 2: Quick Win page — **COMPLETE**

1. [x] Build `/plan/[id]/quickwin` page — auto-fires Instagram caption + TikTok caption + image generation on load, renders 3 output cards
2. [x] Homepage redirects to Quick Win after plan generation (in `(marketing)/page.tsx` onComplete callback)
3. [x] Migrate image generation to Nano Banana Pro via Kie.ai + video to Kling 3.0 via Kie.ai
4. [x] **[Staff #7]** Make image storage path configurable via env var (`IMAGE_DIR` defaulting to `/app/data/images`)

### Phase 3: Carousel + Video polish — **COMPLETE**

**New features:**
1. [x] Build carousel generation flow — new `POST /api/generate-carousel` endpoint + slide editor UI at `/plan/[id]/carousel` (drag-to-reorder via HTML5 DnD, edit slide text inline, upload screenshots for guided/manual modes, 3 generation modes: auto/guided/manual)
2. [x] Add mobile download/share for images and video (native Web Share API with fallback to download — added to Quick Win, Social, and Carousel pages)

**Testing + integration:**
3. [x] Polish Kling 3.0 video pipeline — download proxy now handles URL expiry (410 response with clear message), aspect ratio passed to filename (vertical/square suffix), fixed "Veo 2" labels to "Kling 3.0"
4. [x] Wire "Queue to Buffer" through Quick Win → Buffer flow for both Instagram (with image attachment) and TikTok (text-only), plus carousel → Buffer (cover image attached)

**Additional improvements:**
5. [x] Added Quick Win and Carousel links to sidebar navigation under Distribution (later moved to "Create" section in post-review Phase 2)
6. [x] Quick Win page now includes: Copy/Buffer buttons per card, Share buttons (Web Share API), video generation section with progress bar, and "next steps" links to Carousel and Social flow
7. [x] Carousel page: mode selector (auto/guided/manual), slide count slider (3-10), concept display, slide grid with drag-to-reorder, inline text editing, individual + bulk download, Buffer queue integration

### Post-Review Fixes (Phase 1+2 of REVIEW-AND-FIX-PLAN.md) — **COMPLETE**

A 5-part review (code quality, UX/UI, product fit, deploy readiness, MVP assessment) identified critical issues. See `REVIEW-AND-FIX-PLAN.md` for full details. Summary of fixes applied:

**Security & stability (Phase 1):**
1. [x] **usePlan hook memory leak** — useEffect now properly captures and returns abort cleanup
2. [x] **SSRF in process-schedule** — replaced spoofable `request.nextUrl.origin` with `internalBaseUrl()` from orchestrator
3. [x] **Scheduler race condition** — atomic `UPDATE...RETURNING` in `db.transaction()` prevents double-processing
4. [x] **Proxy timing attack** — all auth comparisons (API key + basic auth) now use `secureCompare()` with `timingSafeEqual`
5. [x] **Dark mode breakage** — Tone Compare, ErrorBoundary, and Skeleton components fully migrated from hardcoded dark colors to CSS theme tokens (`bg-card`, `text-foreground`, `bg-muted`, `border-border`)

**Navigation redesign (Phase 2):**
6. [x] **Sidebar restructure** — 7 sections with always-open "Create" group (Quick Win, Social, Carousel), localStorage persistence, mobile "More" button
7. [x] **Plan overview hub** — 3 large gradient ActionCards (Quick Win, Carousel, Social Posts) + 12 smaller SuiteCards grid replacing old 5 equal hub cards

**Post-review Phase 3 (UX Polish) — COMPLETE:**
8. [x] **Quick Win sessionStorage caching** — cache results, hydrate on revisit, Regenerate button
9. [x] **Quick Win field surfacing** — hook callout, CTA badge, posting time, collapsible engagement tips
10. [x] **Carousel progress indicator** — step-based labels with progress bar (concept → hero → slides → finalize)
11. [x] **Social page state persistence** — debounced sessionStorage save, hydrate on mount, Start Over button, clear on queue
12. [x] **review-monitor fixes** — SSRF fix (internalBaseUrl), pass appStoreUrl to scrape, pass reviews to sentiment, log failures
13. [x] **P2 hardening pass** — extracted shared `runGeneration` in quickwin (eliminated ~60 lines duplication), unmount guard on regen, clipboard `.catch()`, Firefox drag-and-drop fix in carousel, social hydrate/save race guard, hashtags null safety

### Phase 3.5: Pre-Deploy Fixes (do before dog-food test)

These are verified blocking/important issues that must be done before the first real use.

**[#11] Activate middleware (P1 — 30 min):**
1. Rename `src/proxy.ts` → `src/middleware.ts`
2. Change `export function proxy` → `export default function middleware` (or `export { proxy as default }`)
3. Verify build: `middleware-manifest.json` should now have entries (not empty `{}`)
4. Set `BASIC_AUTH_ENABLED=true` + `BASIC_AUTH_USER` + `BASIC_AUTH_PASS` in Railway env vars

**[#15] Gemini Pro/Flash split (P2 — 1 hour):**
Single `GEMINI_API_KEY` (free tier), different model strings per route:
5. Change 5 routes to `gemini-2.5-pro`: `generate-social-post`, `caption-to-image-brief`, `generate-carousel`, `brand-voice`, `generate-draft`
6. Change remaining 2.0-flash routes to `gemini-2.5-flash`: `caption-to-veo-prompt`, `generate-schedule`, `content-calendar`, `auto-publish`, `review-monitor`
7. Update `pipeline.ts` `geminiUrl()` helper to use `gemini-2.5-flash` (already correct, just verify)
8. Update metadata labels in all routes to match actual model used

**[#12] Fix export-pdf SSRF (P2 — 15 min):**
9. In `src/app/api/export-pdf/route.ts`, replace `getBaseUrl()` (uses `x-forwarded-host`) with `internalBaseUrl()` from orchestrator

**[#14] Fix Railway config conflict (P2 — 10 min):**
10. Delete `railway.json` (it conflicts with `railway.toml`) OR align both files. Pick one builder strategy.

**[#13] Update env var documentation (P2 — 15 min):**
11. Update `.env.example` to include all 13 env vars (currently only documents 4)
12. Update `CLAUDE.md` env var section to add `PERPLEXITY_API_KEY`, `BASIC_AUTH_ENABLED`, `PUBLIC_BASE_URL`, `GOOGLE_API_KEY`

**Deploy verification (manual — after code changes):**
13. Deploy to Railway, verify `GEMINI_API_KEY` + `KIE_API_KEY` + `PERPLEXITY_API_KEY` + auth env vars set
14. Verify SQLite volume mounted at `/app/data`
15. Dog-food test: paste LightScout URL → Quick Win → would you post this? → queue to Buffer → verify it arrives
16. Fix whatever breaks

### Phase 4: Guided workflows (Month 2)

**New features:**
1. Build "App Launch Campaign" flow — 2-week content generation using orchestrator + calendar population + review UI
2. Build "Weekly Content Batch" flow — 3 posts/week pillar rotation + calendar population
3. Add content pillars configuration per plan (DB column + UI picker)
4. Add brand consistency — colour extraction from app icon, tone persistence per plan, hashtag set management

**Fixes:**
5. **[#8]** Fix performance update false success — return `changes` count from DB helper, return 404 if no row was updated in `content-schedule/[id]/performance`

**Technical debt (acceptable for MVP, do when touching these files):**
6. **[#16]** Migrate raw `<button>` → shadcn Button (107 across 25 files — do incrementally per page)
7. **[#17]** Fix remaining dark mode hardcoded colors (1,238 bare lines across 52 files — do incrementally per page)
8. **[#18]** Add FK constraints on `social_posts.plan_id` and `content_schedule.plan_id`

### Phase 5: SME-ready (Month 3+)

**Product features:**
1. Supabase auth migration (already designed in `AUTH-ARCHITECTURE.md`)
2. Stripe + pricing page
3. Landing page rewrite with your dog-food story
4. Product Hunt launch

**Security hardening (required before multi-user):**
5. Enforce auth on all mutable routes — route-level guards (middleware covers basic auth, but individual routes need user-scoped access control after Supabase migration)
6. **[#10]** Add test suite — at minimum: smoke tests for critical API routes (scrape, generate-social-post, generate-post-image, post-to-buffer)

---

## Key Files (post-refactor)

| File | Relevance | Staff fixes |
|------|-----------|-------------|
| `src/app/plan/[id]/quickwin/page.tsx` | **Quick Win page** — auto-generates IG + TikTok + image, Buffer queue, video gen, mobile share, sessionStorage cache, hook/cta/time/tips display, shared `runGeneration` with cancellation | — |
| `src/app/plan/[id]/carousel/page.tsx` | **Carousel builder** — 3 modes, drag-to-reorder slides (Firefox-compatible), edit text, download, Buffer queue, step-based progress indicator | — |
| `src/app/plan/[id]/tone-compare/page.tsx` | Side-by-side draft generation in two tones, uses `/api/generate-draft` | — |
| `src/app/plan/[id]/social/page.tsx` | Full social flow — 4-step with video polling, image display, Buffer queue, mobile share, sessionStorage persistence (hydrate/save race-safe), Start Over | — |
| `src/app/api/generate-carousel/route.ts` | **Carousel generation** — Gemini concept + Nano Banana Pro hero + Playwright slides | — |
| `src/app/api/generate-social-post/route.ts` | Caption generation — supports post/reel/story/carousel, Instagram + TikTok | — |
| `src/app/api/generate-post-image/route.ts` | Image pipeline — screenshot/hero/hybrid modes, 1080x1080 via Playwright | ~~#7~~ FIXED |
| `src/app/api/generate-hero-bg/route.ts` | **Nano Banana Pro via Kie.ai** — background images (async task + polling) | ~~#7~~ FIXED |
| `src/app/api/caption-to-image-brief/route.ts` | Caption → structured image brief (hook, scene, subject, mood, palette) | — |
| `src/app/api/caption-to-veo-prompt/route.ts` | Caption → Kling 3.0 video prompt (up to 200 words, cinematic) | — |
| `src/app/api/generate-video/route.ts` | **Kling 3.0 via Kie.ai** — async video generation (createTask → taskId) | — |
| `src/app/api/generate-video/status/route.ts` | Kie.ai task polling — returns video URL when complete | — |
| `src/app/api/download-video/route.ts` | Proxies video download — aspect ratio in filename, expiry handling (410) | — |
| `src/app/api/post-to-buffer/route.ts` | Buffer via Zapier MCP — "queue" and "now" methods, logs to `social_posts` | ~~#1, #9~~ FIXED |
| `src/app/api/process-schedule/route.ts` | Scheduled content processing — cron-triggered | ~~#4 SSRF~~ FIXED, ~~#6 race~~ FIXED |
| `src/app/api/review-monitor/route.ts` | App review monitoring — POST triggers scrape + sentiment, SSRF fixed, passes url + reviews to downstream | ~~#2 broken contracts~~ FIXED |
| `src/app/api/content-schedule/[id]/performance/route.ts` | Performance tracking updates | #8 false success |
| `src/app/api/scrape/route.ts` | URL scraping entry point | ~~#5~~ FIXED |
| `src/components/GenerationOverlay.tsx` | Scrape → generate plan → redirect to Quick Win | — |
| `src/app/(marketing)/page.tsx` | Homepage — URL input, triggers GenerationOverlay, redirects to `/quickwin` | — |
| `src/lib/orchestrator.ts` | Multi-step pipeline with progress streaming, retry, 295s max | — |
| `src/lib/pipeline.ts` | Core Gemini wrappers — single `geminiUrl()` helper (change model here for all pipeline routes). Brand voice, draft, translations, etc. | — |
| `src/lib/db.ts` | SQLite singleton — schema init, all CRUD ops | ~~#1~~ FIXED |
| `src/lib/scraper.ts` | URL scraping — App Store (iTunes API), Google Play, generic websites | ~~#5~~ FIXED |
| `src/proxy.ts` | **DEAD CODE** — must rename to `src/middleware.ts` + fix export. Auth (basic auth + API key) is silently not running. | #11 middleware dead code |
| `src/app/api/export-pdf/route.ts` | PDF export — **has unfixed SSRF** via `x-forwarded-host` header | #12 SSRF |
| `src/hooks/usePlan.ts` | Plan data fetching hook — abort cleanup now properly wired | ~~cleanup leak~~ FIXED |
| `src/components/PlanSidebar.tsx` | **Redesigned** — 7-section nav with always-open Create section, localStorage persistence, mobile "More" button | — |
| `src/app/plan/[id]/page.tsx` | **Redesigned** — 3 gradient ActionCards (Quick Win, Carousel, Social) + 12 SuiteCards grid | — |
| `src/lib/socialTemplates.ts` | 100+ social media post templates across platforms/tones | — |
| `AUTH-ARCHITECTURE.md` | Supabase auth migration plan (PostgreSQL + RLS) | — |
| `STAFF-REVIEW-REPORT.md` | Original code audit — 7 fixed, 3 open (superseded by Feb 21 verified review) | — |

---

## Verification

### The dog-food test (do this first)
1. Paste LightScout App Store URL
2. Generate Quick Win content
3. Ask: "Would I actually post this?" — for the caption, the image, and the TikTok script
4. Queue one post to Buffer → verify it appears in your Buffer queue
5. Post it. See what happens.

### Carousel test
1. Generate a carousel for LightScout (auto mode)
2. Generate one with your own screenshots (guided mode)
3. Download all slides → post as Instagram carousel
4. Check: do the slides flow logically? Is the hook strong? Does the CTA slide work?

### Video test
1. Generate a TikTok video via Kling 3.0 for LightScout
2. Download it via `/api/download-video` proxy → watch it → would you post it?
3. Check: does the video match the caption? Is it the right aspect ratio (9:16)?

### Buffer integration test
1. Generate an Instagram post with image
2. Queue to Buffer via `/api/post-to-buffer` ("Add to Queue" method)
3. Check Buffer dashboard — does the post appear with image attached?
4. Try "Share Now" method — does it post immediately?
5. Check `social_posts` table — is the post logged with correct status?

### Weekly flow test
1. Run "Generate This Week's Content" for LightScout
2. Review 3 posts → edit if needed → queue all to Buffer
3. Check: does the rotation across pillars feel natural? Is there variety?
