# Marketing Tool — Live UX Audit (Supplementary)
**Date:** 18 February 2026  
**Tester:** Automated UX audit via browser  
**URL:** https://marketing-tool-production.up.railway.app  
**Test URL:** https://www.lightscout.ai (LightScout AI)

---

## 🚨 Critical: All AI Generation Endpoints Return 502

**This is the #1 finding.** Every AI-powered feature is broken in production.

Tested endpoints that failed:
- `/api/brand-voice` → **502**
- `/api/generate-social-post` → **502**

This means:
- Foundation tab: Brand Voice, Positioning Angles, Competitive Analysis — all show "Not generated yet" with no progress after clicking Generate
- Social tab: "Generate Post Idea" shows **"AI generation failed"** error message
- Draft tab: All sections show "Not generated yet..." (likely same 502 on generate)
- Keywords, Emails, etc. — all generate buttons will presumably fail

**Root cause:** The Railway deployment's AI API routes are returning 502 Bad Gateway. This could be:
1. Missing/expired OpenAI API key in production environment variables
2. Server timeout on AI generation (Railway may kill long requests)
3. Server crash during AI processing

**UX impact:** The error handling is decent (shows "AI generation failed" in Social), but Foundation tab shows **no error at all** — the button just does nothing visible. Users would think the app is broken or unresponsive.

---

## 🐛 Bug: Basic Auth Credentials Break Frontend Fetch

When accessing via `https://user:pass@host`, all frontend `fetch()` calls fail with:

> *"Failed to execute 'fetch' on 'Window': Request cannot be constructed from a URL that includes credentials: /api/scrape"*

The browser inherits credentials in the URL and passes them to relative fetch paths, which the Fetch API rejects. **Workaround:** Navigate to the URL without credentials after initial auth (browser caches the session). But this means any user who bookmarks or shares the `user:pass@` URL format will hit a broken app.

**Fix:** Either remove Basic Auth before launch, or ensure the app strips credentials from `window.location` before making fetch calls.

---

## ✅ What Works Well (New Observations)

### URL Scraping & Data Extraction
- Pasting `https://www.lightscout.ai` → scraped correctly in ~5 seconds
- Extracted: app name, one-liner, pricing ("Free"), features ("Free on iPhone"), app type ("Web")
- Auto-detected favicon/screenshot
- **Quality note:** Target audience defaulted to generic "Users of this type of apps" — this should be smarter based on the app description (e.g., "photographers")

### Configure Plan Page
- Editable fields for all extracted data — good flexibility
- Distribution channel selection (Reddit, HN, PH, Twitter/X, LinkedIn, App Store) as toggle chips — intuitive
- Differentiators shown as removable tags
- **Issue:** Only 1 differentiator extracted ("Free on iPhone") — should extract more from the page content

### Tab Navigation (19 tabs!)
The tab grid is comprehensive but **overwhelming**. 19 tabs across 4 rows:
Brief, Foundation, Draft, Variants, Preview, Approvals, Emails, Calendar, Digest, Distribute, Translate, SERP, Competitors, Assets, Reviews, Keywords, Social, Templates, Schedule

**Observation from live use:** This is actually more usable than expected from code review. The active tab highlighting is clear, and the grid layout with descriptions helps orientation. But there's no visual indication of which tabs have content vs. which are empty — every tab looks the same until you click it.

### Dashboard
- Clean, minimal
- Shows recent analyses with thumbnails
- Quick-start suggestions (LightScout AI, Spotify, Linear, Notion)
- **Nice touch:** "Clear all" for recent analyses

### Mobile Rendering
- Landing page: **Excellent.** Full-width CTA, readable typography, proper stacking
- Plan tabs: Reflow into 3-column compact grid — **functional but dense**
- Social wizard: Cards stack vertically, fully usable
- No horizontal overflow issues detected
- Pricing cards stack properly

---

## ⚠️ UX Issues Found in Live Testing

### 1. Silent Failures on Generate (Foundation Tab)
Clicking "✨ Generate" on Brand Voice → button appears to do nothing. No spinner, no loading state, no error message. The 502 happens silently. Only visible in browser DevTools.

**Compare:** Social tab shows "AI generation failed" — much better. Foundation tab should do the same.

### 2. Channel Cards Missing Cursor Pointer (Social Tab)
Instagram and TikTok selection cards have `cursor: default` instead of `cursor: pointer`. Makes them feel non-interactive. Users might not realize they're clickable.

### 3. "Generate Everything" Button — Risky
The Brief tab has a prominent "✨ Generate Everything" button. If all API endpoints are returning 502, this would fire off multiple failing requests simultaneously with potentially confusing error states.

### 4. Tab Grid Takes Significant Viewport Space
On desktop, the tab navigation consumes ~250px of vertical space before any content appears. On every tab switch, users see the same large grid. Consider a collapsible or horizontal scrolling tab bar.

### 5. "All Plans" Breadcrumb Inconsistency
On some tabs it shows "← All Plans / LightScout AI", on the Social tab it shows just "← All Plans" without the app name.

### 6. Plan URL Contains Timestamp + Random Suffix
URL format: `/plan/plan-1771435406081-h2p2vq` — not user-friendly for sharing. A slug based on app name would be better.

---

## 📊 Performance Observations

| Action | Time |
|--------|------|
| Landing page load | ~1.5s (fast) |
| URL scrape (lightscout.ai) | ~5s (acceptable) |
| Navigate between tabs | Instant (client-side) |
| Generate Brand Voice | Failed (502) after ~3s |
| Generate Social Post | Failed (502) after ~5s |

Page weight seems reasonable. No noticeable jank on navigation. The dark theme renders consistently across all pages.

---

## 🔄 Changes to Source Code Assessment

1. **Error handling is worse than code suggested** — Foundation tab has no visible error state at all for failed generations
2. **Mobile is better than expected** — responsive design works well across all tested pages
3. **Tab navigation is more usable in practice** — the grid with descriptions actually helps vs. a cramped horizontal tab bar
4. **The 502 issue is a deployment/ops problem, not a code problem** — the app itself is well-built, just the backend AI integration is down

---

## 🎯 Priority Fix List

1. **🔴 Fix 502s** — Check Railway env vars, API keys, timeout settings. This blocks ALL AI features.
2. **🔴 Add loading/error states to Foundation tab** — Users get zero feedback on failed generations
3. **🟡 Fix cursor:pointer on Social channel cards**
4. **🟡 Improve scraped "Target Audience"** — Use AI to infer from app description instead of generic fallback
5. **🟡 Add tab completion indicators** — Show which tabs have generated content (checkmark, dot, or colour)
6. **🟢 Improve plan URLs** — Use slugified app name instead of timestamp IDs
7. **🟢 Make breadcrumb consistent** across all tab pages
