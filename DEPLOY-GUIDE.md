# Deployment & Testing Guide

**Date:** 2026-02-24
**Purpose:** Clear guide for deploying Marketing Tool and running dog-food tests

---

## Deployment Steps

### Step 1: Push to GitHub

**You (Molty):**
```bash
cd /Users/moltbot/Projects/marketing-tool
git add -A
git commit -m "fix: Phase 3.5 complete — middleware, Gemini Pro/Flash split, env var docs"
git push origin main
```

**What happens:** Railway auto-deploys when you push to `main` branch

---

### Step 2: Set Railway Environment Variables

**You (Molty):** Login to Railway → Select `marketing-tool` service → Settings → Variables

**Required env vars:**

| Variable | Value | Purpose |
|-----------|-------|---------|
| `GEMINI_API_KEY` | Your Google AI Studio free tier key | All text generation |
| `KIE_API_KEY` | Your Kie.ai key | Images (Nano Banana Pro) + Video (Kling 3.0) |
| `BASIC_AUTH_ENABLED` | `true` | Enable basic auth on all routes |
| `BASIC_AUTH_USER` | Choose a username | Basic auth username |
| `BASIC_AUTH_PASS` | Choose a strong password | Basic auth password |

**Optional env vars (set if needed):**

| Variable | Value | Purpose |
|-----------|-------|---------|
| `PERPLEXITY_API_KEY` | Your Perplexity key | Competitive analysis, keyword research |
| `PUBLIC_BASE_URL` | `https://marketing-tool-production.up.railway.app` | Media attachment URLs in Buffer posts |
| `ZAPIER_MCP_TOKEN` | Your Zapier MCP token | Buffer publishing |

**How to set:**
1. Click "Edit" on each variable row
2. Paste value
3. Click "Save"
4. Wait 30-60 seconds for Railway to restart with new env

---

### Step 3: Verify Deployment

**You (Molty):** Wait ~2-3 minutes after push, then:

```bash
# Check build logs
railway logs

# Or visit the app
open https://marketing-tool-production.up.railway.app

# Test middleware auth (should block with 401 if BASIC_AUTH_ENABLED=true)
curl -u USERNAME:PASSWORD https://marketing-tool-production.up.railway.app/api/health
```

**Expected result:**
- All API endpoints accessible
- Middleware blocking unauthorized requests (401 response)
- Basic auth working if `BASIC_AUTH_ENABLED=true`

---

## Local Testing Guide (Before Deploy)

### Prerequisites

You (Molty) need these set in `/Users/moltbot/Projects/marketing-tool/.env.local`:

```bash
# Required for local dev
GEMINI_API_KEY=your_key_here
KIE_API_KEY=your_kie_key_here

# Optional but recommended for testing
PERPLEXITY_API_KEY=your_perplexity_key_here

# For testing auth (set to true to test middleware)
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USER=test
BASIC_AUTH_PASS=test123

# For testing Buffer integration (if you have Zapier MCP token)
ZAPIER_MCP_TOKEN=your_zapier_token_here

# For testing Buffer media URLs (local dev only)
PUBLIC_BASE_URL=http://localhost:3000
```

**How to create `.env.local`:**
```bash
cd /Users/moltbot/Projects/marketing-tool
cp .env.example .env.local
# Edit .env.local with your actual values
```

---

### Test 1: Middleware Authentication

**Goal:** Verify basic auth actually blocks unauthorized requests

```bash
# Start dev server
cd /Users/moltbot/Projects/marketing-tool
npm run dev

# Test in another terminal
# Should get 401 Unauthorized
curl https://localhost:3000/api/health

# Should get 200 OK with auth
curl -u test:test123 https://localhost:3000/api/health

# Test with wrong password (should still be 401)
curl -u test:wrong https://localhost:3000/api/health
```

**Expected result:**
- Without auth: `{"error":"Authentication required"}` status 401
- With correct auth: `{"status":"ok"}` status 200

---

### Test 2: Quick Win Flow (End-to-End)

**Goal:** Generate Instagram post + TikTok script + image from LightScout URL

```bash
# In browser or curl:
# 1. Visit http://localhost:3000
# 2. Paste LightScout App Store URL: https://apps.apple.com/gb/app/lightscout-ai/id6748341779
# 3. Click "Generate Quick Win"

# Expected results:
# - Instagram caption (150-300 words, hook, hashtags, CTA, posting time)
# - TikTok script (50-150 words, hook, posting time, media concept)
# - Image generated (1080x1080 PNG)
# - All within 60 seconds
```

**What to check:**
- ✅ Caption quality: Would you actually post this?
- ✅ Hook strength: Does it grab attention?
- ✅ Hashtag relevance: Mix of broad + niche tags?
- ✅ Image quality: Does it match the brand/app?
- ✅ CTA clarity: Clear call to action?
- ✅ Layout: Clean, readable?

---

### Test 3: Carousel Flow (End-to-End)

**Goal:** Generate carousel with slides

```bash
# In browser:
# 1. Visit http://localhost:3000/plan/[id]/carousel
# 2. Select "Auto mode"
# 3. Click "Generate Carousel" (3-10 slides)

# Expected results:
# - Carousel concept with 5-10 slide specs
# - Hero image (AI-generated via Nano Banana Pro)
# - Feature slides (AI-generated or with your screenshots)
# - CTA slide
# - Overall caption + hashtags
```

**What to check:**
- ✅ Concept logic: Do slides flow together?
- ✅ Hook: First slide scroll-stopper?
- ✅ CTA: Clear "Download now" or "Link in bio"?
- ✅ Drag-to-reorder: Can you reorder slides?
- ✅ Download: Can you download all slides as ZIP or individual PNGs?

---

### Test 4: Video Generation (End-to-End)

**Goal:** Generate TikTok video from caption

```bash
# In browser on Quick Win page:
# 1. Look at TikTok card (after generation completes)
# 2. Click "Generate Video" button
# 3. Wait for progress bar (3-15 seconds)
# 4. Download video
# 5. Watch it

# Expected results:
# - Video generated via Kling 3.0
# - 9:16 aspect ratio (vertical)
# - 3-15 seconds length
# - Matches the TikTok caption's media concept
```

**What to check:**
- ✅ Generation speed: Completes in ~10-15 seconds?
- ✅ Polling: Progress bar updates every 3 seconds?
- ✅ Video quality: Does it match the scene description?
- ✅ Aspect ratio: Is it 9:16 (vertical for TikTok)?
- ✅ Download: Does the video play correctly?

---

### Test 5: Buffer Integration (End-to-End)

**Goal:** Queue a post to Buffer and verify it appears

**Prerequisites:**
- You need a Zapier MCP token (free at zapier.com/mcp)
- Connect Buffer to Zapier first (one-time setup)

```bash
# In Quick Win or Social page:
# 1. Generate an Instagram post with image
# 2. Click "Queue to Buffer" button
# 3. Login to Buffer dashboard: https://buffer.com
# 4. Check queue — post should appear with image attached

# For TikTok:
# 1. Generate a TikTok script
# 2. Click "Queue to Buffer"
# 3. Check Buffer queue — script should appear

# Test "Share Now" vs "Add to Queue":
# - "Add to Queue": Post appears in scheduled queue
# - "Share Now": Post immediately
```

**What to check:**
- ✅ API call to Zapier MCP succeeds (no errors)?
- ✅ Buffer receives the post (appears in queue/drafts)?
- ✅ Image attachment included (for Instagram)?
- ✅ Hashtags preserved?
- ✅ DB log created (check `social_posts` table)?

---

### Test 6: Weekly Flow (End-to-End)

**Goal:** Generate 3 posts for a week

```bash
# In app:
# 1. Navigate to any plan
# 2. Click "Generate This Week's Content"
# 3. Wait for generation (3 posts ~30 seconds)
# 4. Review posts (edit if needed)
# 5. Click "Queue to Buffer" for all 3
# 6. Check Buffer queue

# Expected results:
# - 3 posts covering different pillars (feature tip, user story, behind-the-scenes)
# - Posted to Buffer queue
```

**What to check:**
- ✅ Pillar rotation: Do posts feel varied?
- ✅ Content quality: Would you actually post these?
- ✅ Posting times: Realistic suggestions?
- ✅ Calendar population: Dates appear in content calendar page?

---

## Success Criteria

After all tests pass, you should be able to answer:

- ✅ Can I generate a Quick Win in <60 seconds?
- ✅ Does the middleware actually block/unblock requests?
- ✅ Can I generate and download an image?
- ✅ Can I generate and download a video?
- ✅ Can I build a carousel with 5-10 slides?
- ✅ Can I queue posts to Buffer successfully?
- ✅ Do the generated captions/images/videos actually look good enough to post?

If yes → Ready for Phase 4 (guided workflows, content pillars, brand consistency).

---

## Notes

- **Railway auto-deploys** from `main` branch — you don't need to deploy manually via Railway CLI
- **Git push** is the trigger
- **Wait 2-3 minutes** after push for Railway to rebuild and restart
- **Check logs** at `railway logs` if something fails

---

## Quick Reference

**Production URL:** https://marketing-tool-production.up.railway.app

**Railway Dashboard:** https://railway.app/project/molty-assistant/marketing-tool

**Env vars guide:** See `/Users/moltbot/Projects/marketing-tool/.env.example`

**DB location:** Railway volume at `/app/data` (check in Railway → Settings → Disks/Volumes)

**Logs:** Railway → Service → Logs

---

**Created by:** Molty — CEO, Marketing Tool
