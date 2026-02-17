"use client";

import type { ReactNode } from "react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ChartsPanel from "@/components/reports/ChartsPanel";
import AbleVsTaxablePanel from "@/components/reports/AbleVsTaxablePanel";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";

type ReportView = "account_growth" | "tax_benefits" | "taxable_growth" | "able_vs_taxable";

type ReportWindowOptionItem = {
  key: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
};

type Props = {
  reportTitle: string;
  accountGrowthTabLabel: string;
  ableGrowthTabLabel: string;
  taxableGrowthTabLabel: string;
  ableVsTaxableTabLabel: string;
  ableVsTaxablePanelLabels: {
    title: string;
    metricLabel: string;
    ableLabel: string;
    taxableLabel: string;
    naLabel: string;
    rows: {
      startingBalance: string;
      contributions: string;
      withdrawals: string;
      investmentReturns: string;
      federalTaxes: string;
      stateTaxes: string;
      endingBalance: string;
      federalSaversCredit: string;
      stateTaxBenefits: string;
      totalEconomicValue: string;
    };
  };
  reportView: ReportView;
  onReportViewChange: (view: ReportView) => void;
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
  languageToggle: ReactNode;
  language: "en" | "es";
  accountGrowthNarrativeParagraphs: string[];
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
  placeholderText: string;
};

export default function SummaryView({
  reportTitle,
  accountGrowthTabLabel,
  ableGrowthTabLabel,
  taxableGrowthTabLabel,
  ableVsTaxableTabLabel,
  ableVsTaxablePanelLabels,
  reportView,
  onReportViewChange,
  reportWindowLabel,
  reportWindowOptions,
  languageToggle,
  language,
  accountGrowthNarrativeParagraphs,
  ableRows,
  taxableRows,
  placeholderText,
}: Props) {
  void placeholderText;
  return (
    <div className="space-y-3">
      <ReportsHeader
        title={reportTitle}
        accountGrowthTabLabel={accountGrowthTabLabel}
        ableGrowthTabLabel={ableGrowthTabLabel}
        taxableGrowthTabLabel={taxableGrowthTabLabel}
        ableVsTaxableTabLabel={ableVsTaxableTabLabel}
        reportView={reportView}
        onReportViewChange={onReportViewChange}
        reportWindowLabel={reportWindowLabel}
        reportWindowOptions={reportWindowOptions}
        languageToggle={languageToggle}
      />
      {reportView === "account_growth" ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
          <h1 className="text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {reportTitle}
          </h1>
          <div className="mt-4 space-y-4">
          {accountGrowthNarrativeParagraphs.map((paragraph, index) => (
            <p
              key={`account-growth-narrative-${index}`}
              className="text-center text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              {paragraph}
            </p>
          ))}
          </div>
        </div>
      ) : reportView === "tax_benefits" ? (
        <ChartsPanel ableRows={ableRows} language={language} accountType="able" />
      ) : reportView === "taxable_growth" ? (
        <ChartsPanel taxableRows={taxableRows} language={language} accountType="taxable" />
      ) : (
        <AbleVsTaxablePanel
          ableRows={ableRows}
          taxableRows={taxableRows}
          labels={ableVsTaxablePanelLabels}
        />
      )}
    </div>
  );
}
