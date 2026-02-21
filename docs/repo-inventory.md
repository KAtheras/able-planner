# Repository Inventory

Generated: `2026-02-20T21:59:17.289Z`

Total files inventoried: **92**

## File Count by Layer
| Layer | File Count |
|---|---:|
| app | 5 |
| components/inputs | 10 |
| components/layout | 3 |
| components/reports | 5 |
| components/schedule | 3 |
| config/clients | 5 |
| config/rules | 9 |
| copy | 3 |
| docs | 4 |
| features/actions | 1 |
| features/content | 8 |
| features/effects | 1 |
| features/inputs | 3 |
| features/navigation | 1 |
| features/report | 3 |
| features/tax | 1 |
| lib | 1 |
| lib/calc | 2 |
| lib/copy | 1 |
| lib/date | 1 |
| lib/hooks | 1 |
| lib/inputs | 1 |
| lib/planner | 1 |
| lib/report | 2 |
| public | 5 |
| root | 10 |
| scripts | 2 |

## Full Inventory
| Path | Layer | Purpose | Internal Deps | Used By |
|---|---|---|---:|---:|
| .gitignore | root | Repository file. | - | - |
| app/api/calculate/route.ts | app | API route for planner calculations. | 7 | 0 |
| app/favicon.ico | app | Next.js app entry/layout file. | - | - |
| app/globals.css | app | Global styles and theme variables. | - | - |
| app/layout.tsx | app | Global HTML layout wrapper. | 1 | 0 |
| app/page.tsx | app | Main planner page container and orchestration. | 41 | 0 |
| docs/ARCHITECTURE.md | docs | Project documentation. | - | - |
| docs/repo-dependencies.md | docs | Project documentation. | - | - |
| docs/repo-inventory.md | docs | Project documentation. | - | - |
| docs/session-notes.md | docs | Project documentation. | - | - |
| eslint.config.mjs | root | ESLint configuration. | 0 | 0 |
| next-env.d.ts | root | Repository file. | 0 | 0 |
| next.config.ts | root | Next.js runtime/build configuration. | 0 | 0 |
| package-lock.json | root | Dependency lockfile. | - | - |
| package.json | root | Node package manifest and scripts. | - | - |
| postcss.config.mjs | root | PostCSS/Tailwind processing configuration. | 0 | 0 |
| public/file.svg | public | Static public asset. | - | - |
| public/globe.svg | public | Static public asset. | - | - |
| public/next.svg | public | Static public asset. | - | - |
| public/vercel.svg | public | Static public asset. | - | - |
| public/window.svg | public | Static public asset. | - | - |
| README.md | root | Project setup and usage guide. | - | - |
| scripts/export-copy-csv.mjs | scripts | Developer tooling script. | 0 | 0 |
| scripts/generate-architecture-report.mjs | scripts | Developer tooling script. | 0 | 0 |
| src/components/inputs/AccountActivityForm.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/inputs/AccountEndingValueCard.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/inputs/DemographicsForm.tsx | components/inputs | Input-side UI component. | 1 | 1 |
| src/components/inputs/DisclosuresView.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/inputs/MobileFloatingEndingValue.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/inputs/PlannerNoticeCard.tsx | components/inputs | Input-side UI component. | 0 | 2 |
| src/components/inputs/QualifiedWithdrawalsBudgetPanel.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/inputs/ResidencyWarningCard.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/inputs/Screen2MessagesPanel.tsx | components/inputs | Input-side UI component. | 1 | 1 |
| src/components/inputs/Screen2WtaPanel.tsx | components/inputs | Input-side UI component. | 0 | 1 |
| src/components/layout/SettingsMenu.tsx | components/layout | Navigation/shell layout component. | 1 | 0 |
| src/components/layout/Sidebar.tsx | components/layout | Navigation/shell layout component. | 0 | 3 |
| src/components/layout/TopNav.tsx | components/layout | Navigation/shell layout component. | 0 | 2 |
| src/components/reports/AbleVsTaxablePanel.tsx | components/reports | Report-specific UI component. | 2 | 1 |
| src/components/reports/ChartsPanel.tsx | components/reports | Report-specific UI component. | 3 | 1 |
| src/components/reports/ReportsHeader.tsx | components/reports | Report-specific UI component. | 0 | 6 |
| src/components/reports/ReportWindowToggle.tsx | components/reports | Report-specific UI component. | 0 | 3 |
| src/components/reports/SummaryView.tsx | components/reports | Report-specific UI component. | 5 | 1 |
| src/components/schedule/AmortizationScheduleTable.tsx | components/schedule | Schedule view/table component. | 2 | 1 |
| src/components/schedule/ScheduleHeader.tsx | components/schedule | Schedule view/table component. | 0 | 1 |
| src/components/schedule/ScheduleView.tsx | components/schedule | Schedule view/table component. | 3 | 1 |
| src/config/clients/default.json | config/clients | Client-specific defaults/overrides JSON. | - | - |
| src/config/clients/il.json | config/clients | Client-specific defaults/overrides JSON. | - | - |
| src/config/clients/index.ts | config/clients | Loads client configuration by state/client code. | 4 | 3 |
| src/config/clients/tx.json | config/clients | Client-specific defaults/overrides JSON. | - | - |
| src/config/clients/ut.json | config/clients | Client-specific defaults/overrides JSON. | - | - |
| src/config/rules/federalSaversContributionLimits.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/federalSaversCreditBrackets.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/federalTaxBrackets.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/index.ts | config/rules | Exports rule/config helpers. | 6 | 0 |
| src/config/rules/planLevelInfo.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/ssiIncomeWarningThresholds.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/stateTaxDeductions.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/stateTaxRates.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/config/rules/wtaPovertyLevel.json | config/rules | Static rules/tax thresholds and limits. | - | - |
| src/copy/en.json | copy | Localized UI copy dictionary. | - | - |
| src/copy/es.json | copy | Localized UI copy dictionary. | - | - |
| src/copy/index.ts | copy | Language copy accessor and shared types. | 2 | 3 |
| src/features/planner/actions/resetPlannerInputs.ts | features/actions | Central reset routine for planner state. | 3 | 1 |
| src/features/planner/content/contentModel.ts | features/content | Planner page section/container logic. | 1 | 1 |
| src/features/planner/content/DisclosuresSection.tsx | features/content | Planner page section/container logic. | 1 | 1 |
| src/features/planner/content/InputsLeftPane.tsx | features/content | Planner page section/container logic. | 2 | 1 |
| src/features/planner/content/InputsRightPane.tsx | features/content | Right-column panel switcher for step-1 and step-2 content. | 0 | 1 |
| src/features/planner/content/InputsSectionLayout.tsx | features/content | Planner page section/container logic. | 0 | 1 |
| src/features/planner/content/ReportsSection.tsx | features/content | Planner page section/container logic. | 4 | 1 |
| src/features/planner/content/ScheduleSection.tsx | features/content | Planner page section/container logic. | 2 | 1 |
| src/features/planner/content/WelcomeSection.tsx | features/content | Planner page section/container logic. | 1 | 1 |
| src/features/planner/effects/usePlannerUiEffects.ts | features/effects | UI effects for scrolling, layout offsets, and mobile behavior. | 4 | 1 |
| src/features/planner/inputs/fscFlow.ts | features/inputs | Input flow helper (FSC/WTA/SSI) and related state logic. | 0 | 2 |
| src/features/planner/inputs/useSsiEnforcement.ts | features/inputs | Input flow helper (FSC/WTA/SSI) and related state logic. | 0 | 1 |
| src/features/planner/inputs/wtaFlow.ts | features/inputs | Input flow helper (FSC/WTA/SSI) and related state logic. | 1 | 4 |
| src/features/planner/navigation/mobileNavModel.ts | features/navigation | Navigation model logic (desktop/mobile step flow). | 3 | 1 |
| src/features/planner/report/reportRows.ts | features/report | Report view models and row shaping utilities. | 1 | 1 |
| src/features/planner/report/reportViewModel.ts | features/report | Report view models and row shaping utilities. | 1 | 3 |
| src/features/planner/report/scheduleModel.ts | features/report | Report view models and row shaping utilities. | 1 | 1 |
| src/features/planner/tax/taxMath.ts | features/tax | Tax and state-benefit computation helpers. | 3 | 1 |
| src/lib/amortization.ts | lib | Core amortization and month-by-month projection engine. | 1 | 13 |
| src/lib/calc/incomeTaxRates.ts | lib/calc | Calculation utility module. | 0 | 0 |
| src/lib/calc/usePlannerSchedule.ts | lib/calc | Builds planner schedule + taxable mirror data. | 3 | 1 |
| src/lib/copy/clientBlocks.ts | lib/copy | Copy/translation utility. | 0 | 0 |
| src/lib/date/formatMonthYear.ts | lib/date | Date/index formatting utility. | 0 | 6 |
| src/lib/hooks/useDebouncedValue.ts | lib/hooks | Reusable React hook. | 0 | 1 |
| src/lib/inputs/useQualifiedWithdrawalBudget.ts | lib/inputs | Input management helper. | 0 | 1 |
| src/lib/planner/messages.ts | lib/planner | Derived messaging helpers from schedule outcomes. | 1 | 1 |
| src/lib/report/buildAccountGrowthNarrative.ts | lib/report | Builds narrative text for report summaries. | 2 | 1 |
| src/lib/report/exportScheduleCsv.ts | lib/report | CSV export utilities for schedules. | 2 | 1 |
| THIRD-PARTY-LICENSES.md | root | Third-party license attributions. | - | - |
| tsconfig.json | root | TypeScript compiler configuration. | - | - |
