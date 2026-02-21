# Product Strategy: Marketing Tool

**Date:** 2026-02-20
**Updated:** 2026-02-21 (Kie.ai migration complete, Phase 2 done)
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
| AI (text only) | **Gemini 2.5 Flash** via Google AI Studio raw fetch — `GEMINI_API_KEY` |
| AI (images) | **Nano Banana Pro** via Kie.ai (`nano-banana-pro`) — `KIE_API_KEY` |
| AI (video) | **Kling 3.0** via Kie.ai (`kling-3.0/video`) — `KIE_API_KEY` |
| Rendering | Playwright 1.58.2 (HTML → PNG) |
| Social publishing | Buffer via Zapier MCP (`ZAPIER_MCP_TOKEN` env var, JSON-RPC 2.0 + SSE) |
| Deployment | Railway (auto-deploy from `main`) |

**Environment variables:**

| Variable | Required | Used by |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | All text generation (copy, briefs, prompts) via Google AI Studio |
| `KIE_API_KEY` | Yes | Image generation (Nano Banana Pro) + video generation (Kling 3.0) via Kie.ai |
| `ZAPIER_MCP_TOKEN` | For Buffer | Social publishing via Zapier MCP (JSON-RPC 2.0 + SSE) |
| `IMAGE_DIR` | No | Image storage path, defaults to `/app/data/images` |
| `PUBLIC_BASE_URL` or `NEXT_PUBLIC_BASE_URL` | No | Media attachment URLs in Buffer posts, falls back to request origin |

**Git workflow:** Single `main` branch. No feature branches — this is a solo pre-launch project. Commit directly to main.

---

## AI Models — Current

| Purpose | Model | Provider | Status |
|---------|-------|----------|--------|
| Copy/prompts | Gemini 2.5 Flash + Gemini 2.0 Flash (6 routes) | Google AI Studio | Active — 6 routes still on 2.0, to be standardised |
| Image generation | **Nano Banana Pro** (`nano-banana-pro`) | Kie.ai | Done |
| Video generation | **Kling 3.0** (`kling-3.0/video`) | Kie.ai | Done — needs e2e testing |
| Image briefs | Gemini 2.5 Flash → Nano Banana Pro prompt | Google AI Studio → Kie.ai | Done |
| Video prompts | Gemini 2.0 Flash → Kling 3.0 prompt | Google AI Studio → Kie.ai | Done |

**Nano Banana Pro capabilities:**
- Native text rendering in images (logos, CTAs, slide text)
- Up to 4K resolution (1K/2K at ~$0.09/image, 4K at ~$0.12/image via Kie.ai)
- Up to 8 reference images for brand consistency
- Aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

**Kling 3.0 capabilities:**
- Text-to-video and image-to-video generation
- 3-15 second clips with native audio
- Multi-shot storytelling mode
- Element references (@element_name) for character consistency
- Standard ($0.10/s no-audio) and Pro ($0.135/s no-audio) modes

**The 6 routes still on Gemini 2.0 Flash** (to be standardised to 2.5 later):
- `caption-to-veo-prompt` (note: route path still says "veo" but generates Kling 3.0 prompts)
- `generate-social-post`
- `generate-schedule`
- `content-calendar`
- `auto-publish`
- `review-monitor`

All other text generation uses Gemini 2.5 Flash. Image and video generation use Kie.ai.

**Kie.ai API pattern** (shared by both Nano Banana Pro and Kling 3.0):
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

## Staff Review Findings (from STAFF-REVIEW-REPORT.md)

The following bugs and security issues were identified in a code audit. They are integrated into the build phases below at the appropriate point.

| # | Severity | Issue | Status | Phase |
|---|----------|-------|--------|-------|
| 1 | **P1** | `post-to-buffer` crashes on fresh DB | **FIXED** | 1 |
| 2 | **P1** | `review-monitor` POST flow broken | Open | 4 |
| 3 | **P1** | Security posture public-by-default | Open | 5 |
| 4 | **P1** | SSRF / API-key exfiltration in scheduler | Open | 5 |
| 5 | **P1** | SSRF risk in scraper | **FIXED** | 1 |
| 6 | **P2** | Scheduler double-processing race | Open | 4 |
| 7 | **P2** | Image storage coupled to Railway path | **FIXED** | 2 |
| 8 | **P2** | Performance update false success | Open | 4 |
| 9 | **P2** | Media attachment base URL hardcoded | **FIXED** | 1 |
| 10 | **P3** | No test suite | Open | 5 |

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

### Phase 3: Carousel + Video polish (Week 3-4)

**New features:**
1. Build carousel generation flow — new `POST /api/generate-carousel` endpoint + slide editor UI (drag-to-reorder, edit text, swap screenshots, upload images)
2. Add mobile download/share for images and video (native Web Share API on mobile)

**Testing + integration:**
3. End-to-end test Kling 3.0 video in production (download proxy, aspect ratios, expiry handling)
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
| `src/app/plan/[id]/quickwin/page.tsx` | **Quick Win page** — auto-generates Instagram + TikTok + image on load | — |
| `src/app/plan/[id]/tone-compare/page.tsx` | Side-by-side draft generation in two tones, uses `/api/generate-draft` | — |
| `src/app/plan/[id]/social/page.tsx` | Full social flow — 4-step with video polling, image display, Buffer queue | — |
| `src/app/api/generate-social-post/route.ts` | Caption generation — supports post/reel/story/carousel, Instagram + TikTok | — |
| `src/app/api/generate-post-image/route.ts` | Image pipeline — screenshot/hero/hybrid modes, 1080x1080 via Playwright | ~~#7~~ FIXED |
| `src/app/api/generate-hero-bg/route.ts` | **Nano Banana Pro via Kie.ai** — background images (async task + polling) | ~~#7~~ FIXED |
| `src/app/api/caption-to-image-brief/route.ts` | Caption → structured image brief (hook, scene, subject, mood, palette) | — |
| `src/app/api/caption-to-veo-prompt/route.ts` | Caption → Kling 3.0 video prompt (up to 200 words, cinematic) | — |
| `src/app/api/generate-video/route.ts` | **Kling 3.0 via Kie.ai** — async video generation (createTask → taskId) | — |
| `src/app/api/generate-video/status/route.ts` | Kie.ai task polling — returns video URL when complete | — |
| `src/app/api/download-video/route.ts` | Proxies video download with Content-Disposition header | — |
| `src/app/api/post-to-buffer/route.ts` | Buffer via Zapier MCP — "queue" and "now" methods, logs to `social_posts` | ~~#1, #9~~ FIXED |
| `src/app/api/process-schedule/route.ts` | Scheduled content processing — cron-triggered | #4 SSRF, #6 race |
| `src/app/api/review-monitor/route.ts` | App review monitoring — POST triggers scrape + sentiment | #2 broken contracts |
| `src/app/api/content-schedule/[id]/performance/route.ts` | Performance tracking updates | #8 false success |
| `src/app/api/scrape/route.ts` | URL scraping entry point | ~~#5~~ FIXED |
| `src/components/GenerationOverlay.tsx` | Scrape → generate plan → redirect to Quick Win | — |
| `src/app/(marketing)/page.tsx` | Homepage — URL input, triggers GenerationOverlay, redirects to `/quickwin` | — |
| `src/lib/orchestrator.ts` | Multi-step pipeline with progress streaming, retry, 295s max | — |
| `src/lib/pipeline.ts` | Core Gemini 2.5 Flash wrappers — brand voice, draft, translations, etc. | — |
| `src/lib/db.ts` | SQLite singleton — schema init, all CRUD ops | ~~#1~~ FIXED |
| `src/lib/scraper.ts` | URL scraping — App Store (iTunes API), Google Play, generic websites | ~~#5~~ FIXED |
| `src/proxy.ts` | Middleware / auth proxy | #3 public-by-default |
| `src/hooks/usePlan.ts` | Plan data fetching hook | #10 cleanup leak |
| `src/lib/socialTemplates.ts` | 100+ social media post templates across platforms/tones | — |
| `AUTH-ARCHITECTURE.md` | Supabase auth migration plan (PostgreSQL + RLS) | — |
| `STAFF-REVIEW-REPORT.md` | Full code audit — 4 fixed, 6 open | — |

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
