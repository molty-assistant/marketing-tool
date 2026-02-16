# BACKLOG — Marketing Tool

> **Agents:** When you finish your task, pick the next unassigned task from this list.
> Claim it by opening a feature branch and starting work. One task per agent.

| ID | Priority | Task | Description |
|-----|----------|------|-------------|
| BL-022 | 🔺 high | Client onboarding wizard — guided multi-step flow | Replace or enhance the existing orchestrator with a polished onboarding: Step 1: paste URL or search App Store. Step 2:  |
| BL-027 | 🔺 high | Import from Play Store — Android app scraping | Extend scrape endpoint to handle Google Play Store URLs. Parse play.google.com/store/apps pages for name, description, s |
| BL-019 | 🔸 medium | Competitor comparison table — side-by-side UI | Page showing the plan's app vs competitors in a comparison table. Pricing, features, ratings, App Store rank. Data from  |
| BL-023 | 🔸 medium | Plan comparison — compare two plans side by side | Page at /compare?a=planId1&b=planId2. Show two plans' briefs, copy, keywords, positioning side by side. Useful for befor |
| BL-026 | 🔸 medium | Rate limiting + usage tracking | Track API calls per plan per day. Show usage on dashboard. Prevent abuse with rate limits (e.g. 10 generations per plan  |
| BL-008 | 🔹 low | Template editing UI — let users customize copy templates | Page at /templates where users can view/edit the prompt templates used for generation. Save custom templates per plan. |
| BL-015 | 🔹 low | Prompt engineering UI — expose and tune AI prompts | Admin page showing all Gemini prompts used in generation. Let user tweak system prompts, temperature, max tokens per end |
| BL-020 | 🔹 low | Plan analytics — generation stats dashboard | Dashboard showing: plans created, most-used features, generation times, popular categories. Simple charts with Tailwind, |
| BL-024 | 🔹 low | Dark mode support | Add dark mode toggle. Use Tailwind dark: classes. Persist preference in localStorage. |
| BL-025 | 🔹 low | Notification system — toast + email digests | When generation completes, show browser notification. Optional email digest of all generated content (using plan's email |

## How to claim
1. Pick a task
2. Create branch `feature/<short-name>`
3. Build it
4. Run `npm run build` to verify
5. Push + open PR (do NOT merge)
6. Review another open PR
7. Come back here and pick the next task
