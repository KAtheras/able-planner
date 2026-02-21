# Repository Dependencies

Generated: `2026-02-20T21:59:17.291Z`

## Summary
- Code files analyzed: **55**
- Internal import edges: **116**
- Unresolved internal imports: **0**

## Layer Dependency Edges
| From Layer | To Layer | Edge Count |
|---|---|---:|
| app | config/rules | 10 |
| app | features/content | 8 |
| app | components/inputs | 7 |
| components/reports | components/reports | 6 |
| config/rules | config/rules | 6 |
| config/clients | config/clients | 4 |
| app | features/inputs | 3 |
| app | features/report | 3 |
| components/reports | lib | 3 |
| features/content | components/inputs | 3 |
| features/tax | config/rules | 3 |
| app | components/layout | 2 |
| app | config/clients | 2 |
| app | lib/report | 2 |
| components/schedule | components/schedule | 2 |
| components/schedule | lib | 2 |
| copy | copy | 2 |
| features/content | components/reports | 2 |
| features/content | lib | 2 |
| features/report | lib | 2 |
| lib/calc | config/rules | 2 |
| lib/report | lib | 2 |
| lib/report | lib/date | 2 |
| app | app | 1 |
| app | components/reports | 1 |
| app | copy | 1 |
| app | features/actions | 1 |
| app | features/effects | 1 |
| app | features/navigation | 1 |
| app | features/tax | 1 |
| app | lib/calc | 1 |
| app | lib/date | 1 |
| app | lib/hooks | 1 |
| app | lib/inputs | 1 |
| app | lib/planner | 1 |
| components/inputs | components/inputs | 1 |
| components/inputs | config/rules | 1 |
| components/layout | copy | 1 |
| components/reports | lib/date | 1 |
| components/schedule | lib/date | 1 |
| features/actions | config/clients | 1 |
| features/actions | features/inputs | 1 |
| features/actions | features/report | 1 |
| features/content | components/layout | 1 |
| features/content | components/schedule | 1 |
| features/content | features/inputs | 1 |
| features/content | features/report | 1 |
| features/effects | components/layout | 1 |
| features/effects | components/reports | 1 |
| features/effects | copy | 1 |
| features/effects | features/inputs | 1 |
| features/inputs | config/rules | 1 |
| features/navigation | components/layout | 1 |
| features/navigation | components/reports | 1 |
| features/navigation | features/inputs | 1 |
| features/report | components/reports | 1 |
| lib | lib/date | 1 |
| lib/calc | lib | 1 |
| lib/planner | lib | 1 |

## Layer Graph
```mermaid
graph LR
  app["app"]
  components_inputs["components/inputs"]
  components_layout["components/layout"]
  components_reports["components/reports"]
  components_schedule["components/schedule"]
  config_clients["config/clients"]
  config_rules["config/rules"]
  copy["copy"]
  features_actions["features/actions"]
  features_content["features/content"]
  features_effects["features/effects"]
  features_inputs["features/inputs"]
  features_navigation["features/navigation"]
  features_report["features/report"]
  features_tax["features/tax"]
  lib["lib"]
  lib_calc["lib/calc"]
  lib_copy["lib/copy"]
  lib_date["lib/date"]
  lib_hooks["lib/hooks"]
  lib_inputs["lib/inputs"]
  lib_planner["lib/planner"]
  lib_report["lib/report"]
  app -->|10| config_rules
  app -->|8| features_content
  app -->|7| components_inputs
  components_reports -->|6| components_reports
  config_rules -->|6| config_rules
  config_clients -->|4| config_clients
  app -->|3| features_inputs
  app -->|3| features_report
  components_reports -->|3| lib
  features_content -->|3| components_inputs
  features_tax -->|3| config_rules
  app -->|2| components_layout
  app -->|2| config_clients
  app -->|2| lib_report
  components_schedule -->|2| components_schedule
  components_schedule -->|2| lib
  copy -->|2| copy
  features_content -->|2| components_reports
  features_content -->|2| lib
  features_report -->|2| lib
  lib_calc -->|2| config_rules
  lib_report -->|2| lib
  lib_report -->|2| lib_date
  app -->|1| app
  app -->|1| components_reports
  app -->|1| copy
  app -->|1| features_actions
  app -->|1| features_effects
  app -->|1| features_navigation
  app -->|1| features_tax
  app -->|1| lib_calc
  app -->|1| lib_date
  app -->|1| lib_hooks
  app -->|1| lib_inputs
  app -->|1| lib_planner
  components_inputs -->|1| components_inputs
  components_inputs -->|1| config_rules
  components_layout -->|1| copy
  components_reports -->|1| lib_date
  components_schedule -->|1| lib_date
  features_actions -->|1| config_clients
  features_actions -->|1| features_inputs
  features_actions -->|1| features_report
  features_content -->|1| components_layout
  features_content -->|1| components_schedule
  features_content -->|1| features_inputs
  features_content -->|1| features_report
  features_effects -->|1| components_layout
  features_effects -->|1| components_reports
  features_effects -->|1| copy
  features_effects -->|1| features_inputs
  features_inputs -->|1| config_rules
  features_navigation -->|1| components_layout
  features_navigation -->|1| components_reports
  features_navigation -->|1| features_inputs
  features_report -->|1| components_reports
  lib -->|1| lib_date
  lib_calc -->|1| lib
  lib_planner -->|1| lib
```

## Most Connected Files
| File | Depends On | Used By | Example Internal Imports |
|---|---:|---:|---|
| src/lib/amortization.ts | 1 | 13 | src/lib/date/formatMonthYear.ts |
| src/components/reports/ReportsHeader.tsx | 0 | 6 | - |
| src/lib/date/formatMonthYear.ts | 0 | 6 | - |
| src/features/planner/inputs/wtaFlow.ts | 1 | 4 | src/config/rules/wtaPovertyLevel.json |
| src/config/clients/index.ts | 4 | 3 | src/config/clients/default.json, src/config/clients/il.json, src/config/clients/tx.json, src/config/clients/ut.json |
| src/copy/index.ts | 2 | 3 | src/copy/en.json, src/copy/es.json |
| src/features/planner/report/reportViewModel.ts | 1 | 3 | src/components/reports/ReportsHeader.tsx |
| src/components/layout/Sidebar.tsx | 0 | 3 | - |
| src/components/reports/ReportWindowToggle.tsx | 0 | 3 | - |
| src/components/inputs/PlannerNoticeCard.tsx | 0 | 2 | - |
| src/components/layout/TopNav.tsx | 0 | 2 | - |
| src/features/planner/inputs/fscFlow.ts | 0 | 2 | - |
| src/components/reports/SummaryView.tsx | 5 | 1 | src/components/reports/ReportsHeader.tsx, src/components/reports/ChartsPanel.tsx, src/components/reports/AbleVsTaxablePanel.tsx, src/components/reports/ReportWindowToggle.tsx |
| src/features/planner/content/ReportsSection.tsx | 4 | 1 | src/components/reports/SummaryView.tsx, src/components/reports/ReportsHeader.tsx, src/lib/amortization.ts, src/features/planner/report/reportViewModel.ts |
| src/features/planner/effects/usePlannerUiEffects.ts | 4 | 1 | src/components/layout/Sidebar.tsx, src/components/reports/ReportsHeader.tsx, src/copy/index.ts, src/features/planner/inputs/wtaFlow.ts |
| src/components/reports/ChartsPanel.tsx | 3 | 1 | src/lib/amortization.ts, src/lib/date/formatMonthYear.ts, src/components/reports/ReportWindowToggle.tsx |
| src/components/schedule/ScheduleView.tsx | 3 | 1 | src/lib/amortization.ts, src/components/schedule/ScheduleHeader.tsx, src/components/schedule/AmortizationScheduleTable.tsx |
| src/features/planner/actions/resetPlannerInputs.ts | 3 | 1 | src/config/clients/index.ts, src/features/planner/inputs/fscFlow.ts, src/features/planner/report/reportViewModel.ts |
| src/features/planner/navigation/mobileNavModel.ts | 3 | 1 | src/components/layout/Sidebar.tsx, src/components/reports/ReportsHeader.tsx, src/features/planner/inputs/wtaFlow.ts |
| src/features/planner/tax/taxMath.ts | 3 | 1 | src/config/rules/federalTaxBrackets.json, src/config/rules/stateTaxDeductions.json, src/config/rules/stateTaxRates.json |
| src/lib/calc/usePlannerSchedule.ts | 3 | 1 | src/lib/amortization.ts, src/config/rules/federalTaxBrackets.json, src/config/rules/stateTaxRates.json |
| src/components/reports/AbleVsTaxablePanel.tsx | 2 | 1 | src/lib/amortization.ts, src/components/reports/ReportWindowToggle.tsx |
| src/components/schedule/AmortizationScheduleTable.tsx | 2 | 1 | src/lib/amortization.ts, src/lib/date/formatMonthYear.ts |
| src/features/planner/content/InputsLeftPane.tsx | 2 | 1 | src/components/inputs/AccountActivityForm.tsx, src/components/inputs/DemographicsForm.tsx |
| src/features/planner/content/ScheduleSection.tsx | 2 | 1 | src/components/schedule/ScheduleView.tsx, src/lib/amortization.ts |

## app/page.tsx Dependency Focus
```mermaid
graph TD
  app_page["app/page.tsx"]
  app_page --> src_components_inputs_AccountEndingValueCard_tsx["src/components/inputs/AccountEndingValueCard.tsx"]
  app_page --> src_components_inputs_MobileFloatingEndingValue_tsx["src/components/inputs/MobileFloatingEndingValue.tsx"]
  app_page --> src_components_inputs_PlannerNoticeCard_tsx["src/components/inputs/PlannerNoticeCard.tsx"]
  app_page --> src_components_inputs_QualifiedWithdrawalsBudgetPanel_tsx["src/components/inputs/QualifiedWithdrawalsBudgetPanel.tsx"]
  app_page --> src_components_inputs_ResidencyWarningCard_tsx["src/components/inputs/ResidencyWarningCard.tsx"]
  app_page --> src_components_inputs_Screen2MessagesPanel_tsx["src/components/inputs/Screen2MessagesPanel.tsx"]
  app_page --> src_components_inputs_Screen2WtaPanel_tsx["src/components/inputs/Screen2WtaPanel.tsx"]
  app_page --> src_components_layout_Sidebar_tsx["src/components/layout/Sidebar.tsx"]
  app_page --> src_components_layout_TopNav_tsx["src/components/layout/TopNav.tsx"]
  app_page --> src_components_reports_ReportsHeader_tsx["src/components/reports/ReportsHeader.tsx"]
  app_page --> src_config_clients_index_ts["src/config/clients/index.ts"]
  app_page --> src_config_rules_federalSaversContributionLimits_json["src/config/rules/federalSaversContributionLimits.json"]
  app_page --> src_config_rules_federalSaversCreditBrackets_json["src/config/rules/federalSaversCreditBrackets.json"]
  app_page --> src_config_rules_planLevelInfo_json["src/config/rules/planLevelInfo.json"]
  app_page --> src_config_rules_ssiIncomeWarningThresholds_json["src/config/rules/ssiIncomeWarningThresholds.json"]
  app_page --> src_copy_index_ts["src/copy/index.ts"]
  app_page --> src_features_planner_actions_resetPlannerInputs_ts["src/features/planner/actions/resetPlannerInputs.ts"]
  app_page --> src_features_planner_content_contentModel_ts["src/features/planner/content/contentModel.ts"]
  app_page --> src_features_planner_content_DisclosuresSection_tsx["src/features/planner/content/DisclosuresSection.tsx"]
  app_page --> src_features_planner_content_InputsLeftPane_tsx["src/features/planner/content/InputsLeftPane.tsx"]
  app_page --> src_features_planner_content_InputsRightPane_tsx["src/features/planner/content/InputsRightPane.tsx"]
  app_page --> src_features_planner_content_InputsSectionLayout_tsx["src/features/planner/content/InputsSectionLayout.tsx"]
  app_page --> src_features_planner_content_ReportsSection_tsx["src/features/planner/content/ReportsSection.tsx"]
  app_page --> src_features_planner_content_ScheduleSection_tsx["src/features/planner/content/ScheduleSection.tsx"]
  app_page --> src_features_planner_content_WelcomeSection_tsx["src/features/planner/content/WelcomeSection.tsx"]
  app_page --> src_features_planner_effects_usePlannerUiEffects_ts["src/features/planner/effects/usePlannerUiEffects.ts"]
  app_page --> src_features_planner_inputs_fscFlow_ts["src/features/planner/inputs/fscFlow.ts"]
  app_page --> src_features_planner_inputs_useSsiEnforcement_ts["src/features/planner/inputs/useSsiEnforcement.ts"]
  app_page --> src_features_planner_inputs_wtaFlow_ts["src/features/planner/inputs/wtaFlow.ts"]
  app_page --> src_features_planner_navigation_mobileNavModel_ts["src/features/planner/navigation/mobileNavModel.ts"]
  app_page --> src_features_planner_report_reportRows_ts["src/features/planner/report/reportRows.ts"]
  app_page --> src_features_planner_report_reportViewModel_ts["src/features/planner/report/reportViewModel.ts"]
  app_page --> src_features_planner_report_scheduleModel_ts["src/features/planner/report/scheduleModel.ts"]
  app_page --> src_features_planner_tax_taxMath_ts["src/features/planner/tax/taxMath.ts"]
  app_page --> src_lib_calc_usePlannerSchedule_ts["src/lib/calc/usePlannerSchedule.ts"]
  app_page --> src_lib_date_formatMonthYear_ts["src/lib/date/formatMonthYear.ts"]
  app_page --> src_lib_hooks_useDebouncedValue_ts["src/lib/hooks/useDebouncedValue.ts"]
  app_page --> src_lib_inputs_useQualifiedWithdrawalBudget_ts["src/lib/inputs/useQualifiedWithdrawalBudget.ts"]
  app_page --> src_lib_planner_messages_ts["src/lib/planner/messages.ts"]
  app_page --> src_lib_report_buildAccountGrowthNarrative_ts["src/lib/report/buildAccountGrowthNarrative.ts"]
  app_page --> src_lib_report_exportScheduleCsv_ts["src/lib/report/exportScheduleCsv.ts"]
```

## Unresolved Internal Imports
None.
