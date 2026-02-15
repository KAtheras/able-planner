# ABLE Planner

A secure, accessible, bilingual ABLE planning application.

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

## Development
npm install
npm run dev
