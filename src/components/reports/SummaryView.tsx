"use client";

import type { ReactNode } from "react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ChartsPanel from "@/components/reports/ChartsPanel";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";

type ReportView = "account_growth" | "tax_benefits" | "taxable_growth";

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
        reportView={reportView}
        onReportViewChange={onReportViewChange}
        reportWindowLabel={reportWindowLabel}
        reportWindowOptions={reportWindowOptions}
        languageToggle={languageToggle}
      />
      {reportView === "account_growth" ? (
        <div className="space-y-4">
          {accountGrowthNarrativeParagraphs.map((paragraph, index) => (
            <p
              key={`account-growth-narrative-${index}`}
              className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : reportView === "tax_benefits" ? (
        <ChartsPanel ableRows={ableRows} language={language} accountType="able" />
      ) : (
        <ChartsPanel taxableRows={taxableRows} language={language} accountType="taxable" />
      )}
    </div>
  );
}
