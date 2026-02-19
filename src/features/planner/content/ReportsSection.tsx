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
      ableVsTaxablePanelLabels={ableVsTaxablePanelLabels}
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
