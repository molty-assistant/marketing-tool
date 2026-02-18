# Marketing Tool — Redesign Proposal

**Date:** 18 February 2026  
**Author:** Design Audit (Opus)  
**Status:** Draft for Tom's review  
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS

---

## Table of Contents

1. [Inspiration Analysis](#1-inspiration-analysis)
2. [Current App Audit](#2-current-app-audit)
3. [A — Information Architecture](#a-information-architecture)
4. [B — Core User Flow Redesign](#b-core-user-flow-redesign)
5. [C — Visual Design Direction](#c-visual-design-direction)
6. [D — Key Page Redesigns](#d-key-page-redesigns)
7. [E — Implementation Plan](#e-implementation-plan)

---

## 1. Inspiration Analysis

### 1.1 Zixflow — AI Customer Engagement Platform

- **Flow:** Landing → animated hero with rotating value props → single CTA → product tour
- **Navigation:** Clean top nav with mega-dropdown, minimal items (Product, Pricing, Resources)
- **Visual:** Dark theme with gradient blurs (purple/blue), animated text transitions, generous whitespace
- **Onboarding:** Single CTA "Get Started Free" — no multi-step wizard on landing
- **Worth borrowing:**
  - Animated value proposition cycling in the hero
  - Minimal top nav — don't expose everything at once
  - Social proof strip below the fold

### 1.2 Headroom — AI Inbox Automation

- **Flow:** Landing → one headline + one CTA → waitlist/signup — extreme simplicity
- **Navigation:** Almost none — just logo + single CTA button
- **Visual:** Ultra-minimal, likely dark or light with a single accent colour, very large typography
- **Onboarding:** Zero-friction — email capture or single-click signup
- **Worth borrowing:**
  - Radical simplicity on the landing page
  - One value proposition, one action — no distractions
  - Large, confident headline typography

### 1.3 Klu.ai — LLM App Platform

- **Flow:** Landing → features grid → social proof → pricing → CTA
- **Navigation:** Top nav: Features, Enterprise, Pricing, Docs
- **Visual:** Clean sections with clear hierarchy, feature cards with icons + descriptions, metric callouts (3x, 50+, 99.9%)
- **Onboarding:** "Get Started" → cal.com booking (high-touch), free tier available
- **Worth borrowing:**
  - Feature grid layout with icon + title + description + explore link
  - Impact metrics section (big numbers with context)
  - Testimonial cards with name/title/company
  - Clean pricing table (3 tiers, feature lists, popular badge)

### 1.4 Antimetal — Cloud Infrastructure AI

- **Flow:** Landing → hero with animated text → 3-step value (Find → Fix → Prevent) → integrations → metrics
- **Navigation:** Minimal top nav
- **Visual:** Dark theme, bold typography, gradient accents, animated UI mockups
- **Onboarding:** Single "Get Started" CTA, progressive disclosure
- **Worth borrowing:**
  - The Find → Fix → Prevent sequential narrative (maps well to Paste → Generate → Ship)
  - Integration logos grid for social proof
  - Big metric callouts (5x faster, 234K+ hours saved)
  - Dark, premium aesthetic with purposeful animation

### Key Patterns Across All Four

| Pattern | Frequency | Apply To |
|---------|-----------|----------|
| Single hero CTA (not two paths) | 4/4 | Landing page |
| Dark theme with gradient accents | 3/4 | Keep current dark theme |
| Minimal top nav (3-5 items max) | 4/4 | Replace 19-tab nav |
| Impact metrics/social proof | 3/4 | Landing + plan overview |
| Progressive disclosure | 4/4 | Plan sections |
| Feature cards (icon + title + desc) | 3/4 | Feature grid |

---

## 2. Current App Audit

### What Exists

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Hero + URL input + features grid |
| Wizard | `/wizard` | 5-step guided setup (URL → Platforms → Goals → Tone → Confirm) |
| Analyze | `/analyze?url=` | Scrape URL → show results → configure → generate |
| Plan Brief | `/plan/[id]` | Main plan page with markdown brief |
| Plan Overview | `/plan/[id]/overview` | Dashboard |
| 18 more tabs | `/plan/[id]/*` | Foundation, Variants, SERP, Competitors, Draft, Translate, Templates, Emails, Keywords, Distribute, Social, Schedule, Calendar, Reviews, Export, Digest, Approvals, Assets, Preview |

### Critical Problems

1. **Two entry paths that do the same thing.** Landing page sends to `/analyze`. Footer links to `/wizard`. Both scrape a URL and generate a plan. The wizard adds platforms/goals/tone selection but the analyze page has its own config form. This is confusing and duplicative.

2. **19 tabs is overwhelming.** PlanNav renders 20 navigation items across 5 groups (Overview, Strategy×5, Content×5, Distribution×4, Operations×6). This is presented as a horizontal scrolling tab bar inside a card — on mobile it's essentially unusable. On desktop, it requires scanning ~20 items to find what you need.

3. **No progressive disclosure.** Every section is exposed equally in the nav. A first-time user who just generated a plan sees 20 tabs with no guidance on what to look at first or what's been generated vs. what needs generating.

4. **Wizard state doesn't persist meaningfully.** The wizard collects platforms, goals, and tone but these only affect the initial generate call. The plan pages don't reference them.

5. **No dashboard/home for returning users.** The landing page is marketing-focused. There's a `/dashboard` route linked in the footer but it's unclear if it exists or works.

6. **Landing page is solid but generic.** The hero and features grid are well-built but could be more compelling with social proof, metrics, and a clearer single CTA.

7. **Dark theme execution is decent** but inconsistent — mix of `slate-800/50`, `slate-900/30`, `slate-700/60` with no clear system.

---

## A. Information Architecture

### Current IA Problems

- Flat structure: 20 pages at the same hierarchy level under `/plan/[id]/`
- No concept of "phases" or "workflow stages"
- Duplicate entry flows (wizard vs. analyze)
- No clear information scent — user can't predict what's behind each tab

### Proposed IA

```
/                           → Landing (marketing page)
/dashboard                  → My Plans (list of generated plans)
/new                        → Unified onboarding (replaces wizard + analyze)
/plan/[id]                  → Plan overview/dashboard (replaces /overview)
/plan/[id]/strategy         → Strategy hub (brief + foundation + competitors)
/plan/[id]/content          → Content hub (draft + emails + templates + translate)
/plan/[id]/distribution     → Distribution hub (social + schedule + calendar + distribute)
/plan/[id]/seo              → SEO hub (keywords + SERP + variants)
/plan/[id]/export           → Export & share (export + assets + preview)
/plan/[id]/strategy/brief   → Individual section (deep-link)
/plan/[id]/strategy/competitors  → Individual section (deep-link)
... etc
```

### Navigation Structure

**Top-level:** Persistent top bar with:
- Logo (→ `/dashboard` if logged in, `/` if not)
- Plan name (if on a plan page)
- Quick actions (Export, Share)

**Plan-level:** Left sidebar (desktop) / bottom sheet (mobile) with 6 items:
1. **Overview** — Plan health, what's generated, next steps
2. **Strategy** — Brief, Foundation, Competitors (expandable)
3. **Content** — Draft, Emails, Templates, Translate (expandable)
4. **Distribution** — Social, Schedule, Calendar (expandable)
5. **SEO** — Keywords, SERP, Variants (expandable)
6. **Export** — Export, Assets, Preview, Approvals

This reduces the top-level nav from **20 items → 6 items**. Sub-items are revealed on click/hover.

---

## B. Core User Flow Redesign

### Current Flow (Problematic)

```
Landing → [Wizard (5 steps)] OR [Analyze (scrape + config)] → Plan (20 tabs, no guidance)
```

### Proposed Flow

```
Landing → Enter URL → Scrape (loading screen with progress) → Plan Overview (guided)
```

**Key changes:**

1. **Single entry point.** Kill the wizard as a separate page. The landing page URL input goes directly to a unified generation flow.

2. **Smart defaults.** Don't ask for platforms/goals/tone upfront. Use sensible defaults (detect from URL whether it's mobile/web, default tone = professional). Let users customize *after* generation on the plan page.

3. **Generation loading screen.** Replace the analyze page's loading spinner with a full-screen progress view:
   ```
   ┌──────────────────────────────────────┐
   │                                      │
   │   Generating your marketing plan     │
   │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
   │                                      │
   │   ✓ Scraping URL                     │
   │   ✓ Analyzing product               │
   │   → Generating brief                │
   │   ○ Creating content                │
   │   ○ Building distribution plan      │
   │                                      │
   │   This usually takes 30-60 seconds   │
   │                                      │
   └──────────────────────────────────────┘
   ```

4. **Guided plan overview.** When the plan is ready, land on an overview that shows:
   - Plan health (what's been generated, what's empty)
   - Suggested next steps ("Review your brief", "Generate social posts")
   - Quick stats (features found, keywords, etc.)

5. **Progressive generation.** Don't generate everything upfront. Generate the brief + foundation immediately. Let users trigger content, distribution, and SEO generation on-demand from each hub page. This makes the initial load faster and gives users agency.

### Flow Diagram

```
[Landing Page]
     │
     ├─ Paste URL → click "Generate"
     │
[Generation Screen]  ← full-screen, animated progress
     │
     ├─ Scrape → Brief → Foundation (auto)
     │
[Plan Overview]  ← land here, guided next steps
     │
     ├─ "Review Strategy" → Strategy hub
     ├─ "Generate Content" → Content hub (on-demand)
     ├─ "Plan Distribution" → Distribution hub (on-demand)
     └─ "Optimize SEO" → SEO hub (on-demand)
```

---

## C. Visual Design Direction

### Direction: Premium Dark SaaS

Based on the inspiration sites, the current dark theme is the right call. Refine it:

### Colour Palette

Keep indigo as primary but add warmth and reduce the cold slate feel:

```css
/* Primary */
--primary-500: #6366f1;     /* indigo-500 — keep */
--primary-600: #4f46e5;     /* indigo-600 — keep for buttons */
--primary-400: #818cf8;     /* indigo-400 — keep for text accents */

/* Backgrounds — warmer than pure slate */
--bg-base: #0a0a0f;         /* near-black with slight blue */
--bg-surface: #12121a;      /* card backgrounds */
--bg-elevated: #1a1a2e;     /* elevated surfaces, nav */
--bg-hover: #22223a;        /* hover states */

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.10);
--border-strong: rgba(255, 255, 255, 0.15);

/* Accent (for success/generated states) */
--accent-emerald: #34d399;  /* emerald-400 */
--accent-amber: #fbbf24;    /* amber-400, for warnings/pending */
```

**Tailwind config addition:**

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      surface: {
        base: '#0a0a0f',
        card: '#12121a',
        elevated: '#1a1a2e',
        hover: '#22223a',
      },
    },
  },
}
```

### Typography

```css
/* Headlines: bold, tight tracking */
.heading-xl { @apply text-4xl sm:text-5xl font-bold tracking-tight text-white; }
.heading-lg { @apply text-2xl sm:text-3xl font-bold tracking-tight text-white; }
.heading-md { @apply text-xl font-semibold text-white; }
.heading-sm { @apply text-base font-semibold text-white; }

/* Body */
.body-lg { @apply text-base text-slate-300 leading-relaxed; }
.body-md { @apply text-sm text-slate-400 leading-relaxed; }
.body-sm { @apply text-xs text-slate-500; }

/* Monospace for URLs, code */
.mono { @apply font-mono text-sm text-indigo-400; }
```

### Spacing System

Standardize on 4px grid. Key spacings:
- Section padding: `p-6 sm:p-8` (24px/32px)
- Card padding: `p-5 sm:p-6` (20px/24px)
- Stack gap: `space-y-4` (16px) for form fields, `space-y-6` (24px) for sections
- Grid gap: `gap-4` (16px) for cards, `gap-6` (24px) for major sections

### Key UI Components to Redesign

1. **Navigation** — from horizontal 20-tab bar to left sidebar with 6 groups
2. **Cards** — standardize to one card component (border, radius, padding)
3. **Buttons** — primary (indigo filled), secondary (ghost/outline), destructive (red)
4. **Status badges** — Generated (emerald), Pending (amber), Empty (slate)
5. **Progress indicators** — for generation flow
6. **Hub pages** — new pattern: overview card + sub-section cards

---

## D. Key Page Redesigns

### D1. Landing Page

**Current:** Decent hero + 3-step + 8-feature grid. Two CTAs (input + wizard link).

**Proposed changes:**

```tsx
// src/app/page.tsx — new structure

<main>
  {/* Hero — single CTA, animated text */}
  <section className="relative min-h-[70vh] flex items-center justify-center">
    <div className="max-w-3xl mx-auto text-center">
      {/* Animated rotating text like Zixflow */}
      <h1 className="heading-xl">
        Turn Any URL into a
        <AnimatedText words={['Marketing Brief', 'Content Strategy', 'Launch Plan', 'Social Campaign']} />
      </h1>
      <p className="body-lg mt-4 max-w-xl mx-auto">
        Paste a link. Get a complete marketing plan with copy, emails, social posts, 
        SEO keywords, and distribution strategy — in under 60 seconds.
      </p>
      
      {/* Single URL input + button */}
      <URLInput className="mt-8" />
      
      {/* Trust badges */}
      <div className="mt-6 flex justify-center gap-4 text-xs text-slate-500">
        <span>No signup required</span>
        <span>·</span>
        <span>100+ plans generated</span>
        <span>·</span>
        <span>Free to try</span>
      </div>
    </div>
  </section>

  {/* Social proof / metrics — like Antimetal */}
  <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
    <MetricCard number="60s" label="Average generation time" />
    <MetricCard number="19" label="Marketing deliverables" />
    <MetricCard number="10" label="Languages supported" />
    <MetricCard number="6" label="Distribution channels" />
  </section>

  {/* How it works — 3 steps, like current but tighter */}
  <section>
    <StepCard step="01" title="Paste URL" description="Any website, App Store, or Play Store link" />
    <StepCard step="02" title="AI Generates" description="Brief, copy, emails, social posts, SEO — all at once" />
    <StepCard step="03" title="Ship It" description="Export, schedule, or distribute directly" />
  </section>

  {/* Feature grid — keep current 8 features but use Klu-style cards */}
  
  {/* CTA repeat at bottom */}
  <section className="text-center py-16">
    <h2 className="heading-lg">Ready to generate your marketing plan?</h2>
    <URLInput className="mt-6" />
  </section>
</main>
```

**Remove:** Wizard link from footer. Remove `/wizard` route entirely.

### D2. Unified Onboarding (replaces wizard + analyze)

**Route:** `/new?url=<encoded-url>` (or just stay on landing and show generation overlay)

**Proposed: Full-screen generation overlay**

```tsx
// src/components/GenerationOverlay.tsx

function GenerationOverlay({ url, onComplete }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-surface-base flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        {/* App info (once scraped) */}
        {appData && (
          <div className="flex items-center gap-3 mb-8">
            <img src={appData.icon} className="w-12 h-12 rounded-xl" />
            <div className="text-left">
              <div className="text-white font-semibold">{appData.name}</div>
              <div className="text-slate-500 text-sm">{appData.category}</div>
            </div>
          </div>
        )}

        <h2 className="heading-lg">Generating your plan</h2>
        
        {/* Step progress */}
        <div className="mt-8 space-y-3 text-left">
          <ProgressStep status="complete" label="Scraping URL" />
          <ProgressStep status="complete" label="Analyzing product" />
          <ProgressStep status="active" label="Writing marketing brief" />
          <ProgressStep status="pending" label="Generating content" />
          <ProgressStep status="pending" label="Building distribution plan" />
        </div>

        <p className="body-sm mt-8">Usually takes 30-60 seconds</p>
      </div>
    </div>
  );
}
```

**What gets cut:**
- `/wizard` page — deleted entirely
- `/analyze` page — replaced by this overlay + redirect to `/plan/[id]`
- Config form (app name, category, type, audience, etc.) — moved to plan settings, accessible *after* generation

### D3. Plan Overview / Dashboard

**Route:** `/plan/[id]` (the default landing after generation)

```tsx
// Pseudo-layout for plan overview

<PlanLayout sidebar>
  <div className="max-w-4xl">
    {/* Plan header */}
    <div className="flex items-center gap-4 mb-8">
      <img src={plan.icon} className="w-16 h-16 rounded-2xl" />
      <div>
        <h1 className="heading-lg">{plan.appName}</h1>
        <p className="body-md">{plan.oneLiner}</p>
        <div className="flex gap-2 mt-2">
          <Badge variant="emerald">Brief Ready</Badge>
          <Badge variant="amber">Content Pending</Badge>
        </div>
      </div>
      <div className="ml-auto flex gap-2">
        <ExportButton />
        <ShareButton />
      </div>
    </div>

    {/* Quick stats */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <StatCard label="Keywords" value={plan.keywords?.length || 0} />
      <StatCard label="Features" value={plan.features?.length || 0} />
      <StatCard label="Social Posts" value={plan.socialPosts?.length || 0} />
      <StatCard label="Email Sequences" value={plan.emails?.length || 0} />
    </div>

    {/* Hub cards — guided next steps */}
    <h2 className="heading-md mb-4">Your Marketing Plan</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <HubCard
        icon={<FileText />}
        title="Strategy"
        description="Brief, positioning, and competitive analysis"
        status="ready"
        href={`/plan/${id}/strategy`}
        items={['Brief', 'Foundation', 'Competitors']}
      />
      <HubCard
        icon={<PenLine />}
        title="Content"
        description="Copy, emails, templates, translations"
        status="generate"  
        href={`/plan/${id}/content`}
        items={['Draft Copy', 'Email Sequences', 'Templates', 'Translations']}
      />
      <HubCard
        icon={<Megaphone />}
        title="Distribution"
        description="Social posts, scheduling, content calendar"
        status="generate"
        href={`/plan/${id}/distribution`}
        items={['Social Posts', 'Schedule', 'Calendar']}
      />
      <HubCard
        icon={<Search />}
        title="SEO & ASO"
        description="Keywords, SERP preview, A/B variants"
        status="generate"
        href={`/plan/${id}/seo`}
        items={['Keywords', 'SERP Preview', 'Headline Variants']}
      />
    </div>

    {/* Suggested next actions */}
    <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
      <h3 className="heading-sm mb-2">💡 Suggested Next Steps</h3>
      <ol className="space-y-2 text-sm text-slate-300">
        <li>1. <Link href={`/plan/${id}/strategy`} className="text-indigo-400 hover:underline">Review your brief</Link> — check the AI-generated positioning</li>
        <li>2. <Link href={`/plan/${id}/content`} className="text-indigo-400 hover:underline">Generate content</Link> — create copy, emails, and templates</li>
        <li>3. <Link href={`/plan/${id}/distribution`} className="text-indigo-400 hover:underline">Plan distribution</Link> — build your social media calendar</li>
      </ol>
    </div>
  </div>
</PlanLayout>
```

### D4. Plan Navigation (The Big Fix)

**Current:** 20-item horizontal tab bar in a card. Scrollable, no grouping hierarchy.

**Proposed:** Collapsible left sidebar with 6 groups.

```tsx
// src/components/PlanSidebar.tsx

const NAV_GROUPS = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    href: '',  // /plan/[id]
  },
  {
    label: 'Strategy',
    icon: FileText,
    href: '/strategy',
    children: [
      { label: 'Brief', href: '/strategy/brief' },
      { label: 'Foundation', href: '/strategy/foundation' },
      { label: 'Competitors', href: '/strategy/competitors' },
    ],
  },
  {
    label: 'Content',
    icon: PenLine,
    href: '/content',
    children: [
      { label: 'Copy Draft', href: '/content/draft' },
      { label: 'Email Sequences', href: '/content/emails' },
      { label: 'Templates', href: '/content/templates' },
      { label: 'Translations', href: '/content/translate' },
    ],
  },
  {
    label: 'Distribution',
    icon: Megaphone,
    href: '/distribution',
    children: [
      { label: 'Social Posts', href: '/distribution/social' },
      { label: 'Schedule', href: '/distribution/schedule' },
      { label: 'Calendar', href: '/distribution/calendar' },
    ],
  },
  {
    label: 'SEO & ASO',
    icon: Search,
    href: '/seo',
    children: [
      { label: 'Keywords', href: '/seo/keywords' },
      { label: 'SERP Preview', href: '/seo/serp' },
      { label: 'Variants', href: '/seo/variants' },
    ],
  },
  {
    label: 'Export',
    icon: Package,
    href: '/export',
    children: [
      { label: 'Download', href: '/export/download' },
      { label: 'Assets', href: '/export/assets' },
      { label: 'Preview', href: '/export/preview' },
    ],
  },
];

export function PlanSidebar({ planId, appName }: Props) {
  const pathname = usePathname();
  const basePath = `/plan/${planId}`;

  return (
    <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-surface-elevated p-4 hidden lg:block">
      {/* Plan identity */}
      <div className="mb-6 px-2">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
          ← All Plans
        </Link>
        <h3 className="text-sm font-semibold text-white mt-2 truncate">{appName}</h3>
      </div>

      {/* Nav groups */}
      <nav className="space-y-1">
        {NAV_GROUPS.map((group) => {
          const groupPath = `${basePath}${group.href}`;
          const isActive = group.children
            ? pathname.startsWith(groupPath)
            : pathname === groupPath;
          const [expanded, setExpanded] = useState(isActive);

          return (
            <div key={group.label}>
              <button
                onClick={() => group.children ? setExpanded(!expanded) : null}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <group.icon size={16} />
                <span className="flex-1 text-left">{group.label}</span>
                {group.children && (
                  <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
                )}
              </button>

              {group.children && expanded && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {group.children.map((child) => {
                    const childPath = `${basePath}${child.href}`;
                    const childActive = pathname === childPath;
                    return (
                      <Link
                        key={child.href}
                        href={childPath}
                        className={cn(
                          'block px-3 py-1.5 rounded-md text-sm transition-colors',
                          childActive
                            ? 'text-white bg-white/[0.06]'
                            : 'text-slate-500 hover:text-slate-300'
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

**Mobile:** Replace sidebar with a top dropdown or bottom sheet. The 6 groups fit in a single row of icons.

```tsx
// Mobile nav bar (at top of plan pages, lg:hidden)
<div className="lg:hidden flex gap-1 overflow-x-auto p-2 border-b border-white/[0.06]">
  {NAV_GROUPS.map((group) => (
    <Link
      key={group.label}
      href={`/plan/${planId}${group.href}`}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap',
        isActive ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400'
      )}
    >
      <group.icon size={14} />
      {group.label}
    </Link>
  ))}
</div>
```

### D5. Content Generation Pages

**Pattern:** Each hub page (Strategy, Content, Distribution, SEO) follows the same template:

```tsx
// Hub page pattern — e.g., /plan/[id]/content

<div className="max-w-4xl">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="heading-lg">Content</h1>
      <p className="body-md">App Store copy, email sequences, and marketing templates</p>
    </div>
    <GenerateAllButton sections={['draft', 'emails', 'templates']} />
  </div>

  {/* Sub-section cards */}
  <div className="space-y-4">
    <SectionCard
      title="Copy Draft"
      description="App Store listing copy in multiple tones"
      status={plan.draft ? 'ready' : 'empty'}
      onGenerate={() => generate('draft')}
      href={`/plan/${id}/content/draft`}
    >
      {plan.draft && <Preview content={plan.draft} maxLines={4} />}
    </SectionCard>

    <SectionCard
      title="Email Sequences"
      description="Welcome and launch email flows"
      status={plan.emails ? 'ready' : 'empty'}
      onGenerate={() => generate('emails')}
      href={`/plan/${id}/content/emails`}
    >
      {plan.emails && <span className="text-sm text-slate-400">{plan.emails.length} emails ready</span>}
    </SectionCard>

    {/* ... more sections */}
  </div>
</div>
```

**Individual section pages** keep the current markdown rendering but add:
- Copy-to-clipboard buttons on each section
- "Regenerate" button
- Tone/style controls (moved from wizard to here, where they're contextually useful)

### D6. Distribution Page

**Current:** `/plan/[id]/distribute` — single page for multi-channel posting.

**Proposed:** Distribution hub with visual calendar + channel cards.

```tsx
// /plan/[id]/distribution

<div className="max-w-5xl">
  <h1 className="heading-lg mb-6">Distribution</h1>

  {/* Channel status cards */}
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
    {channels.map((ch) => (
      <ChannelCard
        key={ch.id}
        name={ch.label}
        icon={ch.icon}
        postsReady={ch.postsCount}
        scheduled={ch.scheduledCount}
        connected={ch.isConnected}
      />
    ))}
  </div>

  {/* Mini calendar view */}
  <div className="bg-surface-card border border-white/[0.06] rounded-xl p-6">
    <h2 className="heading-md mb-4">This Week</h2>
    <WeekCalendar posts={scheduledPosts} />
  </div>

  {/* Quick actions */}
  <div className="flex gap-3 mt-6">
    <Button href={`/plan/${id}/distribution/social`}>Generate Posts</Button>
    <Button href={`/plan/${id}/distribution/schedule`} variant="secondary">Schedule</Button>
    <Button href={`/plan/${id}/distribution/calendar`} variant="secondary">Full Calendar</Button>
  </div>
</div>
```

---

## E. Implementation Plan

### Phase 1 — Navigation & Layout (1-2 days, highest impact)

**What:** Replace 20-tab PlanNav with sidebar + hub pages.

**Files to change:**
- `src/components/PlanNav.tsx` → Replace with `PlanSidebar.tsx`
- Create `src/app/plan/[id]/layout.tsx` with sidebar layout
- Create hub pages: `strategy/page.tsx`, `content/page.tsx`, `distribution/page.tsx`, `seo/page.tsx`, `export/page.tsx`
- Move existing section pages under hub routes (e.g., `/plan/[id]/draft` → `/plan/[id]/content/draft`)

**Can be done by coders without design handoff:** Yes. The sidebar structure is fully specified above.

**Add shadcn/ui?** Yes — install it now. Use:
- `cn()` utility (already common pattern)
- `Button` component (primary/secondary/ghost variants)
- `Badge` component (status indicators)
- `Collapsible` component (sidebar groups)
- `Sheet` component (mobile nav)

```bash
npx shadcn@latest init
npx shadcn@latest add button badge collapsible sheet
```

### Phase 2 — Unified Onboarding (1 day)

**What:** Kill `/wizard`, simplify `/analyze` into a generation overlay.

**Files to change:**
- Delete `src/app/wizard/page.tsx`
- Create `src/components/GenerationOverlay.tsx`
- Modify `src/app/page.tsx` — URL input triggers overlay directly
- Simplify `src/app/analyze/page.tsx` — becomes the overlay + redirect

### Phase 3 — Plan Overview Redesign (1 day)

**What:** Turn `/plan/[id]` from a brief page into a dashboard/overview.

**Files to change:**
- Rewrite `src/app/plan/[id]/page.tsx` as overview with hub cards
- Move brief content to `/plan/[id]/strategy/brief/page.tsx`
- Add status badges and suggested next steps

### Phase 4 — Visual Polish (1-2 days)

**What:** Apply the refined color palette, typography system, and component standardization.

**Files to change:**
- `tailwind.config.ts` — add custom colors
- Create `src/styles/tokens.css` with CSS variables
- Standardize all cards, buttons, badges across pages
- Add AnimatedText component to landing hero

### Phase 5 — Progressive Generation (2-3 days, optional but valuable)

**What:** Instead of generating everything upfront, generate on-demand per hub.

**Files to change:**
- API route changes to support partial generation
- Hub pages get "Generate" buttons that trigger specific sections
- Plan overview shows generation status per section

### Priority Order

| Phase | Impact | Effort | Ship First? |
|-------|--------|--------|-------------|
| 1. Nav & Layout | 🔴 Critical | 1-2 days | ✅ Yes |
| 2. Unified Onboarding | 🟠 High | 1 day | ✅ Yes |
| 3. Plan Overview | 🟠 High | 1 day | ✅ Yes |
| 4. Visual Polish | 🟡 Medium | 1-2 days | After 1-3 |
| 5. Progressive Gen | 🟡 Medium | 2-3 days | Later |

### Component Library Recommendation

**Add shadcn/ui.** Reasons:
- Built on Radix primitives (accessible, composable)
- Tailwind-native (no style conflicts)
- Copy-paste model (no dependency lock-in)
- Provides: Button, Badge, Sheet, Collapsible, Dialog, Dropdown, Tooltip — all needed
- The codebase already uses Tailwind patterns that align perfectly

**Don't add:** Full component libraries like Chakra, Mantine, or Material UI. Too heavy, wrong aesthetic.

### Key Files to Create

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── collapsible.tsx
│   │   └── sheet.tsx
│   ├── PlanSidebar.tsx        # NEW — replaces PlanNav.tsx
│   ├── GenerationOverlay.tsx  # NEW — unified generation flow
│   ├── HubCard.tsx            # NEW — for plan overview
│   ├── SectionCard.tsx        # NEW — for hub pages
│   ├── StatCard.tsx           # NEW — metrics display
│   ├── AnimatedText.tsx       # NEW — rotating text for hero
│   └── StatusBadge.tsx        # NEW — generated/pending/empty
├── app/
│   ├── plan/
│   │   └── [id]/
│   │       ├── layout.tsx     # NEW — sidebar layout
│   │       ├── page.tsx       # REWRITE — overview dashboard
│   │       ├── strategy/
│   │       │   ├── page.tsx   # NEW — strategy hub
│   │       │   ├── brief/page.tsx    # MOVED from /plan/[id]
│   │       │   ├── foundation/page.tsx
│   │       │   └── competitors/page.tsx
│   │       ├── content/
│   │       │   ├── page.tsx   # NEW — content hub
│   │       │   ├── draft/page.tsx
│   │       │   ├── emails/page.tsx
│   │       │   ├── templates/page.tsx
│   │       │   └── translate/page.tsx
│   │       ├── distribution/
│   │       │   ├── page.tsx   # NEW — distribution hub
│   │       │   ├── social/page.tsx
│   │       │   ├── schedule/page.tsx
│   │       │   └── calendar/page.tsx
│   │       ├── seo/
│   │       │   ├── page.tsx   # NEW — SEO hub
│   │       │   ├── keywords/page.tsx
│   │       │   ├── serp/page.tsx
│   │       │   └── variants/page.tsx
│   │       └── export/
│   │           ├── page.tsx   # NEW — export hub
│   │           ├── assets/page.tsx
│   │           └── preview/page.tsx
│   └── wizard/                # DELETE this directory
```

### Pages to Remove

- `/wizard` — redundant, confusing second path
- `/plan/[id]/overview` — merged into `/plan/[id]` (the root)
- `/plan/[id]/reviews` — low value, remove for now
- `/plan/[id]/approvals` — premature for current stage
- `/plan/[id]/digest` — premature for current stage
- `/plan/[id]/distribute` — merged into distribution hub

That takes the page count from **20 plan pages** down to **16** (6 hubs + 10 section pages), but the user only sees **6 top-level items** in the sidebar.

---

## Summary

The core problem is **navigation overwhelm**: 20 flat tabs presented equally to a user who just generated their first plan. The fix is:

1. **Group 20 tabs into 6 hubs** with a collapsible sidebar
2. **Kill the wizard** — one entry path, smart defaults
3. **Add a plan overview** that guides users to value
4. **Progressive disclosure** — generate on-demand, not all upfront

Ship Phase 1-3 first (3-4 days). Visual polish and progressive generation follow.
