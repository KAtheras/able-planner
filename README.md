# ABLE Planner

A secure, accessible, bilingual ABLE planning application.

## CRITICAL ARCHITECTURE STATUS (READ FIRST)

The intended architecture is:
- UI hosted by client site.
- Calculations hosted server-side (Netlify/serverless API).

Current status (as of 2026-02-20):
- Core projection/report math is still being calculated client-side in `app/page.tsx`.
- `/api/calculate` exists (`app/api/calculate/route.ts`) but is not yet the full calculation source of truth for UI outputs.
- There is currently no UI `fetch("/api/calculate")` path driving reports/schedules.

Non-negotiable direction for next sessions:
- Move all calculation logic used for projections/reports/schedules to server-side API.
- Make UI consume API results only.
- Do not add new feature work that increases client-side math footprint.

## ACCESSIBILITY REQUIREMENT (MANDATORY)

All new code and all code changes in this repository must be built and reviewed for accessibility compliance by default.

- Accessibility is a release-blocking requirement, not optional polish.
- UI work must include keyboard accessibility, semantic markup, proper labeling, and screen-reader support.
- Visual updates must maintain readable contrast and visible focus states.
- If a change cannot meet accessibility requirements immediately, do not ship it without an explicit follow-up and owner.

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Radix UI
- Netlify Serverless Functions (backend calculations)

## Docs
- Architecture & system design: docs/ARCHITECTURE.md
- Session handoff notes: docs/session-notes.md

## Session Workflow
- At session start, ask Codex: `Read README.md first`.
- When this instruction is used, Codex should also read `docs/session-notes.md` before making changes.
- At session end, ask Codex: `Update docs/session-notes.md`.
- Resume reminder: prioritize server-side calculation migration before additional feature work.

## Development
npm install
npm run dev
