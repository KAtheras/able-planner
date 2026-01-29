ABLE Planner – Project Definition & Architecture

1. Purpose & Vision

Build a modern, accessible, bilingual ABLE planning application with:
	•	A secure calculation engine (Netlify serverless backend)
	•	A clean, modular UI (no monolithic page files)
	•	Client‑specific customization via structured JSON (themes, disclosures, rules)
	•	A foundation that scales across states, clients, and future products

This document defines the non‑negotiable architectural rules so the project is scaffolded correctly from day one.

⸻

2. Core Principles (Non‑Negotiable)

2.1 Accessibility (WCAG 2.1 AA minimum)
	•	Keyboard‑only navigation works everywhere
	•	Screen‑reader friendly (ARIA roles, labels, live regions)
	•	Visible focus states
	•	No color‑only meaning

Implementation choice
	•	Radix UI primitives for behavior + accessibility
	•	Styling layered on top (not baked into components)

⸻

2.2 Separation of Concerns

Layer	Responsibility
UI (Client)	Inputs, messaging, visualization, accessibility
API (Serverless)	All calculations, validation, eligibility
Config (JSON)	Client theming, rules, disclosures, copy

Rule: No financial logic lives in React components.

⸻

2.3 Multilingual / Localization First
	•	English + Spanish minimum
	•	No hard‑coded strings in components
	•	All user‑facing text must be addressable via keys

⸻

2.4 No Monolithic Files
	•	No massive page.tsx
	•	Inputs, messaging, reports live in dedicated components
	•	Each component owns one responsibility

⸻

3. High‑Level Architecture

/apps/web (Next.js UI)
/apps/api (Netlify functions)
/packages/config (JSON + types)
/packages/calc (pure calculation logic)


⸻

4. UI Architecture (Next.js)

4.1 Mobile-First Strategy (Canonical Experience)

This is a mobile-first build by design.
	•	Mobile is the canonical experience.
	•	Desktop is an enhanced layout, not a separate product.
	•	Every required action must be possible on mobile.
	•	Desktop may reveal more context simultaneously, but must not introduce new required logic.

Implications
	•	Logic (calculations, eligibility, messaging) is viewport-agnostic.
	•	Layout is viewport-specific.
	•	Mobile and desktop intentionally differ in layout and information density.

⸻

4.2 Tech Stack
	•	Next.js (App Router)
	•	React
	•	TypeScript (strict)
	•	Radix UI (accessibility & interaction primitives)
	•	Tailwind CSS (styling only)
	•	Lucide (or equivalent) icons

⸻

4.3 Layout Architecture (Mobile vs Desktop)

Layouts are explicit components:

src/layouts/
  MobilePlannerLayout.tsx
  DesktopPlannerLayout.tsx

Routing logic selects the layout:
	•	Mobile: single-column, guided flow
	•	Desktop: multi-column, persistent context

Example orchestration:
	•	Mobile: stacked cards, inline messages, drawers/accordions
	•	Desktop: left navigation, right insight panel, side-by-side visuals

⸻

4.4 UI Structure

src/
  app/
    page.tsx           // orchestration only
  layouts/
    MobilePlannerLayout.tsx
    DesktopPlannerLayout.tsx
  components/
    inputs/
      StepBasics.tsx
      StepContributions.tsx
    messaging/
      InlineMessages.tsx
      SidebarMessages.tsx
    reports/
      ReportSummary.tsx
      ReportComparison.tsx
      ReportSchedule.tsx
    navigation/
      TopNav.tsx
      SidebarNav.tsx

Rule: page.tsx wires layouts and components together — it does not contain UI logic.

⸻

4.2 UI Structure

src/
  app/
    page.tsx           // layout + orchestration ONLY
  components/
    inputs/
      StepBasics.tsx
      StepContributions.tsx
    reports/
      ReportSummary.tsx
      ReportComparison.tsx
      ReportSchedule.tsx
    messaging/
      SidebarMessages.tsx
    layout/
      Sidebar.tsx
      TopNav.tsx
  hooks/
  styles/

Rule: page.tsx wires components together — it does not contain UI logic.

⸻

5. Serverless Backend (Netlify)

5.1 Responsibilities
	•	Input validation
	•	Eligibility determination
	•	Contribution limits
	•	Tax benefit calculations
	•	Projection math

5.2 API Routes

Route	Purpose
POST /api/calculate	Main calculation endpoint
GET /api/disclosures/:clientId	Client‑specific disclosures

UI sends structured inputs, receives pure data.

⸻

6. Configuration via JSON (Critical)

All variability must live in JSON — not code.

6.1 Client Config Structure

config/clients/{clientId}.json

{
  "clientId": "default",
  "branding": {
    "theme": "default",
    "logo": "/logos/default.svg",
    "fonts": {
      "base": "Inter",
      "heading": "Inter"
    },
    "colors": {
      "primary": "#005fcc",
      "accent": "#22c55e",
      "danger": "#dc2626"
    }
  },
  "features": {
    "showFederalSaversCredit": true,
    "showStateTaxBenefits": true
  },
  "disclosures": {
    "footer": ["DISCLOSURE_KEY_1", "DISCLOSURE_KEY_2"]
  }
}


⸻

6.2 State Rules Config

config/states/{stateCode}.json

{
  "state": "UT",
  "maxAccountBalance": 529000,
  "annualContributionLimit": 18000,
  "stateTax": {
    "hasDeduction": true,
    "deductionRate": 0.05,
    "maxDeduction": 2000
  },
  "eligibility": {
    "ssiImpact": true,
    "medicaidImpact": true
  }
}


⸻

7. Copy & Localization

copy/
  en.json
  es.json

{
  "labels": {
    "beneficiary": "Beneficiary",
    "stateOfResidence": "State of residence"
  },
  "messages": {
    "residencyMismatch": "Your state of residence does not match the plan state"
  }
}

	•	Components reference keys, not strings
	•	Language selection swaps the entire dictionary

⸻

8. Theming System

Themes are implemented via CSS variables.

:root[data-theme="ut"] {
  --color-primary: #1e3a8a;
  --color-accent: #16a34a;
}

Themes:
	•	default
	•	UT
	•	IL
	•	TX

No Tailwind recompilation per theme.

⸻

9. Input Flow

Input Screens
	1.	Basics & Assumptions
	2.	Contributions & Withdrawals

Each step:
	•	Validates locally for UX
	•	Sends a structured payload to the API

Mobile Behavior
	•	One primary action per screen
	•	Inline validation and messaging
	•	Pickers use drawers or bottom sheets

Desktop Behavior
	•	Inputs may appear side-by-side
	•	Contextual help and summaries persist

⸻

10. Messaging & Contextual Feedback
	•	Messaging driven by rules + calculation output
	•	Messages are independent, prioritized components

Mobile
	•	Messages appear inline between cards
	•	Critical alerts use banners or callouts

Desktop
	•	Persistent right-hand message panel
	•	Messages can be browsed without blocking flow

⸻

11. Reports

Three reports:
	1.	Summary (cards + highlights)
	2.	ABLE vs Taxable Comparison
	3.	Detailed Schedule (table + optional charts)

Reports live under components/reports/

⸻

12. Testing Strategy

API Smoke Tests (Required)
	•	Minimal payload → /api/calculate
	•	Valid client → /api/disclosures/:clientId

Ensures backend never silently breaks.

⸻

13. Explicit Non‑Goals
	•	No logic in UI components
	•	No copy embedded in JSX
	•	No state‑specific rules hard‑coded
	•	No single file > ~300 lines

⸻

14. Outcome

This architecture ensures:
	•	Mobile-first correctness
	•	Desktop enhancement without logic divergence
	•	Clean separation of concerns
	•	Predictable growth
	•	Easy onboarding of new clients/states
	•	Maintainable codebase
	•	No repeat of the “giant page.tsx” failure

⸻

This document is the contract.
Any future code must conform to it.