# ABLE Planner Refactor Plan

Last updated: February 22, 2026

## 1) Goals

This plan reflects current business and technical priorities:

1. Move high-value/proprietary calculations to backend (`/api/calculate`) as authoritative source.
2. Keep UI responsive with debounced updates (planner console still updates as users edit inputs).
3. Reduce `app/page.tsx` safely, without creating excessive micro-files.
4. Support multi-client behavior through `clientId` and shared rules/config.
5. Keep deployment practical for WordPress client sites by preferring hosted UI (no iframe dependency).

## 2) Architecture Direction (Hybrid, Explicit)

### Server-side (authoritative)

Keep these on backend:

1. Core projection schedule math.
2. Tax computations and benefit calculations.
3. Rule/cap/default enforcement (plan limits, WTA/SSI behavior that affects outputs).
4. Client/state configuration application that affects computed outputs.

### Client-side (UI/orchestration)

Keep these on client:

1. Navigation and view state.
2. UI-only validation and formatting.
3. Non-authoritative display helpers.
4. Debounced request triggering and response lifecycle state.

## 3) API Traffic Strategy

### Required behavior

1. API calls happen only when calculation-driving inputs change.
2. Screen/tab toggles do not call API.
3. Latest successful API response is reused while navigating reports/schedule/resources.

### Caching stance

1. Start with no server-side cache.
2. Revisit caching only if observed latency/cost justifies added complexity.

## 4) API Contract Policy

Contract must exist in both code and docs:

1. Code source of truth:
   - shared TypeScript request/response types in repo
   - API route and UI client both consume same types
2. Human docs:
   - endpoint purpose
   - request fields and constraints
   - response payload sections
   - error model
   - trigger semantics (when UI calls API vs not)

## 5) Target File Structure (Non-Micro)

Add/reshape around these focused modules:

1. `src/features/planner/page/usePlannerPageState.ts`
2. `src/features/planner/page/usePlannerRules.ts`
3. `src/features/planner/page/usePlannerNavigation.ts`
4. `src/features/planner/page/usePlannerProjectionData.ts`
5. `src/features/planner/page/plannerFormHandlers.ts`
6. `src/features/planner/page/PlannerContentRouter.tsx`
7. `src/features/planner/content/ResourcesSection.tsx`
8. `src/features/planner/api/contracts.ts`
9. `src/features/planner/api/client.ts`
10. `src/features/planner/server/calculatePlannerProjection.ts`

Note: this is intentionally limited to avoid helper-file sprawl.

## 6) Phased Execution Plan

## Phase 0: Safety Baseline

Scope:
1. Lock current behavior with a scenario checklist (manual + lightweight test harness where feasible).
2. Identify expected outputs for representative scenarios (normal, edge, WTA/SSI, reports/schedule).

Done when:
1. Team can compare post-refactor output against baseline quickly.

## Phase 1: Structural Refactor Only (No Behavior Changes)

Scope:
1. Extract pure helpers and form change handlers out of `app/page.tsx`.
2. Extract resources section into dedicated component.
3. Extract navigation handlers into `usePlannerNavigation`.

Done when:
1. `app/page.tsx` size reduced materially.
2. Lint/build pass.
3. Baseline scenarios unchanged.

## Phase 2: Consolidate Client Orchestration

Scope:
1. Introduce `PlannerContentRouter` for active view routing.
2. Centralize rule/effect logic into `usePlannerRules`.
3. Keep existing local calc behavior temporarily for parity safety.

Done when:
1. `app/page.tsx` is primarily top-level wiring.
2. Existing UI behavior remains unchanged.

## Phase 3: API Contract + Client Adapter

Scope:
1. Create shared contract types (`contracts.ts`).
2. Add API client wrapper (`api/client.ts`).
3. Introduce `usePlannerProjectionData` hook that exposes computed model to UI.

Done when:
1. UI has one projection-data interface (adapter), even if still backed by local calc initially.

## Phase 4: Server Source of Truth

Scope:
1. Implement `calculatePlannerProjection.ts` server module.
2. Expand `/api/calculate` to return authoritative schedule/report payloads needed by UI.
3. Ensure client-specific logic driven by `clientId` is applied server-side.

Done when:
1. Backend can produce all authoritative computed outputs currently derived in UI.

## Phase 5: Flip UI to API Results

Scope:
1. `usePlannerProjectionData` calls API on debounced input changes.
2. Add stale-request protection (`AbortController` / latest-response guard).
3. Keep previous values during in-flight requests to preserve UX continuity.

Done when:
1. Planner console/report/schedule update from API results.
2. No API calls on tab/view-only transitions.

## Phase 6: Cleanup + Deployment Readiness

Scope:
1. Remove redundant client-side authoritative calc paths.
2. Clean dead effects/legacy paths.
3. Prepare deployment notes for client-hosted UI + Netlify API split.
4. Add CORS allowlist strategy for multiple client origins (only needed for cross-origin deployments).

Done when:
1. `app/page.tsx` is orchestration-focused.
2. Migration is documented and repeatable.
3. Simulated client deployment checklist is complete.

## 7) Session Estimate

Expected:
1. 6 to 7 sessions total for safe completion.

Breakdown:
1. Phase 0-2: 2 to 3 sessions.
2. Phase 3-5: 3 sessions.
3. Phase 6: 1 session.

Risk factors that can add sessions:
1. Parity issues in tax/WTA/SSI edge cases.
2. API response shape changes requiring UI adjustments.
3. CORS/deployment setup variance across client environments.

## 8) Operational Decisions Locked (Current)

1. Preserve ability to support both hosted-UI and iframe modes in one repo, but prioritize hosted UI for WordPress simulation.
2. API calls are input-driven, not view-driven.
3. No cache in initial rollout.
4. If later needed, caching must include strict invalidation/version discipline.

## 9) Per-PR Guardrails

Every PR in this plan should:

1. Keep scope narrow to one phase slice.
2. Include lint pass.
3. Include parity checks for touched flows.
4. Avoid adding new client-side authoritative calculation logic.
5. Update `docs/session-notes.md` with progress and next immediate step.
