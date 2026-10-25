# Code Quality Standards and Architecture

This document outlines the code quality, engineering standards, and maintainability practices enforced across **Utsav AI**.

---

## 1. Architectural Principles

Utsav AI is built around a **strict layered separation of concerns**:

1. **Deterministic Core Engines (`lib/engine/`)**
   - Pure, stateless TypeScript functions with zero external dependencies and zero side effects.
   - Algorithms (such as the largest-remainder budget allocation and backwards-scheduled timeline) are 100% deterministic, guaranteeing exact rupee totals and reproducible calculations regardless of runtime environment.
   - 100% covered by automated unit tests.

2. **Server-Side AI Boundary (`lib/ai/`)**
   - Isolates all external LLM (Google Gemini) operations to backend route handlers.
   - Untrusted user input is serialized as strict JSON data payload within boundary tags (`<untrusted_user_text>`), eliminating prompt-injection risks.
   - All AI responses are validated at runtime against strict Zod schemas before entering the domain layer.
   - In-memory SHA-256 seed caching avoids redundant model invocations.
   - Graceful fallback: If the AI provider is offline, unconfigured, or rate-limited, the system falls back to curated deterministic templates without throwing unhandled exceptions.

3. **HTTP & Edge Protection Layer (`lib/api/`)**
   - Enforces a 16 KB maximum body size to mitigate payload flooding.
   - Rate limiting (12 req/min) with proxy awareness (`VERCEL=1` or `TRUST_PROXY=true`).
   - Standardized JSON responses with strict security headers (`nosniff`, `no-store`).

4. **UI Presentation & State Orchestration (`components/` & `hooks/`)**
   - Components are purely presentational shells. All state orchestration, timers, abort controllers, and persistence logic are encapsulated inside dedicated React hooks (`usePlanningWorkspace`, `useExtraction`, `useIdeas`, `useVendorMessages`, `usePlanPersistence`).
   - Responsive, semantic HTML adhering to WCAG AA accessibility standards.

---

## 2. Type Safety & TypeScript Strictness

The project runs under TypeScript 5 in strict mode with enhanced compiler checks:

- `"strict": true` (Strict null checks, strict function types, strict bind/call/apply).
- `"noUnusedLocals": true` (No dead variable definitions).
- `"noUnusedParameters": true` (No dead function arguments).
- **Zero `any`:** All domain models and API contracts use strictly typed interfaces and Zod-inferred types.
- **Immutable State Transitions:** Complex state updates in hooks use pure, copy-on-write updater patterns to eliminate state mutation bugs.

---

## 3. Code Style & Linting

Code formatting and style are strictly automated and verified in CI:

- **ESLint 9 Flat Config:** Enforces Next.js Core Web Vitals, TypeScript ESLint rules, and `jsx-a11y` recommended rules.
- **Prettier:** Codebase-wide consistent indentation, line wrapping (100 columns), trailing commas, and quote consistency.
- **Zero Dead Code:** Verified clean imports and zero unreferenced exports.

---

## 4. Error Handling & Observability

- **Boundary Isolation:** API failures, network dropouts, and JSON parsing errors are caught and transformed into user-friendly localized messages without leaking stack traces or internal implementation details.
- **Serverless Logging:** Model errors log descriptive diagnostic warnings on the server in non-test environments (`console.warn`), ensuring operational visibility in Vercel function logs while shielding users from technical failure states.
- **Abortable Operations:** In-flight network requests use `AbortController` with internal timeouts (20s) to cancel pending operations upon unmount or re-submission.

---

## 5. Automated Verification

Every commit is validated via GitHub Actions CI:

1. `npm run lint` (ESLint 9)
2. `npm run typecheck` (`tsc --noEmit`)
3. `npm run format:check` (Prettier)
4. `npm run test:coverage` (Vitest with strict global coverage thresholds)
5. `npm run build` (Next.js production build verification)
