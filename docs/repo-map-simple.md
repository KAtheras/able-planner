# ABLE Planner Repo Map (Plain English)

This is the short version of the codebase.

## 1) If You Want To Change...

### A) Inputs screen fields/buttons/layout
- `src/components/inputs/DemographicsForm.tsx`
- `src/components/inputs/AccountActivityForm.tsx`
- `src/features/planner/content/InputsLeftPane.tsx`

### B) Right-side messages on input screens
- Screen 1 panel container:
  - `src/features/planner/content/InputsRightPane.tsx`
- Screen 2 message cards:
  - `src/components/inputs/Screen2MessagesPanel.tsx`
  - `src/components/inputs/Screen2WtaPanel.tsx`
  - `src/components/inputs/QualifiedWithdrawalsBudgetPanel.tsx`

### C) Charts / report tabs
- `src/features/planner/content/ReportsSection.tsx`
- `src/components/reports/SummaryView.tsx`
- `src/components/reports/ChartsPanel.tsx`
- `src/components/reports/AbleVsTaxablePanel.tsx`

### D) Amortization schedule/table
- `src/features/planner/content/ScheduleSection.tsx`
- `src/components/schedule/ScheduleView.tsx`
- `src/components/schedule/AmortizationScheduleTable.tsx`
- Calculation source behind it:
  - `src/lib/amortization.ts`
  - `src/lib/calc/usePlannerSchedule.ts`

### E) Copy/text/translations
- Default English/Spanish:
  - `src/copy/en.json`
  - `src/copy/es.json`
- Client overrides (state-specific):
  - `src/config/clients/default.json`
  - `src/config/clients/ut.json`
  - `src/config/clients/il.json`
  - `src/config/clients/tx.json`

### F) Rules (limits, brackets, thresholds)
- `src/config/rules/*.json`

## 2) Main Orchestrator

- `app/page.tsx`
  - Holds top-level state and wires all sections together.
  - If behavior feels “global,” it is usually here.

## 3) Core Math Path (Most Important)

1. Inputs are collected in `app/page.tsx`
2. Schedule is built by `src/lib/calc/usePlannerSchedule.ts`
3. Month-by-month math runs in `src/lib/amortization.ts`
4. Messages are derived in `src/lib/planner/messages.ts`
5. Reports consume schedule/report rows from:
   - `src/features/planner/report/reportRows.ts`
   - `src/features/planner/report/scheduleModel.ts`

## 4) Navigation / Flow Control

- Sidebar + top nav:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/TopNav.tsx`
- Mobile next/back rules:
  - `src/features/planner/navigation/mobileNavModel.ts`

## 5) Where Not To Start (Usually)

- `docs/repo-dependencies.md` is reference-level detail.
- Start with this file, then open only the 2-4 files related to your exact task.

## 6) Safe Editing Workflow

1. Change the smallest possible file set.
2. Run `npm run lint`.
3. Test only the user flow you changed.
4. Commit one concern at a time.

