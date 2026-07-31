# CIMA AI — Pricing & Subscription Model

## Grounding

- **Product surface**: Dashboard, Research (semantic search + AI synthesis), Cases/Matters, Documents (upload/storage), Legal Library (Ghana case law/legislation, expanding beyond), AI Assistant (chat), Drafting Studio (document generation), Document Review/Contract Review (AI risk analysis), Authority Tagging (`@` mentions for strict-grounding), and a first-time-user guided tour.
- **Cost driver**: nearly every high-value action (Research, AI Assistant, Drafting, Review) calls a DeepSeek LLM at minimum; several also call HuggingFace (embeddings), Tavily (web search), CourtListener, or Laws.Africa. DeepSeek is cheap relative to GPT-4-class models — marginal cost per AI action is real but low. This means the product can afford a genuinely useful free tier, but usage still needs metering to prevent abuse and to create a natural upgrade path.
- **Customer signal**: individual-practitioner signup only today (no firm/seat concept), spanning a wide willingness-to-pay range — law students and researchers (low/no budget) alongside practicing lawyers, arbitrators, and in-house counsel (real budget, already paying for Ghana law report subscriptions and legal research tools, so there's established willingness to pay for exactly this).
- **Market**: positioned for Ghana/West Africa arbitration practice specifically (Ghana ADR Act 2010, ICC, UNCITRAL, LCIA, New York Convention), with the Legal Library explicitly built to expand beyond Ghana. Pricing needs to reflect local purchasing power, not US legal-tech pricing (which routinely runs $100–500+/seat/month) — that would price out the actual target market.

## Recommended model: Freemium → Professional subscription, with a Firm tier as the next growth phase

**Why freemium over pure trial-only.** The Legal Library (case law/legislation browsing) is a strong, low-marginal-cost acquisition hook — every free user browsing it is a distribution and word-of-mouth asset in a market where Ghanaian case law access itself is a paid pain point today. A perpetual (capped) free tier converts law students into paying alumni lawyers over time and keeps the product visible even to non-payers. Layer a **14-day full-Professional trial on top of Free at signup** (auto-downgrading to Free tier limits after) so every new user experiences the complete product once — this pairs directly with the guided tour, which should end by mentioning the trial.

**Why metered "AI actions" rather than per-feature limits.** Five different features hit the same cost driver (LLM calls, sometimes plus embeddings or search). A single unified credit system is far easier to communicate than five separate caps — "340 of 500 AI actions used" is clear; "12 research queries but only 3 reviews left" is not. Suggested weighting:

| Action | Credits |
|---|---|
| Research query | 1 |
| AI Assistant message | 1 |
| Case Brief / Citator run | 1 |
| Drafting Studio generation | 2 |
| Document Review (full analysis) | 3 |

Case/matter management, document storage/browsing, and Legal Library browsing are **not** metered — they're cheap (database/storage only) and are exactly what should feel unlimited, to build trust in the free tier.

## Tiers

### Free (Starter) — $0, forever
- 20 AI actions/month (fair-use, resets monthly)
- 1 active case/matter, 25 documents / 250MB storage
- Full Legal Library browsing, unmetered — the acquisition hook
- No Authority Tagging (`@` playbook grounding), no export to Word/PDF, community/email support only
- **Target**: law students, researchers, evaluators, and the top of the funnel

### Professional — the core paid tier, individual practitioners
- Illustrative price: **$39/month, or $390/year** (2 months free on annual billing — standard ~17% discount)
- **Regional pricing**: a Ghana/West-Africa local rate around **$25/month equivalent in GHS**, with the full $39–49 for diaspora/international users. Purchasing-power-adjusted geographic pricing is standard practice here and materially affects local adoption.
- 500 AI actions/month soft cap — rate-limited/throttled near the edge rather than hard-blocked mid-task, to protect margin without a jarring paywall experience — plus **pay-as-you-go top-up packs** (e.g. +100 actions for a small add-on fee) for the rare power-user overage, instead of forcing an immediate tier jump
- Unlimited cases/matters, 5GB document storage
- Full Drafting Studio including export, full Document Review, Authority Tagging/playbook grounding, Case Citator, Case Briefs
- Priority support
- **Target**: solo practitioners and small-firm lawyers — the primary revenue tier

### Firm/Team — roadmap (requires an org/seat model that doesn't exist yet)
- Per-seat pricing, e.g. **$29–35/seat/month**, with volume discounts at 5+ and 10+ seats, or a flat firm bundle
- The standout firm feature already has its foundation built: **shared playbooks** — a firm's tagged authorities/standards become a firm-wide Document Review baseline instead of a per-lawyer setting. Also: centralized billing, shared case workspaces, and an admin usage dashboard (an `/admin` route already exists as a stub to build this into)
- This is the real revenue growth lever in legal tech, since firms outspend solo practitioners by a wide margin — the next major product investment after Professional ships, not a v1 requirement

### Enterprise/Institutional — roadmap, custom pricing
- Larger firms, corporate legal departments, chambers, law schools (bulk student licensing), judiciary/government bodies
- Custom pricing, SSO, dedicated support, and — directly enabled by the jurisdiction-aware ingestion scripts already built — **private/custom Legal Library ingestion**, so a firm's own internal precedent library can be ingested and scoped to just that organization

## Open questions to validate before implementation

- Actual DeepSeek/HuggingFace/Tavily per-action cost at current usage volume, to sanity-check the 20/500 credit caps against real margin
- Willingness-to-pay validation with a handful of target users before locking the $25–49 range
- Whether GHS or USD should be the primary displayed currency at launch
