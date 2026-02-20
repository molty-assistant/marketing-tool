# Product Strategy: Marketing Tool

**Date:** 2026-02-20
**Updated:** 2026-02-20 (post-refactor — 19 feature branches consolidated into main)
**Status:** Pre-launch — built but not battle-tested

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
| AI (copy) | **Gemini 2.5 Flash** via raw fetch (no SDK) |
| AI (images) | Imagen 3.0 (`imagen-3.0-generate-002`) — **upgrade to Nano Banana planned** |
| AI (video) | Veo 2.0 (`veo-2.0-generate-001`) — integrated, needs e2e testing |
| Rendering | Playwright 1.58.2 (HTML → PNG) |
| Social publishing | Buffer via Zapier MCP (`ZAPIER_MCP_TOKEN` env var, JSON-RPC 2.0 + SSE) |
| Deployment | Railway (auto-deploy from `main`) |

---

## AI Models — Current vs Target

| Purpose | Current | Target | Status |
|---------|---------|--------|--------|
| Copy/prompts | Gemini 2.5 Flash | Gemini 2.5 Flash | Done — already active |
| Image generation | Imagen 3.0 | **Nano Banana** (Gemini native image gen) | Needs upgrade |
| Video generation | Veo 2.0 | Veo 2.0 (upgrade to Veo 3 when available) | Done — needs e2e testing |
| Image briefs | Gemini 2.5 Flash → Imagen prompt | Gemini 2.5 Flash → Nano Banana prompt | Needs update with model swap |

**Why Nano Banana over Imagen 3.0:**
- Native text rendering in images (logos, CTAs, slide text) — Imagen 3.0 can't do this well
- Up to 1024x1024 (Pro version supports 2K/4K)
- Few-shot design: accepts up to 14 reference images for brand consistency
- "Thinking" mode: reasons through prompt before generating, fixing logic errors
- Better photorealism and detail

---

## Three Tiers (for future SME product)

### Tier 1 — Free (Quick Win)
- 1 Instagram post: AI caption + hashtags + Nano Banana image (1080x1080 PNG)
- 1 TikTok: hook + caption + hashtags + scene breakdown (script only, no video)
- Plans saved 7 days without account

### Tier 2 — Starter ($19/month)
Everything in Tier 1, plus:
- Full orchestration pack (brand voice, positioning, competitive analysis, emails, atomization)
- TikTok/Instagram video generation (Veo 2.0)
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

**New page needed:** `/plan/[id]/quickwin` — auto-generates all three on load, shows progress, then reveals cards.

**What already exists to power this:**
- `/api/generate-social-post` — returns caption, hashtags, hook, media_concept, media_specs, cta, posting_time, engagement_tips. Supports `contentType`: post, reel, story, carousel. Temperature 0.8.
- `/api/generate-post-image` — three visual modes: screenshot, hero (Imagen-backed), hybrid. Renders via Playwright at 1080x1080.
- `/api/caption-to-image-brief` — converts caption → structured image brief (hook, scene, subject, mood, palette, composition).
- `/plan/[id]/social/page.tsx` — the existing 4-step flow (choose platform → generate idea → create media → queue to Buffer) is the exact pattern to replicate in a simplified single-page Quick Win.

### Flow 2: Carousel Builder

**Trigger:** "Create Carousel" button on Quick Win or Social page
**Three modes:**

| Mode | How it works |
|------|-------------|
| **Full auto** | AI picks a carousel concept (e.g., "5 features of your app"), generates all slides with Nano Banana, writes slide captions |
| **Guided** | AI suggests concept + slide structure, you upload your own screenshots, AI generates text overlays and arranges them |
| **Manual** | You provide direction ("show these 3 features"), upload screenshots, AI generates hero slide + overlays for the rest |

**Carousel structure (Instagram, up to 10 slides):**
- Slide 1: Hero image (AI-generated via Nano Banana — the scroll-stopper)
- Slides 2-5+: Feature highlights, screenshots with text overlays, or AI-generated scenes
- Final slide: CTA ("Download now", "Link in bio", etc.)

**Implementation approach:**
- New endpoint: `POST /api/generate-carousel` — accepts mode, optional screenshots (base64/URLs), optional direction text
- Note: `/api/generate-social-post` already accepts `contentType: 'carousel'` — use this for the overall carousel caption/concept, then generate individual slides
- Uses Nano Banana for hero slide + overlay generation
- Renders each slide as 1080x1350 PNG (Instagram carousel optimal size)
- Returns array of slide images + overall caption + hashtags
- UI: Drag-to-reorder slides, edit individual slide text, swap screenshots

### Flow 3: Video Post

**Trigger:** "Generate Video" button on Quick Win (TikTok card) or Social page
**Time:** ~90 seconds (Veo generation is async)

```
Caption --> /api/caption-to-veo-prompt --> Veo 2.0 --> Poll status (10s intervals) --> Video URL
                                                                                        |
                                                                              Preview + Download
                                                                              Queue to Buffer
```

**Already built end-to-end in code:**
- `/api/caption-to-veo-prompt` — Gemini 2.5 Flash converts caption → cinematic Veo prompt (<100 words, shot types, camera movement, mood)
- `/api/generate-video` — fires Veo 2.0 `predictLongRunning`, returns operation name
- `/api/generate-video/status` — polls operation, returns video URI when ready
- `/api/download-video` — proxies download with API key auth (restricted to Google API URLs)
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
- **Visual style:** Nano Banana's few-shot feature can accept reference images — use your first approved post as the style reference for all future posts
- **Hashtag sets:** Maintain a curated set per platform (research-backed), reused across posts

### Things most beginners forget

1. **Call to action in every post** — "Link in bio", "Try it free", "Download now". The generate-social-post endpoint already includes a `cta` field — make sure it's always surfaced.
2. **Hook in the first line** — Instagram truncates after 2 lines. TikTok viewers decide in 1 second. The generate-social-post endpoint already returns a `hook` field — display it prominently.
3. **App Store screenshots are marketing** — The tool could generate optimised App Store screenshot layouts (Nano Banana + your real screenshots).
4. **Reuse content across platforms** — One Instagram carousel can become a TikTok script can become a Twitter thread. The `/api/atomize-content` endpoint does this — surface it more prominently.
5. **Engage, don't just broadcast** — The tool can generate content but you need to reply to comments, DM people, engage with similar accounts. No tool replaces this.

---

## Pre-Flight Checklist (Before Building New Features)

### 1. Fix the 502 production error (30 min)
All AI endpoints returning 502 on Railway. Check `GEMINI_API_KEY` env var in Railway → Service → Variables. If set, check Railway logs for actual error (may be timeout on free tier).

### 2. Verify SQLite persistence (15 min)
Railway redeploys wipe filesystem. Check Railway → Service → Volumes. If no volume mapped to `/app/data`, every deploy deletes all plans.

### 3. Test Buffer/Zapier end-to-end (30 min)
Integration uses Zapier MCP protocol (`ZAPIER_MCP_TOKEN` env var, JSON-RPC 2.0 with SSE streaming). Posts are logged to `social_posts` table. Generate a test post → queue to Buffer → verify it appears. Check both "Add to Queue" and "Share Now" methods.

### 4. Upgrade image pipeline to Nano Banana
Replace Imagen 3.0 (`imagen-3.0-generate-002`) calls in `src/app/api/generate-hero-bg/route.ts` with Gemini native image generation. Also update `src/app/api/caption-to-image-brief/route.ts` prompt to target Nano Banana's strengths (text rendering, brand consistency).

---

## Staff Review Findings (from STAFF-REVIEW-REPORT.md)

The following bugs and security issues were identified in a code audit. They are integrated into the build phases below at the appropriate point.

| # | Severity | Issue | Root cause | Phase |
|---|----------|-------|-----------|-------|
| 1 | **P1** | `post-to-buffer` crashes on fresh DB | `social_posts` table missing from schema init in `db.ts` | **1** |
| 2 | **P1** | `review-monitor` POST flow broken | Calls `scrape-reviews` with `{ planId }` but it requires `appStoreUrl`; calls `review-sentiment` with `{ planId }` but it requires `reviews` | **4** |
| 3 | **P1** | Security posture public-by-default | Middleware allows all requests when basic auth not enabled; mutable routes have no route-level auth | **5** |
| 4 | **P1** | SSRF / API-key exfiltration in scheduler | `process-schedule` derives callback URL from request origin + forwards `x-api-key`; spoofable host header leaks auth | **5** |
| 5 | **P1** | SSRF risk in scraper | `/api/scrape` fetches arbitrary URLs with no private IP / metadata host protections | **1** |
| 6 | **P2** | Scheduler double-processing race | Due rows selected then updated in separate operations; concurrent callers can claim same rows | **4** |
| 7 | **P2** | Image storage coupled to Railway path | Hardcoded `/app/data/images` fails outside Railway runtime | **2** |
| 8 | **P2** | Performance update false success | Handler always returns success; DB helper doesn't return change count | **4** |
| 9 | **P2** | Media attachment base URL hardcoded | `PUBLIC_BASE_URL` hardcoded to production domain; breaks staging/preview | **1** |
| 10 | **P3** | No test suite | No `test` script; `usePlan` hook has cleanup leak | **5** |

---

## What Needs to Be Built (Prioritised)

### Phase 1: Make it work (Week 1)

**Infrastructure fixes:**
1. Fix 502 production error — check `GEMINI_API_KEY` env var on Railway
2. Verify SQLite persistence — ensure Railway volume mapped to `/app/data`
3. ~~**[Staff #1]** Add `social_posts` table to schema init in `db.ts` — blocks Buffer integration on fresh DBs~~ **[DONE]**
4. ~~**[Staff #9]** Make `PUBLIC_BASE_URL` configurable via env var (fall back to `process.env.NEXT_PUBLIC_BASE_URL` or request origin) — `post-to-buffer/route.ts:19`~~ **[DONE]**
5. ~~**[Staff #5]** Add private IP / metadata host blocklist to scraper — reject `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `fd00::/8` before fetching~~ **[DONE]**

**Validation:**
6. Dog-food test: generate content for LightScout end-to-end, queue to Buffer, verify it arrives
7. Fix whatever breaks

### Phase 2: Quick Win page (Week 2)

**New feature:**
1. [x] Build `/plan/[id]/quickwin` page — auto-fires Instagram caption + TikTok caption + image generation on load, renders 3 output cards (pattern: existing `social/page.tsx` 4-step flow, simplified to auto-run)
2. [x] Update `GenerationOverlay.tsx` to redirect new users to Quick Win instead of plan overview

**Model upgrade:**
3. [x] Integrate Nano Banana for image generation (replace Imagen 3.0 in `generate-hero-bg`)

**Staff fix:**
4. [x] **[Staff #7]** Make image storage path configurable via env var (`IMAGE_DIR` defaulting to `/app/data/images`) — affects `generate-post-image`, `generate-hero-bg`, `images/[filename]` routes

### Phase 3: Carousel + Video polish (Week 3-4)

**New features:**
1. Build carousel generation flow — new `POST /api/generate-carousel` endpoint + slide editor UI (drag-to-reorder, edit text, swap screenshots, upload images)
2. Add mobile download/share for images and video (native Web Share API on mobile)

**Testing + integration:**
3. End-to-end test Veo 2.0 video in production (download proxy, aspect ratios, expiry handling)
4. Wire "Queue to Buffer" through the Quick Win → Buffer flow for both images and video

### Phase 4: Guided workflows (Month 2)

**New features:**
1. Build "App Launch Campaign" flow — 2-week content generation using orchestrator + calendar population + review UI
2. Build "Weekly Content Batch" flow — 3 posts/week pillar rotation + calendar population
3. Add content pillars configuration per plan (DB column + UI picker)
4. Add brand consistency — colour extraction from app icon, tone persistence per plan, hashtag set management

**Staff fixes (needed for scheduling/review features):**
5. **[Staff #2]** Fix `review-monitor` POST flow — pass `appStoreUrl` from plan's scraped data to `scrape-reviews`, pass actual `reviews` array to `review-sentiment`
6. **[Staff #6]** Fix scheduler race condition — use `UPDATE ... WHERE status = 'pending' RETURNING *` (single atomic operation) instead of separate SELECT + UPDATE in `process-schedule`
7. **[Staff #8]** Fix performance update false success — return `changes` count from DB helper, return 404 if no row was updated in `content-schedule/[id]/performance`

### Phase 5: SME-ready (Month 3+)

**Product features:**
1. Supabase auth migration (already designed in `AUTH-ARCHITECTURE.md`)
2. Stripe + pricing page
3. Landing page rewrite with your dog-food story
4. Product Hunt launch

**Security hardening (required before multi-user):**
5. **[Staff #3]** Enforce auth on all mutable routes — add route-level auth guards to `plans/[id]`, `auto-publish`, `content-schedule`, `process-schedule`, and other POST/PUT/DELETE endpoints
6. **[Staff #4]** Fix SSRF in scheduler — don't derive callback URL from request origin; use configured `PUBLIC_BASE_URL` env var instead; strip `x-api-key` from external-facing requests
7. **[Staff #10]** Add test suite — at minimum: smoke tests for critical API routes (scrape, generate-social-post, generate-post-image, post-to-buffer), `usePlan` hook cleanup fix

---

## Key Files (post-refactor)

| File | Relevance | Staff fixes |
|------|-----------|-------------|
| `src/app/plan/[id]/social/page.tsx` | **Primary template for Quick Win page** — 4-step flow with all API patterns, video polling, image display, Buffer queue | — |
| `src/app/api/generate-social-post/route.ts` | Caption generation — supports post/reel/story/carousel content types, Instagram (20-30 hashtags) + TikTok (3-5 hashtags) | — |
| `src/app/api/generate-post-image/route.ts` | Image pipeline — screenshot/hero/hybrid modes, 1080x1080 via Playwright | #7 path coupling |
| `src/app/api/generate-hero-bg/route.ts` | **Imagen 3.0 → Nano Banana swap here** — generates background images for social posts | #7 path coupling |
| `src/app/api/caption-to-image-brief/route.ts` | Caption → structured image brief (hook, scene, subject, mood, palette, composition) |
| `src/app/api/caption-to-veo-prompt/route.ts` | Caption → Veo video prompt (<100 words, shot types, camera movement) |
| `src/app/api/generate-video/route.ts` | Veo 2.0 async video generation + status polling + download proxy |
| `src/app/api/post-to-buffer/route.ts` | Buffer via Zapier MCP — supports "queue" and "now" methods, logs to `social_posts` table | #1 table missing, #9 hardcoded URL |
| `src/app/api/process-schedule/route.ts` | Scheduled content processing — cron-triggered | #4 SSRF, #6 race condition |
| `src/app/api/review-monitor/route.ts` | App review monitoring — POST flow triggers scrape + sentiment | #2 broken contracts |
| `src/app/api/content-schedule/[id]/performance/route.ts` | Performance tracking updates | #8 false success |
| `src/app/api/scrape/route.ts` | URL scraping entry point | #5 SSRF risk |
| `src/components/GenerationOverlay.tsx` | Post-generation redirect — where Quick Win redirect logic goes | — |
| `src/lib/orchestrator.ts` | Multi-step pipeline with progress streaming, retry, 295s max — for guided workflows | — |
| `src/lib/pipeline.ts` | Core Gemini 2.5 Flash wrappers — brand voice, draft, translations, positioning, emails, atomization, competitive analysis | — |
| `src/lib/db.ts` | SQLite singleton — schema init, all CRUD ops | #1 missing `social_posts` CREATE TABLE |
| `src/lib/scraper.ts` | URL scraping — App Store (iTunes API), Google Play, generic websites | #5 no IP blocklist |
| `src/proxy.ts` | Middleware / auth proxy | #3 public-by-default |
| `src/hooks/usePlan.ts` | Plan data fetching hook | #10 cleanup leak |
| `src/lib/socialTemplates.ts` | 100+ social media post templates across platforms/tones | — |
| `AUTH-ARCHITECTURE.md` | Supabase auth migration plan (PostgreSQL + RLS) | — |
| `STAFF-REVIEW-REPORT.md` | Full code audit — 10 findings (5x P1, 4x P2, 1x P3) | — |
| `lightscout-dogfood.md` | Dog-food test checklist (currently unchecked) | — |

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
1. Generate a TikTok video via Veo 2.0 for LightScout
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
