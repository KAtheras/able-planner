"use client";

import type { ReactNode } from "react";
import SummaryView from "@/components/reports/SummaryView";
import type { ReportView } from "@/components/reports/ReportsHeader";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";
import type { ReportWindowOption } from "@/features/planner/report/reportViewModel";

const REPORT_WINDOW_OPTIONS: ReportWindowOption[] = [3, 10, 20, 40, "max"];

type ReportsLabels = {
  title?: string;
  accountGrowthTab?: string;
  taxBenefitsTab?: string;
  taxableGrowthTab?: string;
  ableVsTaxableTab?: string;
  experimentalComparisonTab?: string;
  reportWindowLabel?: string;
  ableVsTaxableTitle?: string;
  ableVsTaxableMetricLabel?: string;
  ableVsTaxableAbleLabel?: string;
  ableVsTaxableTaxableLabel?: string;
  ableVsTaxableNaLabel?: string;
  ableVsTaxableRows?: {
    startingBalance?: string;
    contributions?: string;
    withdrawals?: string;
    investmentReturns?: string;
    federalTaxes?: string;
    stateTaxes?: string;
    endingBalance?: string;
    federalSaversCredit?: string;
    stateTaxBenefits?: string;
    totalEconomicValue?: string;
    totalEconomicBenefit?: string;
  };
  experimentalComparisonTitle?: string;
  experimentalComparisonPanelTitle?: string;
  experimentalComparisonAbleLine?: string;
  experimentalComparisonTaxableLine?: string;
  experimentalComparisonWithdrawalDifference?: string;
  experimentalComparisonTaxableWithdrawalDifference?: string;
  experimentalComparisonWithdrawalInfoToggleAria?: string;
  experimentalComparisonWithdrawalInfoMessage?: string;
  experimentalComparisonAbleBalanceAdvantage?: string;
  experimentalComparisonTaxableBalanceAdvantage?: string;
  experimentalComparisonBalanceInfoToggleAria?: string;
  experimentalComparisonBalanceInfoMessage?: string;
  experimentalComparisonAdditionalEconomicBenefitBoth?: string;
  experimentalComparisonAdditionalEconomicBenefitFederalOnly?: string;
  experimentalComparisonAdditionalEconomicBenefitStateOnly?: string;
  experimentalComparisonAdditionalEconomicBenefitNone?: string;
  experimentalComparisonAdditionalEconomicBenefitInfoToggleAria?: string;
  experimentalComparisonAdditionalEconomicBenefitInfoMessage?: string;
  experimentalComparisonInvestmentReturnDifference?: string;
  experimentalComparisonTaxableInvestmentReturnDifference?: string;
  experimentalComparisonInvestmentReturnInfoToggleAria?: string;
  experimentalComparisonInvestmentReturnInfoMessageWithState?: string;
  experimentalComparisonInvestmentReturnInfoMessageFederalOnly?: string;
  experimentalComparisonNoDifferences?: string;
};

type Props = {
  labels?: ReportsLabels;
  placeholderText: string;
  reportView: ReportView;
  enabledReportViews: ReportView[];
  onReportViewChange: (view: ReportView) => void;
  reportWindowYearsValue: number;
  reportWindowMaxYears: number;
  onReportWindowYearsChange: (value: ReportWindowOption) => void;
  reportActions?: ReactNode;
  language: "en" | "es";
  languageToggle: ReactNode;
  accountGrowthNarrativeParagraphs: string[];
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
};

export default function ReportsSection({
  labels,
  placeholderText,
  reportView,
  enabledReportViews,
  onReportViewChange,
  reportWindowYearsValue,
  reportWindowMaxYears,
  onReportWindowYearsChange,
  reportActions,
  language,
  languageToggle,
  accountGrowthNarrativeParagraphs,
  ableRows,
  taxableRows,
}: Props) {
  const reportTitle = labels?.title ?? "";
  const accountGrowthTabLabel = labels?.accountGrowthTab ?? "";
  const ableGrowthTabLabel = labels?.taxBenefitsTab ?? "";
  const taxableGrowthTabLabel = labels?.taxableGrowthTab ?? "";
  const ableVsTaxableTabLabel = labels?.ableVsTaxableTab ?? "";
  const experimentalComparisonTabLabel = labels?.experimentalComparisonTab ?? "";
  const reportWindowLabel = labels?.reportWindowLabel ?? "";
  const ableVsTaxablePanelLabels = {
    title: labels?.ableVsTaxableTitle ?? "",
    metricLabel: labels?.ableVsTaxableMetricLabel ?? "",
    ableLabel: labels?.ableVsTaxableAbleLabel ?? "",
    taxableLabel: labels?.ableVsTaxableTaxableLabel ?? "",
    naLabel: labels?.ableVsTaxableNaLabel ?? "—",
    rows: {
      startingBalance: labels?.ableVsTaxableRows?.startingBalance ?? "",
      contributions: labels?.ableVsTaxableRows?.contributions ?? "",
      withdrawals: labels?.ableVsTaxableRows?.withdrawals ?? "",
      investmentReturns: labels?.ableVsTaxableRows?.investmentReturns ?? "",
      federalTaxes: labels?.ableVsTaxableRows?.federalTaxes ?? "",
      stateTaxes: labels?.ableVsTaxableRows?.stateTaxes ?? "",
      endingBalance: labels?.ableVsTaxableRows?.endingBalance ?? "",
      federalSaversCredit: labels?.ableVsTaxableRows?.federalSaversCredit ?? "",
      stateTaxBenefits: labels?.ableVsTaxableRows?.stateTaxBenefits ?? "",
      totalEconomicValue: labels?.ableVsTaxableRows?.totalEconomicValue ?? "",
      totalEconomicBenefit: labels?.ableVsTaxableRows?.totalEconomicBenefit ?? "",
    },
  };
  const experimentalComparisonPanelLabels = {
    title: labels?.experimentalComparisonTitle ?? "",
    panelTitle: labels?.experimentalComparisonPanelTitle ?? "",
    ableLine: labels?.experimentalComparisonAbleLine ?? "",
    taxableLine: labels?.experimentalComparisonTaxableLine ?? "",
    withdrawalDifference: labels?.experimentalComparisonWithdrawalDifference ?? "",
    taxableWithdrawalDifference: labels?.experimentalComparisonTaxableWithdrawalDifference ?? "",
    withdrawalInfoToggleAria: labels?.experimentalComparisonWithdrawalInfoToggleAria ?? "",
    withdrawalInfoMessage: labels?.experimentalComparisonWithdrawalInfoMessage ?? "",
    ableBalanceAdvantage: labels?.experimentalComparisonAbleBalanceAdvantage ?? "",
    taxableBalanceAdvantage: labels?.experimentalComparisonTaxableBalanceAdvantage ?? "",
    balanceInfoToggleAria: labels?.experimentalComparisonBalanceInfoToggleAria ?? "",
    balanceInfoMessage: labels?.experimentalComparisonBalanceInfoMessage ?? "",
    additionalEconomicBenefitBoth:
      labels?.experimentalComparisonAdditionalEconomicBenefitBoth ?? "",
    additionalEconomicBenefitFederalOnly:
      labels?.experimentalComparisonAdditionalEconomicBenefitFederalOnly ?? "",
    additionalEconomicBenefitStateOnly:
      labels?.experimentalComparisonAdditionalEconomicBenefitStateOnly ?? "",
    additionalEconomicBenefitNone:
      labels?.experimentalComparisonAdditionalEconomicBenefitNone ?? "",
    additionalEconomicBenefitInfoToggleAria:
      labels?.experimentalComparisonAdditionalEconomicBenefitInfoToggleAria ?? "",
    additionalEconomicBenefitInfoMessage:
      labels?.experimentalComparisonAdditionalEconomicBenefitInfoMessage ?? "",
    investmentReturnDifference: labels?.experimentalComparisonInvestmentReturnDifference ?? "",
    taxableInvestmentReturnDifference:
      labels?.experimentalComparisonTaxableInvestmentReturnDifference ?? "",
    investmentReturnInfoToggleAria:
      labels?.experimentalComparisonInvestmentReturnInfoToggleAria ?? "",
    investmentReturnInfoMessageWithState:
      labels?.experimentalComparisonInvestmentReturnInfoMessageWithState ?? "",
    investmentReturnInfoMessageFederalOnly:
      labels?.experimentalComparisonInvestmentReturnInfoMessageFederalOnly ?? "",
    noDifferences: labels?.experimentalComparisonNoDifferences ?? "",
  };

  const hasPresetMatchingHorizon = REPORT_WINDOW_OPTIONS.some(
    (option) => option !== "max" && option === reportWindowMaxYears,
  );
  const showMaxOption = !hasPresetMatchingHorizon;
  const optionsToRender = REPORT_WINDOW_OPTIONS.filter((option) =>
    option === "max" ? showMaxOption : option <= reportWindowMaxYears,
  );
  const reportWindowOptions = optionsToRender.map((option) => {
    const isMax = option === "max";
    const optionYears = isMax ? reportWindowMaxYears : option;
    const isActive = reportWindowYearsValue === optionYears;
    const label = isMax
      ? language === "es"
        ? `${reportWindowMaxYears}A`
        : `${reportWindowMaxYears}Y`
      : language === "es"
        ? `${optionYears}A`
        : `${optionYears}Y`;
    return {
      key: `report-window-${option}`,
      label,
      isActive,
      onClick: () => onReportWindowYearsChange(option),
    };
  });

  return (
    <SummaryView
      reportTitle={reportTitle}
      accountGrowthTabLabel={accountGrowthTabLabel}
      ableGrowthTabLabel={ableGrowthTabLabel}
      taxableGrowthTabLabel={taxableGrowthTabLabel}
      ableVsTaxableTabLabel={ableVsTaxableTabLabel}
      experimentalComparisonTabLabel={experimentalComparisonTabLabel}
      ableVsTaxablePanelLabels={ableVsTaxablePanelLabels}
      experimentalComparisonPanelLabels={experimentalComparisonPanelLabels}
      reportView={reportView}
      enabledReportViews={enabledReportViews}
      onReportViewChange={onReportViewChange}
      reportWindowLabel={reportWindowLabel}
      reportWindowOptions={reportWindowOptions}
      reportActions={reportActions}
      languageToggle={languageToggle}
      language={language}
      accountGrowthNarrativeParagraphs={accountGrowthNarrativeParagraphs}
      ableRows={ableRows}
      taxableRows={taxableRows}
      placeholderText={placeholderText}
    />
  );
}
