"use client";

import type { ReactNode } from "react";

export type ReportView = "account_growth" | "tax_benefits" | "taxable_growth" | "able_vs_taxable";

type Props = {
  title: string;
  accountGrowthTabLabel: string;
  ableGrowthTabLabel: string;
  taxableGrowthTabLabel: string;
  ableVsTaxableTabLabel: string;
  reportView: ReportView;
  enabledReportViews: ReportView[];
  onReportViewChange: (view: ReportView) => void;
  languageToggle: ReactNode;
};

export default function ReportsHeader({
  title,
  accountGrowthTabLabel,
  ableGrowthTabLabel,
  taxableGrowthTabLabel,
  ableVsTaxableTabLabel,
  reportView,
  enabledReportViews,
  onReportViewChange,
  languageToggle,
}: Props) {
  const showAccountGrowthTab = enabledReportViews.includes("account_growth");
  const showAbleGrowthTab = enabledReportViews.includes("tax_benefits");
  const showTaxableGrowthTab = enabledReportViews.includes("taxable_growth");
  const showAbleVsTaxableTab = enabledReportViews.includes("able_vs_taxable");

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+6rem)] z-30 -mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="flex items-center justify-between gap-3 md:justify-start">
        <div
          role="tablist"
          aria-label={title}
          className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {showAccountGrowthTab && (
            <button
              type="button"
              role="tab"
              aria-selected={reportView === "account_growth"}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                reportView === "account_growth"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onReportViewChange("account_growth")}
            >
              <span className="md:hidden">Summary</span>
              <span className="hidden md:inline">{accountGrowthTabLabel}</span>
            </button>
          )}
          {showAbleGrowthTab && (
            <button
              type="button"
              role="tab"
              aria-selected={reportView === "tax_benefits"}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                reportView === "tax_benefits"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onReportViewChange("tax_benefits")}
            >
              <span className="md:hidden">ABLE</span>
              <span className="hidden md:inline">{ableGrowthTabLabel}</span>
            </button>
          )}
          {showTaxableGrowthTab && (
            <button
              type="button"
              role="tab"
              aria-selected={reportView === "taxable_growth"}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                reportView === "taxable_growth"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onReportViewChange("taxable_growth")}
            >
              <span className="md:hidden">Taxable</span>
              <span className="hidden md:inline">{taxableGrowthTabLabel}</span>
            </button>
          )}
          {showAbleVsTaxableTab && (
            <button
              type="button"
              role="tab"
              aria-selected={reportView === "able_vs_taxable"}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                reportView === "able_vs_taxable"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onReportViewChange("able_vs_taxable")}
            >
              <span className="md:hidden">Comparison</span>
              <span className="hidden md:inline">{ableVsTaxableTabLabel}</span>
            </button>
          )}
        </div>
        <div className="md:hidden">{languageToggle}</div>
      </div>
      <div className="hidden md:block">{languageToggle}</div>
    </div>
  );
}
