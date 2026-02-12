# Marketing Tool — Product Roadmap

**Vision:** The marketing tool any founder can use to go from "I have an app" to "I have a complete marketing plan with assets" in under 5 minutes. No marketing knowledge required.

**Current state:** MVP — scrapes app URLs, generates template-based marketing briefs, produces HTML visual assets. Works but basic.

---

## v1.0 (Current) — Template Brief Generator

What works:
- ✅ Scrape App Store, Google Play, websites
- ✅ Generate 5-stage marketing brief (Vibe Marketing methodology)
- ✅ HTML visual asset templates (OG, social card, GitHub social)
- ✅ Copy templates for Reddit, HN, Product Hunt, LinkedIn, Twitter
- ✅ Distribution scheduling (4-week plan)
- ✅ Keyword generation
- ✅ Subreddit mapping

What's weak:
- ❌ Plans are generic — same structure regardless of app category
- ❌ No competitive intelligence (just placeholder prompts)
- ❌ No persistence — plans stored in sessionStorage (lost on refresh)
- ❌ Visual assets are preview-only (no download as PNG)
- ❌ No user can edit/refine the generated plan
- ❌ No real SEO data (keyword volumes, difficulty)
- ❌ Copy is template-filled, not AI-generated
- ❌ No auth, no accounts, no saved history (server-side)

---

## v1.1 — Polish & Persistence (This week)

**Goal:** Make it actually usable end-to-end.

### Must-do
- [ ] **Server-side persistence** — Save plans to SQLite/JSON so they survive page refresh
  - Simple file-based storage (no external DB needed)
  - `/api/plans` — CRUD for saved plans
  - Dashboard showing all generated plans
- [ ] **PNG export for visual assets** — Use Playwright on server to render HTML templates to downloadable PNGs
  - `/api/render-asset` endpoint
  - Zip download for all assets
- [ ] **Editable config** — Let user tweak app config before generating (competitors, differentiators, channels)
  - Pre-populate from scrape, allow overrides
  - Save edited config with the plan
- [ ] **Copy-to-clipboard per section** — Already have per-stage, add per-template (e.g. just the Reddit post)
- [ ] **Better error handling** — Google Play scraping is fragile, website scraping misses SPAs

### Nice-to-have
- [ ] **Basic auth** — Same pattern as Mission Control (env var user/pass)
- [ ] **Dark/light mode toggle**
- [ ] **Plan comparison** — Side-by-side view of plans for different apps

---

## v1.5 — AI-Enhanced Copy (Next 2 weeks)

**Goal:** Move from template-fill to genuine AI-generated copy.

### Core feature: AI Copy Generation
- [ ] **Integrate an LLM for copy** — Use Gemini API (free tier) or OpenAI for:
  - Custom Reddit posts that sound human (not template-y)
  - LinkedIn posts tailored to the founder's voice
  - App Store descriptions optimised for ASO
  - Product Hunt taglines and maker comments
- [ ] **Tone selector** — Technical, casual, professional, enthusiastic
- [ ] **Competitor-aware copy** — "Unlike [Competitor], we do X" — generated from actual competitor data
- [ ] **Iteration** — User can say "make it shorter" or "more technical" and regenerate

### Competitive Intelligence
- [ ] **Auto-scrape competitors** — Given app category, find and scrape top 5 alternatives
  - App Store search API
  - Google "best [category] apps" scraping
- [ ] **Competitive matrix** — Auto-generate feature comparison table
- [ ] **Gap analysis** — What competitors are missing (from their reviews)

### SEO Integration
- [ ] **Keyword volume estimation** — Scrape Google autocomplete for relative popularity
- [ ] **Related keyword clusters** — Group keywords by intent
- [ ] **Title/meta tag scoring** — How well does current page SEO match target keywords

---

## v2.0 — Full Marketing Suite (Month 2)

**Goal:** One tool that handles the entire marketing lifecycle for any app.

### Asset Generation
- [ ] **App Store screenshots** — Device frame templates, multiple styles, auto-populated
  - iPhone 15 Pro, iPad, Android device frames
  - Text overlay styles (minimal, feature callout, comparison)
  - Batch generation (6 screenshots in one go)
- [ ] **Video generation** — Silent screen recordings with caption overlays
  - Use Playwright to record app interactions
  - ffmpeg for overlay, transitions, captions
  - Template-based (intro → features → CTA)
- [ ] **Social media pack** — Generate all sizes at once
  - Twitter/X (1200×675), Instagram (1080×1080), LinkedIn (1200×627)
  - Story format (1080×1920)
  - Consistent branding across all

### Analytics Dashboard
- [ ] **PostHog integration** — Pull real metrics into the tool
  - Show which marketing channels drive the most engaged users
  - Conversion funnel per distribution channel
  - Weekly automated report
- [ ] **GoatCounter data** — Pull visitor stats per app
- [ ] **Reddit tracking** — Monitor post performance (upvotes, comments over time)

### Multi-App Management
- [ ] **Portfolio view** — All apps in one dashboard
- [ ] **Shared brand system** — Consistent colours, fonts, voice across all apps
- [ ] **Marketing calendar** — When to post what, across all apps
- [ ] **Template library** — Save and reuse successful copy patterns

### Distribution Automation
- [ ] **Reddit draft queue** — Prepare posts, schedule them, track status
- [ ] **Social media scheduler** — Draft → schedule → post (needs auth per platform)
- [ ] **Email outreach** — Generate personalised outreach emails for press/bloggers

---

## v3.0 — Client-Ready (Month 3+)

**Goal:** Package this for SME clients — Tom's marketing business.

### Client Management
- [ ] **Multi-tenant** — Each client gets their own workspace
- [ ] **White-label reports** — PDF export with client branding
- [ ] **Client onboarding flow** — Guided setup: add your app, set your brand, generate everything
- [ ] **Pricing tiers** — Free (1 app, basic brief) → Pro (unlimited, AI copy, assets)

### API
- [ ] **Public API** — Let other tools/agents call our marketing engine
- [ ] **Webhook support** — Notify when a new plan is generated
- [ ] **Bulk generation** — Upload CSV of apps → get marketing packs for all

---

## Tech Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Framework** | Next.js 16 | Already using, works well for this |
| **Database** | SQLite (via better-sqlite3) | Simple, no external deps, fast |
| **AI** | Gemini API (free tier) | Already have key, no extra cost |
| **Image rendering** | Playwright headless | Already proven in our screenshot generator |
| **Video** | ffmpeg | Free, powerful, CLI-based |
| **Hosting** | Railway | Already set up |
| **Auth** | Basic auth initially → proper auth in v3 | Keep it simple |

---

## Metrics That Matter

| Metric | Now | v1.1 Target | v2.0 Target |
|--------|-----|-------------|-------------|
| Time to first plan | ~2 min | ~1 min | ~30 sec |
| Plan quality (template) | 6/10 | 7/10 | 9/10 (AI-generated) |
| Asset export | Preview only | PNG download | Full pack (images + video) |
| Supported platforms | 3 (App Store, Play, web) | 3 | 5 (+ Chrome Web Store, npm) |
| Persistence | None | Server-side | Full history + analytics |
| Users | Just us | Just us | External testers |

---

## Immediate Next Steps (Today/Tomorrow)

1. **Deploy to Railway** ← in progress
2. **Add SQLite persistence** for plans
3. **Add PNG export** for visual assets
4. **Add editable config** before plan generation
5. **Add basic auth** (env var user/pass)
6. **Test with 10 different apps** and fix edge cases

---

*This roadmap is living. Updated as we learn what works and what doesn't.*
