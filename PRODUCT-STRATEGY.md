# Product Strategy: Marketing Tool

**Date:** 2026-02-20
**Status:** Pre-launch — built but not battle-tested

---

## Context

You've built a technically mature, 50+ endpoint marketing tool but have never used it end-to-end for a real app. The tool has 28 pages of features, but your immediate need is simple: paste a URL, get great social content you'd actually post. This plan defines what the product *is*, the core flows, what you need from a marketing perspective, and how to evolve it toward SME sales.

---

## What the Product Is

**Positioning:** "Paste any app or website URL → get ready-to-post social content with AI-generated images and video in 60 seconds. Full marketing plan underneath when you need it."

**Core promise:** Remove the blank-page problem for founders and small businesses who know their product but don't know what to write, design, or post.

**Key differentiator:** Buffer/Hootsuite assume you already have content. Canva assumes you know what to say. This tool starts from a URL and produces the copy, image, and video together — informed by actual data about the product.

---

## AI Models

Upgrade the image/video stack to current Google models:

| Purpose | Current Model | Target Model | Notes |
|---------|--------------|--------------|-------|
| Image generation | Imagen 3.0 (`imagen-3.0-generate-002`) | **Nano Banana** (Gemini native image gen) | Swap in `generate-hero-bg` and image pipeline. Better quality, text rendering, consistency |
| Video generation | Veo 2.0 (`veo-2.0-generate-001`) | **Veo 2.0** (keep) or upgrade to Veo 3 when available | Already integrated, needs end-to-end testing |
| Copy/prompts | Gemini 2.0 Flash | **Gemini 2.5 Flash** | Better reasoning for caption and prompt quality |

**Nano Banana key advantages:** native text rendering in images (logos, CTAs), up to 1024x1024 (Pro version supports 2K/4K), few-shot design (accepts reference images for brand consistency), and "thinking" mode that reasons through prompts before generating.

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
- Buffer integration via Zapier
- Translations, A/B variants, SERP preview, keywords, 30-day content calendar
- Guided workflows (Launch Flow, Weekly Content Flow)
- Export bundle (PDF + ZIP)

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
                                      |-- Generate Instagram caption + hashtags
                                      |-- Generate TikTok script (hook + scenes)
                                      +-- Generate hero image (Nano Banana)
                                             |
                                    Three output cards:
                                    [Instagram]  [TikTok]  [Upgrade teaser]
                                             |
                                   Copy / Download / Queue to Buffer
```

**New page needed:** `/plan/[id]/quickwin` — auto-generates all three on load, shows progress, then reveals cards.

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
- Uses Nano Banana for hero slide + overlay generation
- Renders each slide as 1080x1350 PNG (Instagram carousel optimal size)
- Returns array of slide images + overall caption + hashtags
- UI: Drag-to-reorder slides, edit individual slide text, swap screenshots

### Flow 3: Video Post

**Trigger:** "Generate Video" button on Quick Win (TikTok card) or Social page
**Time:** ~90 seconds (Veo generation is async)

```
Caption --> /api/caption-to-veo-prompt --> Veo 2.0 --> Poll status --> Video URL
                                                                         |
                                                               Preview + Download
                                                               Queue to Buffer (TikTok/Reels)
```

Already built. Needs: end-to-end testing, mobile download flow, and integration into the Quick Win page as a Tier 2 upsell.

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

**Implementation:** Uses existing content calendar (`/api/generate-schedule`) + social generation. New orchestration step that generates the full batch and populates the calendar. User reviews each post before queuing to Buffer.

### Flow 5: Weekly Content Batch (guided workflow)

**Trigger:** "Generate This Week's Content" button on dashboard
**What it does:** Generates 3-5 posts for the week based on your content pillars

| Day | Content pillar | Example |
|-----|---------------|---------|
| Mon | Feature tip | "Did you know [app] can do X?" + screenshot |
| Wed | User story / use case | "How [persona] uses [app] to solve [problem]" + carousel |
| Fri | Behind-the-scenes / personality | Dev life, funny moment, milestone — video or image |

**Implementation:** New endpoint or orchestration step. Takes plan ID + week number, generates platform-specific posts for each day, populates calendar, queues for review.

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
- **Tone of voice:** Set once per plan (casual/professional/bold) and apply to all generated copy
- **Visual style:** Nano Banana's few-shot feature can accept reference images — use your first approved post as the style reference for all future posts
- **Hashtag sets:** Maintain a curated set per platform (research-backed), reused across posts

### Things most beginners forget

1. **Call to action in every post** — "Link in bio", "Try it free", "Download now". The tool should auto-include a CTA.
2. **Hook in the first line** — Instagram truncates after 2 lines. TikTok viewers decide in 1 second. The generated copy must front-load the hook.
3. **App Store screenshots are marketing** — The tool could generate optimised App Store screenshot layouts (Nano Banana + your real screenshots).
4. **Reuse content across platforms** — One Instagram carousel can become a TikTok script can become a Twitter thread. The tool's "atomize" feature does this. Surface it more prominently.
5. **Engage, don't just broadcast** — The tool can generate content but you need to reply to comments, DM people, engage with similar accounts. No tool replaces this.

---

## Critical Fixes Required First

### 1. Fix the 502 production error (30 min)
All AI endpoints returning 502 on Railway. Check `GEMINI_API_KEY` env var in Railway → Service → Variables.

### 2. Verify SQLite persistence (15 min)
Railway redeploys wipe filesystem. Check Railway → Service → Volumes. If no volume mapped to `/app/data`, every deploy deletes all plans.

### 3. Test Buffer/Zapier end-to-end (30 min)
The integration exists and looks solid (MCP-based, `ZAPIER_MCP_TOKEN` env var). But it's untested. Generate a test post and queue it to Buffer. Verify it appears in your Buffer queue.

### 4. Upgrade image pipeline to Nano Banana
Replace Imagen 3.0 (`imagen-3.0-generate-002`) calls in `src/app/api/generate-hero-bg/route.ts` with Gemini native image generation. This also enables text-in-image (logos, CTAs on slides) which Imagen 3 can't do well.

---

## What Needs to Be Built (Prioritised)

### Phase 1: Make it work (Week 1)
1. Fix 502 + SQLite persistence + test Buffer/Zapier
2. Dog-food test: generate content for LightScout, try to actually post it
3. Fix whatever breaks

### Phase 2: Quick Win page (Week 2)
1. Build `/plan/[id]/quickwin` page (pattern: existing `social/page.tsx`)
2. Update `GenerationOverlay.tsx` to redirect new users to Quick Win
3. Integrate Nano Banana for image generation (replace Imagen 3.0)

### Phase 3: Carousel + Video polish (Week 3-4)
1. Build carousel generation flow (`/api/generate-carousel`)
2. End-to-end test Veo 2.0 video in production
3. Add mobile download/share for images and video
4. Wire "Queue to Buffer" through the Quick Win → Buffer flow

### Phase 4: Guided workflows (Month 2)
1. Build "App Launch Campaign" flow (2-week content generation + calendar)
2. Build "Weekly Content Batch" flow (3 posts/week rotation)
3. Add content pillars configuration per plan
4. Add brand consistency (colour extraction, tone persistence, hashtag sets)

### Phase 5: SME-ready (Month 3+)
1. Supabase auth migration (already designed in `AUTH-ARCHITECTURE.md`)
2. Stripe + pricing page
3. Landing page rewrite with your dog-food story
4. Product Hunt launch

---

## Key Files

| File | Relevance |
|------|-----------|
| `src/app/plan/[id]/social/page.tsx` | Template for Quick Win page; has all API call patterns |
| `src/app/api/generate-social-post/route.ts` | Instagram/TikTok caption generation |
| `src/app/api/generate-post-image/route.ts` | Image generation pipeline |
| `src/app/api/generate-hero-bg/route.ts` | **Imagen 3.0 → Nano Banana swap here** |
| `src/app/api/caption-to-veo-prompt/route.ts` | Caption → Veo video prompt conversion |
| `src/app/api/generate-video/route.ts` | Veo 2.0 video generation |
| `src/app/api/post-to-buffer/route.ts` | Buffer/Zapier MCP integration |
| `src/components/GenerationOverlay.tsx` | Post-generation redirect logic |
| `src/lib/orchestrator.ts` | Multi-step pipeline (for guided workflows) |
| `AUTH-ARCHITECTURE.md` | Supabase auth migration plan |
| `lightscout-dogfood.md` | Dog-food test checklist |

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
2. Download it → watch it → would you post it?
3. Check: does the video match the caption? Is it the right aspect ratio (9:16)?

### Weekly flow test
1. Run "Generate This Week's Content" for LightScout
2. Review 3 posts → edit if needed → queue all to Buffer
3. Check: does the rotation across pillars feel natural? Is there variety?
