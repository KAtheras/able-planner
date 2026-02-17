"use client";

import type { ReactNode } from "react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ChartsPanel from "@/components/reports/ChartsPanel";
import type { YearRow } from "@/lib/amortization";

type ReportView = "account_growth" | "tax_benefits";

type ReportWindowOptionItem = {
  key: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
};

type Props = {
  reportTitle: string;
  accountGrowthTabLabel: string;
  taxBenefitsTabLabel: string;
  reportView: ReportView;
  onReportViewChange: (view: ReportView) => void;
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
  languageToggle: ReactNode;
  language: "en" | "es";
  accountGrowthNarrativeParagraphs: string[];
  ableRows: YearRow[];
  placeholderText: string;
};

export default function SummaryView({
  reportTitle,
  accountGrowthTabLabel,
  taxBenefitsTabLabel,
  reportView,
  onReportViewChange,
  reportWindowLabel,
  reportWindowOptions,
  languageToggle,
  language,
  accountGrowthNarrativeParagraphs,
  ableRows,
  placeholderText,
}: Props) {
  void placeholderText;
  return (
    <div className="space-y-3">
      <ReportsHeader
        title={reportTitle}
        accountGrowthTabLabel={accountGrowthTabLabel}
        taxBenefitsTabLabel={taxBenefitsTabLabel}
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
      ) : (
        <ChartsPanel ableRows={ableRows} language={language} />
      )}
    </div>
  );
}
