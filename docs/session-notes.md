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
- IL client override copy added in both English and Spanish for `rightCardPrimary`.

## Open Follow-Ups
- Consider strict copy architecture cleanup:
- Remove hardcoded UI fallback strings where JSON keys exist.
- Keep only non-UI/system constants in code.
- Consider adding focused tests for taxable depletion-year tax posting behavior.

## Deploy Notes
- Netlify branch currently used: `refactor/extract-calc`.
- If Netlify errors with publish/base conflict, verify publish directory setting in Netlify UI.
- Latest known push included:
- Scroll reset on view changes (`app/page.tsx`).
- Select size normalization for demographics dropdowns (`src/components/inputs/DemographicsForm.tsx`).

## Session Log
### 2026-02-15
- Created persistent session notes file.
- Added template/process for session start/end context syncing.
