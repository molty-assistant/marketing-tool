# Marketing Tool — Product Review (Feb 15, 2026)

## What We've Built

**10 pages, 11 API endpoints.** This is no longer a prototype — it's a real product.

### Pages
| Page | Purpose |
|------|---------|
| `/` | Home — URL input + CTA to wizard |
| `/analyze` | Scrape any app/site URL |
| `/dashboard` | All saved plans — search, filter, manage |
| `/wizard` | 3-step guided onboarding (goal → URL → go) |
| `/plan/[id]` | Full marketing plan view with stage breakdown |
| `/plan/[id]/draft` | **AI draft generation** — full listing copy from brief |
| `/plan/[id]/translate` | **Multi-language localisation** — 10 languages |
| `/plan/[id]/serp` | **SERP preview** — see how it looks in Google |
| `/plan/[id]/assets` | Visual assets (OG images, social cards) |
| `/shared/[token]` | Shareable read-only plan link |

### APIs
- `scrape` — Extract app data from App Store / Play Store / any website
- `generate-plan` — Create full marketing plan from scraped data
- `enhance-copy` — AI-powered copy enhancement (4 tones)
- `generate-draft` — Full listing copy generation from plan
- `generate-translations` — Multi-language localisation (10 languages)
- `generate-variants` — A/B copy variant generation
- `generate-assets` — OG images, social cards
- `render-png` / `render-zip` — Screenshot/asset export
- `plans` — CRUD for saved plans
- `shared` — Share token management

### Infrastructure
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind
- **AI:** Gemini 2.5 Flash (copy, drafts, translations, variants)
- **Storage:** SQLite (local persistence)
- **Hosting:** Railway (auto-deploy from main)
- **Auth:** None yet (single-user tool)

## What's Good
1. **Clear niche**: App-first marketing briefs. No direct competitor does this.
2. **End-to-end flow**: Scrape → Plan → Draft → Translate → Assets → Share
3. **AI integration is solid**: Gemini for copy, not just GPT wrapper vibes
4. **Onboarding**: Wizard solves the blank-page problem
5. **Speed**: Sub-agent builds land features in 3-5 minutes each

## What's Missing (for real users)
1. **No auth / multi-tenant** — can't serve multiple users
2. **No real monetisation path** yet — no pricing page, no stripe
3. **No analytics on usage** — PostHog still blocked (needs Tom's account)
4. **SEO / landing page** is basic — needs a proper marketing page for the marketing tool (ironic)
5. **Mobile experience** — audited but could be better
6. **Copy quality validation** — no way to compare AI output quality over time

## Strategic Question for Tom
This tool is feature-rich but has no users. Two paths:

**A) Productise it** — Add auth, pricing, landing page, launch on Product Hunt. Target indie devs. This is a real product now.

**B) Use it as portfolio/demo** — Showcase what AI + good product thinking can do. Use it for our own apps (LightScout, micro-apps). Don't chase users.

My recommendation: **B first, then A.** Use it for LightScout's App Store listing refresh. Dog-food it. Fix what's annoying. Then if it's genuinely useful, productise.

## Shipped Today (Feb 15)
- #35: Orchestrator wizard (goal-based onboarding)
- #36: Brief → full draft generation (AI writes copy from plan)
- #37: Multi-language localisation (10 languages)
- #38: SERP preview component

**Phase 5 complete. All planned features shipped.**
