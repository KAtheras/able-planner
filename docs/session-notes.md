# Session Notes

Use this file to preserve working context between editor sessions.

## How To Use
- At the start of a new session, ask: `Read docs/session-notes.md first`.
- At the end of a session, ask: `Update docs/session-notes.md`.

## Active Project Context
- App: ABLE Planner (Next.js), bilingual (`en`/`es`), mobile-first.
- Architecture intent: UI copy in `src/copy/en.json` and `src/copy/es.json`; client/state-configurable copy in `src/config/clients/*.json`.
- Deploy target: GitHub + Netlify.
- Current working branch: `refactor/extract-calc`.

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

## Deploy Notes
- Netlify branch currently used: `refactor/extract-calc`.
- If Netlify errors with publish/base conflict, verify publish directory setting in Netlify UI.
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
