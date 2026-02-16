"use client";

import type { ReactNode } from "react";
import ReportsHeader from "@/components/reports/ReportsHeader";

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
  accountGrowthNarrativeParagraphs: string[];
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
  accountGrowthNarrativeParagraphs,
  placeholderText,
}: Props) {
  return (
    <div className="space-y-6">
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
      <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {reportTitle}
        </h1>
        {reportView === "account_growth" ? (
          <div className="mt-4 space-y-4">
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
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {placeholderText}
          </p>
        )}
      </div>
    </div>
  );
}
