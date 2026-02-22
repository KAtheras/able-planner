# Session Notes

Use this file to preserve working context between editor sessions.

## How To Use
- At the start of a new session, ask: `Read docs/session-notes.md first`.
- For refactor/migration sessions, also read: `docs/refactor-plan.md`.
- At the end of a session, ask: `Update docs/session-notes.md`.

## Active Project Context
- App: ABLE Planner (Next.js), bilingual (`en`/`es`), mobile-first.
- Architecture intent: UI copy in `src/copy/en.json` and `src/copy/es.json`; client/state-configurable copy in `src/config/clients/*.json`.
- Deploy target: GitHub + Netlify.
- Current working branch: `refactor/extract-calc`.

## CRITICAL ALERT (2026-02-20)
- Intended architecture requires server-side calculations (Netlify/serverless) with client-hosted UI.
- Current implementation has architecture drift:
- Core projection/report math is still running client-side in `app/page.tsx` (for example, `buildPlannerSchedule(...)` usage).
- UI does not currently call `/api/calculate` for core schedule/report outputs.
- `app/api/calculate/route.ts` exists, but does not yet provide full projection/report payload parity with UI.

### Mandatory Next-Session Priority
- Stop adding new features that expand client-side math.
- Migrate projection/report/schedule calculations to server-side API as source of truth.
- Refactor UI to consume API responses for computed outputs.
- Preserve behavior parity while migrating (SSI/WTA/report outputs must remain consistent).

## Recent Decisions
- Keep icon-based sidebar (SVG/components), not PNG files.
- Mobile schedule header order updated for narrow mode.
- Mobile content bottom padding added to avoid overlap with fixed bottom nav.
- Taxable amortization fix: depletion-year taxes are posted in depletion month to avoid negative ending balances.
- `AGI` user-facing terminology updated to `Taxable Income` in shared copy.
- Added multiple demographics infotips with JSON-backed content (EN/ES): beneficiary, state, filing status, taxable income, annual return, SSI, FSC.
- Infotip behavior standardized: popup overlay, outside-click close, and mutual exclusivity.
- Infotip icon style currently set to outlined theme style (not filled).
- Planner right card redesigned as persistent `PLANNER CONSOLE` header + dynamic message body.
- Annual return warning in planner console now uses theme-tinted warning style.
- On mobile, FSC questionnaire is prioritized over annual return warning in planner console.
- Mobile input zoom prevention applied (inputs use `text-base` on mobile).
- Third-party license notice file now includes `@react-pdf/renderer` under MIT in `THIRD-PARTY-LICENSES.md`.
- Navigation simplified: removed standalone `Tax Benefits` sidebar item, renamed `Account Growth` nav to `Reports`.
- Report screens are now consolidated under `Reports` with internal tabs (`Account Growth`, `Tax Benefits`) and bilingual labels.
- Sidebar icon stack alignment on desktop is now measured dynamically against the right-column card top (runtime offset), not hardcoded padding.
- Mobile input action row (`Back`/`Next`/`Refresh`/language toggle) is sticky to keep primary controls visible while scrolling.
- Decision: treat top banner (`TopNav`) as host/client-site chrome; reverted banner-specific fixed-mobile anchoring changes.
- Dark-mode contrast refinements completed for select/dropdown controls, schedule toggle inactive states, and schedule balance text visibility.
- WTA earned-income input focus ring clipping fixed with inset focus ring treatment.
- Dropdowns now use explicit right-side chevron icons (SVG) instead of plain text arrow characters.

## Open Follow-Ups
- Consider strict copy architecture cleanup:
- Remove hardcoded UI fallback strings where JSON keys exist.
- Keep only non-UI/system constants in code.
- Consider adding focused tests for taxable depletion-year tax posting behavior.
- Consider adding client-level overrides for infotip/callout text (currently from `src/copy/*.json`).
- Re-test mobile console auto-scroll timing/offset and tune if needed.
- Continue `app/page.tsx` reduction in small safe slices:
- Extract remaining Inputs view orchestration (left form shell + right console shell) into dedicated components/hooks.
- Keep behavior and copy unchanged while extracting.
- **Next Priority:** Start `app/page.tsx` extraction/refactor immediately in the next session.
- Target first slices:
- Move mobile/desktop Back/Next navigation flow logic into a dedicated navigation module/hook.
- Move input-page top action/header orchestration into focused components.
- Keep behavior unchanged; run lint/build checks after each slice.

## Deploy Notes
- Netlify branch currently used: `refactor/extract-calc`.
- If Netlify errors with publish/base conflict, verify publish directory setting in Netlify UI.
- Current integration direction (post-iframe rollback):
- Prefer client-hosted UI as a standalone app URL (no WordPress iframe embedding) to avoid host-page CSS/height conflicts.
- If UI origin and Netlify API origin differ, `/api/calculate` must enforce CORS with an explicit allowed-origin list.
- CORS validation is per browser origin; client-specific calculation behavior remains driven by `clientId` in request payload.
- If UI and API are deployed on the same origin, CORS complexity is largely avoided.
- Latest known push included:
- Mobile console auto-scroll + return-to-input behavior (`app/page.tsx`) commit `d8647d7`.
- FSC unblocked vs annual return warning priority + mobile input zoom fix commit `ec8c52a`.
- Planner console/callout work committed in `c44b1fe` and `42d137b`.
- Additional recent pushes on `refactor/extract-calc`:
- `f6f2d31` fix dark mode dropdown contrast + add PDF renderer license file.
- `77b5355` consolidate reports nav + sidebar/content alignment.
- `23cd605` mobile top-nav anchoring experiment (later adjusted).
- `d1d3b68` kept sticky mobile input controls and reverted banner-specific anchoring.
- `700c025` dark-mode schedule toggle/balance contrast fix.
- `6ff2ad1` WTA earned-income focus ring clipping fix.
- `57fdacd` dark-mode input contrast + button hover readability fixes.
- `34b699c` consistent chevron icons for form dropdowns.

## Session Log
### 2026-02-18
- Additional fixes and copy/config updates completed (latest):
- Mobile scroll behavior updates:
- SSI high-income warning now has an `OK` dismiss action and mobile scroll-back behavior.
- Account Activity now auto-scrolls to make WTA prompt/test visible when contributions exceed limits.
- Qualified Withdrawals budget helper now scrolls into view when opened and scrolls back when closed (`OK`).
- WTA resolution behavior:
- During unresolved WTA (`initialPrompt` / `wtaQuestion`), projection inputs are clamped for calculations so over-limit contributions do not prematurely inflate report/schedule outputs.
- WTA dismiss (`OK`) now triggers mobile scroll-back to input area.
- State tax benefit fix:
- Utah credit calculation bug fixed: credit states with `amount <= 0` now treat this as no contribution cap (instead of zero qualifying contribution), still capped by state tax liability.
- Validation run confirmed this specific bug pattern affected UT only under current rules.
- Copy updates:
- Standardized user-facing terminology to `ABLE to Work` (EN/ES).
- Moved market-volatility sentence from Assumptions list to landing-page disclosures (EN/ES).
- Spanish copy synchronized with latest English assumption wording edits.
- Client override work in progress (local, not yet committed at this checkpoint):
- `IL` and `TX` `clientBlocks.disclosuresAssumptions` populated with full EN/ES assumptions text overrides.
- `DisclosuresView` updated to preserve override paragraph line breaks (`whitespace-pre-line`).

- Translation and mobile label consistency updates completed and pushed:
- Fixed report tab/header translation gaps across mobile and desktop (including `ABLE vs Gravable` on ES report tabs).
- Localized mobile bottom-nav short labels in ES (`Sig.` for next, `Tabla` for schedule, `Notas` for assumptions).
- Tightened mobile report header layout to keep report tabs + EN/ES toggle inside frame on narrow iPhone widths.
- Preserved report tab font sizing while tightening pill spacing to avoid clipping.
- Inputs required-field UX update:
- Added inline required guidance for `Taxable Income` and `Monthly Contribution`.
- Refined `Taxable Income` behavior to show inline `Required field*` when empty plus footnote:
- EN: `* Enter $0 if no income.`
- ES: `* Ingrese $0 si no tiene ingresos.`
- Adjusted asterisk styling (larger and lower) for better readability/alignment.

- Mobile and desktop UX refinements completed and pushed:
- Added mobile bottom-nav Back/Next flow controls and state transitions across Inputs -> Reports -> Amortization -> Assumptions.
- Added Material-style arrows to Back/Next controls and aligned icon/text stacking for mobile nav buttons.
- Moved mobile input refresh + EN/ES controls into sticky input card header rows.
- Updated desktop input top row to show page title on left with action controls on right.
- Added client-configurable report tab ordering support and verified ordering behavior from `features.reports.tabs`.
- Comparison report view updated to left table + right explanatory card layout.
- Report and schedule mobile tab labels shortened for better fit.
- Expanded assumptions content in EN/ES copy for the Notes/Assumptions view.
- Notes/Assumptions page layout updated: title + EN/ES row above card; card body scrollable.
- Multiple commits pushed to `refactor/extract-calc`; branch is current with remote.

- Confirmed next-session priority:
- `app/page.tsx` extraction/refactor is now the primary follow-up task.
- Refactor goal: reduce file size/responsibility without behavior changes.

### 2026-02-17
- Reports/navigation and mobile UX updates completed and pushed:
- Added client-configurable report tab visibility and ordering via `features.reports.tabs` in `src/config/clients/*.json`.
- Confirmed tab order now follows per-client JSON array order (not hardcoded order).
- Updated UT client report tabs to:
- `["able_vs_taxable", "tax_benefits", "taxable_growth"]`
- Comparison tab layout refactor:
- Left column now hosts ABLE vs Taxable table.
- Right column now hosts a wider explanatory text card (desktop two-column layout, mobile stacked).
- Report Window label removed from toggle UI (desktop and mobile); segmented control remains.
- Reports mobile sticky behavior added for tab/toggle row.
- Disclosures/Assumptions language toggle row made sticky on mobile.
- Chart refinements:
- Added explicit ABLE ending-balance line series to match taxable chart behavior.
- Removed chart point markers/dots for cleaner line-only charts.
- Chart display now truncates at first month where ending balance reaches zero.
- `**` footnote handling:
- Starting-balance footnote line now renders only when starting balance > 0.
- `Total Contributions**` marker in right summary card now appears only when starting balance > 0.
- Assumptions content expanded in both EN/ES:
- Updated `src/copy/en.json` and `src/copy/es.json` with detailed 28-item assumptions lists for left-nav Assumptions view.

- Next-session implementation plan (discussed, not implemented yet):
- Goal: mobile-only bottom-nav `Back`/`Next` buttons integrated into fixed bottom nav bar.
- Desktop behavior must remain unchanged.
- Mobile rule: remove/hide top `Back` and `Next` buttons.
- Mobile bottom-nav placement:
- `Back` button left of icon group.
- `Next` button right of icon group.
- Navigation behavior map:
- Demographics screen:
- Back disabled.
- Next -> Account Activity screen.
- Account Activity screen:
- Back -> Demographics.
- Next -> Reports page.
- Reports page:
- First report tab: Back -> Account Activity; Next -> next enabled report tab.
- Middle report tabs: Back/Next move between report tabs.
- Last report tab: Next -> Amortization page.
- Amortization page:
- ABLE mini-tab: Back -> Reports page; Next -> Taxable mini-tab.
- Taxable mini-tab: Back -> ABLE mini-tab; Next -> Assumptions page.
- Assumptions page:
- Back -> Amortization page.
- Next disabled.
- Estimated implementation impact:
- Mostly in `app/page.tsx` with a centralized mobile back/next state resolver.

### 2026-02-16 (Later Session)
- Reports/summary architecture and UX updates:
- Added new report tabs and views:
- `Summary` narrative tab (heading restored in centered card).
- `ABLE Account Growth` chart tab.
- `Taxable Account Growth` chart tab.
- `ABLE vs Taxable` comparison tab (new table-style panel).
- Removed `5Y` from report window selector options.
- Added `ABLE vs Taxable` comparison component:
- New file: `src/components/reports/AbleVsTaxablePanel.tsx`.
- Side-by-side components: starting balance, contributions, withdrawals, investment returns, taxable federal/state taxes, ending balances, ABLE FSC/state contribution tax benefits, ABLE total economic value.
- Taxable federal/state taxes shown as negative values in comparison.
- Taxable `Total Economic Value` row extended to show taxable ending balance for comparability.
- Zero-value ABLE benefit rows now show dash (`—`) instead of `$0`.
- Chart improvements (`src/components/reports/ChartsPanel.tsx`):
- Added taxable growth decomposition with smoothed tax drag display.
- Combined taxable federal/state drag into a single `Taxes on Earnings (Drag)` series and card value.
- Added ABLE and taxable footnotes with dynamic starting balance amount:
- `** Amount includes account starting balance of $X.`
- Tooltip improvements:
- ABLE tooltip now includes derived `ABLE Account Balance` and `Total Economic Value`.
- Reordered tooltip to place existing `Additional Economic Benefit` between those two values.
- Tooltip rows now render with right-aligned numeric values.
- UI polish:
- Left desktop sidebar icon-button corners reduced (less rounded).
- Summary and comparison report cards now match chart card corner radius (`rounded-xl`).
- Copy and wiring updates:
- Added new report labels/keys in `src/copy/en.json` and `src/copy/es.json` for the 4th tab and comparison panel labels.
- Updated report view unions/props in:
- `app/page.tsx`
- `src/components/reports/ReportsHeader.tsx`
- `src/components/reports/SummaryView.tsx`
- Commits pushed in this session:
- `c20fb8d` feat: refine reports charts and tighten page spacing
- `3ba06d7` feat: expand report charts with taxable growth and tooltip refinements
- `7463794` feat: add ABLE vs taxable panel and refine report views
- `2dd6938` chore: polish report card styling and comparison formatting
- Next-session plan (user confirmed):
- Clean up code further and reduce `app/page.tsx`.
- Eliminate any remaining hardcoded text in UI flow.
- Continue refactoring elements out of `app/page.tsx` in safe slices.
- Plan client implementation steps.
- Prepare repository for test deployment to simulated client website (using own website as test case).

### 2026-02-16
- Implemented/refined withdrawal capping and message behavior:
- First overdraw month now drains available balance (up to planned withdrawal), then ongoing months are limited by available funds.
- Removed duplicate/conflicting depletion vs withdrawal-limited messages and fixed placeholder replacement issues.
- Added guardrails for `Summary`/`Amortization` navigation:
- Require residency conflicts resolved.
- Require projection driver (`starting balance > 0` or `monthly contribution > 0`).
- Require taxable income field to be explicitly entered/valid (including `0`).
- Continued `app/page.tsx` extraction into reusable modules/components:
- `src/lib/report/exportScheduleCsv.ts`
- `src/lib/planner/messages.ts`
- `src/components/reports/ReportsHeader.tsx`
- `src/components/reports/SummaryView.tsx`
- `src/components/schedule/ScheduleHeader.tsx`
- `src/components/schedule/ScheduleView.tsx`
- `src/components/inputs/AccountEndingValueCard.tsx`
- `src/components/inputs/PlannerNoticeCard.tsx`
- `src/components/inputs/Screen2MessagesPanel.tsx`
- `src/components/inputs/Screen2WtaPanel.tsx`
- `src/components/inputs/ResidencyWarningCard.tsx`
- `src/components/inputs/DisclosuresView.tsx`
- Demographics right-column styling updates:
- FSC panel wrapped in card.
- WTA panel wrapped in card.
- WTA unselected buttons and earned-income field background set to white.
- Commits pushed in this batch:
- `3e918cc` refactor: extract report and schedule headers plus csv export helpers
- `dee8610` fix: align withdrawal capping and planner messaging
- `f0e8076` refactor: extract planner views and messaging components
- `d2c773d` fix: tighten projection gating and wta panel styling
- Current pause state:
- Branch: `refactor/extract-calc`
- Working tree is clean.
- Next reminder: continue shrinking `app/page.tsx` by extracting remaining Inputs page orchestration (container/layout state wiring only, no behavior changes).

### 2026-02-15
- Created persistent session notes file.
- Added template/process for session start/end context syncing.
- Completed GitHub + Netlify setup for current branch-based deploy workflow.
- Resolved Netlify TypeScript build blockers and publish-directory configuration issues.
- Added IL/EN/ES content updates and then migrated key right-card guidance into infotips.
- Implemented planner console redesign and multiple mobile UX refinements.
- Added third-party license documentation for `@react-pdf/renderer` (MIT).
- Refactored nav IA: `Reports` section now owns report tabs; removed separate `Tax Benefits` nav destination.
- Implemented deterministic desktop sidebar top alignment against right-column card position.
- Kept mobile action controls sticky; left top banner behavior aligned with host-site integration model.
- Completed multiple dark-mode QA fixes (dropdowns, schedule toggles/text, hover readability, focus-ring clipping).
- Added visible chevron indicators to form dropdowns for clearer affordance.

### 2026-02-22
- Continued safe `app/page.tsx` refactor on `refactor/extract-calc` with no behavior-change intent.
- Added projection-source gate for adapter boundary:
- `src/features/planner/page/usePlannerProjectionSource.ts`
- `app/page.tsx` now passes `projectionSource` into projection adapter path.
- Added projection boundary helper:
- `src/features/planner/page/usePlannerProjectionData.ts`
- `app/page.tsx` now uses `getPlannerProjectionData(...)` instead of direct adapter call.
- Validation:
- `npx eslint app/page.tsx src/features/planner/page/usePlannerProjectionSource.ts src/features/planner/page/usePlannerProjectionData.ts`
- Commits pushed:
- `a2d4bb1` refactor: wire projection source hook into planner page
- Next immediate slice:
- Convert projection boundary helper to async-ready adapter shape (still local-backed), then isolate debounced trigger orchestration from `app/page.tsx`.
- Additional extraction slice completed:
- Added `src/features/planner/page/plannerPageHelpers.ts` for `formatCurrency`, `resolveDefaultMessages`, and `getFederalSaverCreditPercent` (+ shared `FilingStatusOption` type).
- Removed those pure helper definitions from `app/page.tsx` and switched to imported helper usage.
- Debounce orchestration extraction:
- Added `src/features/planner/page/usePlannerDebouncedInputs.ts`.
- Moved all debounced calc input wiring out of `app/page.tsx` into the new hook (no behavior changes).
- Validation: `npx eslint app/page.tsx src/features/planner/page/usePlannerDebouncedInputs.ts`
- Projection-access extraction:
- Added `src/features/planner/page/plannerProjectionAccess.ts`.
- Moved projection gating/driver derivation (debounced balance+contribution parsing, AGI validity, projection-view access flag) out of `app/page.tsx`.
- Validation: `npx eslint app/page.tsx src/features/planner/page/plannerProjectionAccess.ts`
- Input parser/sanitizer extraction:
- Added `src/features/planner/page/plannerInputUtils.ts` with `sanitizeAgiInput`, `parsePercentStringToDecimal`, `formatDecimalToPercentString`, and `sanitizeAmountInput`.
- Removed duplicate inline definitions from `app/page.tsx` and switched to imports.
- Validation: `npx eslint app/page.tsx src/features/planner/page/plannerInputUtils.ts`
- Horizon config extraction:
- Added `src/features/planner/page/usePlannerHorizon.ts`.
- Moved `getTimeHorizonLimits` and `getHorizonConfig` out of `app/page.tsx` into a dedicated hook (no behavior changes).
- Validation: `npx eslint app/page.tsx src/features/planner/page/usePlannerHorizon.ts`
- Sidebar navigation guard extraction:
- Added `src/features/planner/page/plannerSidebarNavigation.ts`.
- Moved projection-view access routing decision out of `app/page.tsx` (`handleSidebarChange` now delegates to helper).
- Validation: `npx eslint app/page.tsx src/features/planner/page/plannerSidebarNavigation.ts`
- External-link warning extraction:
- Added `src/features/planner/page/useExternalLinkWarning.ts`.
- Moved `pendingExternalUrl` state and open/cancel/confirm handlers out of `app/page.tsx` into dedicated hook.
- Validation: `npx eslint app/page.tsx src/features/planner/page/useExternalLinkWarning.ts`
- SSI income warning extraction:
- Added `src/features/planner/page/plannerSsiIncomeWarning.ts`.
- Moved SSI warning gating derivation out of `app/page.tsx` (`showSsiIncomeEligibilityWarning`, `showSsiSelectionPlannerMessage`).
- Validation: `npx eslint app/page.tsx src/features/planner/page/plannerSsiIncomeWarning.ts`
- Landing copy resolution extraction:
- Added `src/features/planner/page/plannerLandingCopy.ts`.
- Moved landing override merge logic (`hasLandingOverride`, legacy welcome fallback, terms paragraphs split) out of `app/page.tsx`.
- Validation: `npx eslint app/page.tsx src/features/planner/page/plannerLandingCopy.ts`
- Plan/residency derivation extraction:
- Added `src/features/planner/page/plannerPlanState.ts`.
- Moved plan-state resolution and residency blocking derivation out of `app/page.tsx`.
- Validation: `npx eslint app/page.tsx src/features/planner/page/plannerPlanState.ts`
