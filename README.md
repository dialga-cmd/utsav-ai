# Utsav AI

[![CI](https://github.com/dialga-cmd/utsav-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/dialga-cmd/utsav-ai/actions/workflows/ci.yml)

A compact, GenAI-powered event-planning assistant for Indian families. Describe your wedding, birthday, or community celebration in plain language, and Utsav AI turns it into a practical, editable plan — an exact rupee budget, a back-planned timeline, a vendor checklist, and personalised ideas — that works even when the AI is offline.

To try it locally, see the [Setup](#setup) section below. The app also deploys to Vercel via the Vercel CLI; without a `GEMINI_API_KEY` the deterministic fallback path still produces a full plan.

---

## Chosen vertical

**Vertical:** Family Event & Cultural Celebration Planning (Weddings, Milestone Birthdays, and Community Celebrations in India).

### Persona

Utsav AI is built for Indian families planning a wedding, large birthday, or community celebration. The person using it is usually coordinating on behalf of several families at once — parents, siblings, cousins — and is juggling budgets across many line items while staying aware of what a Jaipur tent house or a Pune caterer actually costs. They want a working plan in under 30 seconds, not a marketing brochure.

The tool speaks their language: Indian digit grouping (`₹4,50,000`), city cost bands (metro / tier-2 / tier-3), ceremony vocabulary (haldi, mehendi, sangeet, pheras), and a warm but direct tone.

## Approach and logic

Utsav AI is a **hybrid deterministic + GenAI** system designed for 100% operational reliability:

| Layer                    | Technology                    | Role                                                                                                                                          |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deterministic engine** | Pure TypeScript (no AI calls) | Budget allocation, timeline back-planning, vendor checklists, and fallback ideas. Always available, always fast, always correct to the rupee. |
| **GenAI layer**          | Google Gemini (server-side)   | Free-text extraction, personalised idea refinement, and vendor message drafting. Used when `GEMINI_API_KEY` is set.                           |
| **Client**               | Next.js App Router + React 19 | Intake flow, plan workspace, editable tabs, localStorage persistence, print export.                                                           |
| **API**                  | Next.js route handlers        | `/api/extract`, `/api/ideas`, `/api/vendor-message` — each Zod-validated, rate-limited, and served with generic error messages.               |

When no API key is configured or the upstream AI service is unreachable, the GenAI layer gracefully falls back to deterministic parsers and curated idea templates, so the full plan still appears in under 30 seconds and the app remains fully functional.

## How the solution works

### Architecture and data flow

```
User free-text / form / demo
        │
        ▼
  /api/extract  (Zod-validated, rate-limited)
        │  ┌─ GEMINI_API_KEY set ──► Gemini prompt → JSON → Zod schema
        │  └─ no key / provider fail → deterministic fallback parser
        ▼
   ExtractedEvent (cityTier, foodPreference, multiDay inferred)
        │
        ▼
   createPlanSnapshot(brief)
   ├── buildBudget(brief)        ← largest-remainder allocation to the rupee
   ├── buildTimeline(brief)      ← back-planned tasks with urgency + compression
   ├── buildVendorChecklist(brief) ← category-based, no invented vendor names
   └── ideas: null (filled async)
        │
        ▼
   /api/ideas (async, abortable, short-lived cache)
   ├── GEMINI_API_KEY set ──► personalised ideas + savings
   └─ fallback ──► curated ideas from the same budget logic
        │
        ▼
   PlanView (four editable tabs, localStorage-persisted, print-ready)
   ├── BudgetPanel    ← planned/actual MoneyInputs, recompute on edit
   ├── TimelinePanel  ← task toggles, progress bar, urgency badges
   ├── VendorsPanel   ← status selects, quote inputs, AI-drafted enquiry
   └── IdeasPanel     ← theme, four idea groups, four refinements, savings
```

### Server-side AI

All Gemini calls are made server-side via `fetch` inside `lib/ai/provider.ts`. The API key is read from the `GEMINI_API_KEY` environment variable and is never sent to the browser. The model defaults to `gemini-3.5-flash` (from `DEFAULT_GEMINI_MODEL` in `lib/constants.ts`) and can be overridden with `GEMINI_MODEL`.

A short in-memory cache (`lib/ai/cache.ts`) keyed by a SHA-256 hash of the prompt and options avoids re-calling the provider for identical requests within a session. Responses are always passed through the Zod schemas in `lib/schemas/ai.ts` before being returned to the client, which itself re-validates them before use.

## Setup

### Prerequisites

- **Node.js** 22.x (tested on 22.23.4)
- **npm** 10.x

### Install

```bash
npm install
```

### Environment variables

Copy the example file and fill in your Gemini key (optional — the app works without it):

```bash
cp .env.example .env.local
# .env.local is gitignored; never commit it.
```

| Variable         | Required | Description                                                                                                           |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | No       | Enables AI extraction, personalised ideas, and vendor message drafts. Without it, the deterministic fallback is used. |
| `GEMINI_MODEL`   | No       | Model ID to use. Defaults to `gemini-3.5-flash`.                                                                      |

### Development

```bash
npm run dev
# → http://localhost:3000
```

### Production

```bash
npm run build
npm start
```

### Tests

```bash
npm test            # run once
npm run test:watch  # watch mode
```

### Lint and type-check

```bash
npm run lint
npm run typecheck
```

## Code Quality

Utsav AI enforces clean code, maintainability, and structural standards (see [docs/code-quality.md](docs/code-quality.md)):

- **Strict Layered Decoupling.** Pure deterministic mathematical engines (`lib/engine/`) are completely decoupled from UI components and external AI services.
- **Strict TypeScript.** Configured with `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, and zero `any` types across the entire codebase.
- **State & Presentation Separation.** View components are light presentational shells; state, timers, and abort controllers are isolated inside custom React hooks (`usePlanningWorkspace`, `useExtraction`, `useIdeas`, `useVendorMessages`, `usePlanPersistence`).
- **JSDoc Documentation.** Every exported function, data schema, and React component includes clear JSDoc annotations detailing parameters, return contracts, and edge-case behavior.
- **Predictable Error Boundaries.** Graceful fallback mechanisms prevent runtime crashes. Model failures in production log informative diagnostic warnings without interrupting the user workflow.
- **Automated Hygiene.** Enforced via ESLint 9, Prettier, and TypeScript compiler checks in CI.

## Security

- **Server-only API key.** `GEMINI_API_KEY` is read exclusively in Node route handlers. It is never exposed to the browser, client bundle, or source control.
- **Zod validation on every boundary.** All API request bodies, response payloads, and localStorage round-trips are validated with Zod schemas. Invalid data is rejected, not rendered.
- **Rate limiting.** Each API endpoint enforces a limit of 12 requests/minute using a fixed-window in-memory limiter. Forwarded-client headers (`x-forwarded-for`, `x-real-ip`) are only trusted when the app runs behind a trusted proxy: `TRUST_PROXY=true` (self-hosted behind nginx/HAProxy/Cloudflare/…) or `VERCEL=1` (set automatically by the Vercel platform, which overwrites these headers at its edge). When neither is set the limiter treats the headers as untrusted and all requests share a single per-route bucket, which is safe but means the limit is per instance rather than per client IP. See `.env.example` for details.
- **Request body cap.** All POST bodies are capped at 16 KB.
- **Generic error messages.** API errors never leak stack traces, key values, or provider details.
- **Security headers.** `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` are set in `next.config.ts`.
  - **CSP limitation:** `script-src` keeps `'unsafe-inline'` because the app is statically rendered and a nonce-based policy would force every page to dynamic rendering (losing CDN caching, edge ISR, and PPR). The remaining directives (`default-src 'self'`, `connect-src 'self'`, `style-src 'self' 'unsafe-inline'`, `object-src 'none'`, `frame-ancestors 'none'`) keep the surface tight, and there are no user-generated HTML, third-party scripts, or analytics to exploit the inline allowance. The app mitigates XSS elsewhere: all user content is rendered as plain text, Zod schemas reject non-JSON payloads at every boundary, and `no-store` is set on all API responses so cached bodies can never be replayed.
- **No `dangerouslySetInnerHTML`.** All user content is rendered as plain text or validated JSON.
- **localStorage isolation.** The plan is stored under a versioned key (`utsav-ai.plan.v1`). On load, the data is validated against the full plan schema; malformed data is removed, never rendered.
- **npm audit.** As of the current state, `npm audit` reports 0 vulnerabilities.

## Accessibility

- **Landmarks and skip link.** `<header>`, `<nav>`, `<main>`, and `<footer>` landmarks; a visible skip link at the top of the page.
- **Labels and `aria-describedby`.** Every input has an associated `<label>` and inline hints/errors referenced via `aria-describedby`.
- **ARIA tabs.** The plan sections use a proper `role="tablist"` / `role="tab"` / `role="tabpanel"` pattern with arrow-key, Home, and End navigation, `aria-selected` state, and a polite live region announcing tab changes.
- **Live regions.** Extraction status, idea refresh, vendor-draft loading, and save-status are all announced via `aria-live` regions.
- **Non-colour status cues.** Urgency, vendor status, and budget over-plan are conveyed with text labels in addition to colour.
- **Reduced motion.** All CSS animations and transitions are disabled under `@media (prefers-reduced-motion: reduce)`.
- **Keyboard support.** All interactive elements are keyboard-reachable with visible `:focus-visible` outlines.
- **Accessible print.** Hidden tab panels are force-displayed in print media; interactive controls are hidden; status text and values are visible so a printed plan is self-contained.
- **Contrast.** All text colours meet or exceed WCAG AA contrast against their backgrounds.

## Efficiency

- **Small client bundle.** No chart libraries, no icon sprite sheets, no client-side AI code. The browser only runs the React app and the Zod-validated API client.
- **Pure, memoised derivations.** Budget totals, task counts, and vendor counts are computed with `useMemo` (e.g. in `lib/plan.ts` and `components/plan/PlanView.tsx`) where appropriate.
- **Debounced persistence.** `usePlanPersistence` writes to localStorage 400 ms after the last edit, with a `pagehide`/`visibilitychange` flush so the final keystroke is never lost.
- **Abortable requests.** All AI fetches in the browser use `AbortController` with a 20-second internal timeout (see `lib/api/client.ts`), aborting the previous request when a new one starts.
- **Short AI cache.** Identical prompts are cached in memory for the session duration (see `lib/ai/cache.ts`).
- **`next/font`.** Fonts are self-hosted via `next/font/local` — no external CDN requests. The four self-hosted woff2 files total ~125 KB.
- **No large assets.** The app ships no images or audio. The brand mark is an inline SVG.

## Testing

What is covered:

- **Engines**: budget allocation (largest-remainder), timeline back-planning/compression/urgency, vendor checklist generation, date helpers.
- **Schemas**: Zod contracts for event/plan/AI with validation paths.
- **Routes**: API validation, rate limiting, security headers, body limits, generic error responses, and route-level behavior.
- **UI**: IntakePanel, PlanTabs, Budget/Timeline/Vendors/Ideas panels, PlanningWorkspace, and storage/persistence hooks.
- **Accessibility**: zero-violation axe checks on the landing page, each plan tab, and the vendor panel.
- **Integration**: free-text → extract → plan snapshot → persisted → reloaded, using a mocked provider.

Run with `npm test` (unit + UI) or `npm run test:coverage` (adds v8 coverage with thresholds).

Current totals: **286 tests across 46 files**, with v8 coverage at **96.7% statements / 96.7% lines / 85.8% branches / 98.8% functions** (thresholds: 88 lines/statements/functions, 83 branches — enforced by `vitest.config.mts`).

## Project structure

```
app/                # Next.js App Router (pages, layouts, API routes)
components/         # UI components (intake, plan, shared)
docs/               # Project docs (accessibility)
hooks/              # React hooks for state/side effects
lib/                # Core logic (engines, AI, API, schemas, storage)
public/             # Static assets (fonts, icons)
tests/              # Vitest + Testing Library tests
types/              # Shared TypeScript types
```

## Assumptions and limitations

- **Currency/defaults**: INR (₹) is the default; amounts are whole rupees. The largest-remainder method guarantees category allocations always sum exactly to the total.
- **Estimates only**: Budget/timelines/vendors are estimates, not real quotes. Vendor entries are category checklists, not invented vendor names or contact details. The app does not book vendors or process payments.
- **Dates**: The user plans for a **future** event date. Plans with a past date are flagged with a visible notice but remain viewable and printable.
- **Persistence**: `localStorage` only; the plan does not leave the browser unless explicitly printed or shared. Data is validated on load and malformed data is removed.
- **Offline/AI**: No API key → full deterministic plan with curated ideas and a visible "Built with the offline planner" notice.
- **City tiers**: The city-to-tier inference uses a small lookup of well-known Indian cities and defaults to tier-2 for all others.
- **Rate limiting**: In-memory rate limiting is per-instance (not globally distributed). Forwarded-client headers are trusted only when `TRUST_PROXY=true` (self-hosted behind a trusted proxy) or `VERCEL=1` (set automatically on the Vercel platform, whose edge rewrites the headers). Without either, all requests share a single bucket per route.

## Roadmap

- [ ] Hindi / regional-language toggle for intake and ideas
- [ ] Calendar sync (iCal export / Google Calendar)
- [ ] Voice input for free-text intake
- [ ] Multi-event support (compare two plans side-by-side)
- [ ] Screenshot / shareable-plan export (PDF via `print` is already available)
- [ ] Vendor recommendation data (curated, not AI-generated)

## Deployment

The project is configured for [Vercel](https://vercel.com). After authenticating the Vercel CLI:

```bash
npm i -g vercel
vercel login
vercel --prod
```

Set `GEMINI_API_KEY` in the Vercel project environment variables to enable the AI layer. The app deploys and works without it.
