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

## Session Log
### 2026-02-15
- Created persistent session notes file.
- Added template/process for session start/end context syncing.
- Completed GitHub + Netlify setup for current branch-based deploy workflow.
- Resolved Netlify TypeScript build blockers and publish-directory configuration issues.
- Added IL/EN/ES content updates and then migrated key right-card guidance into infotips.
- Implemented planner console redesign and multiple mobile UX refinements.
