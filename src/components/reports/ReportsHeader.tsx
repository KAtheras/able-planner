"use client";

import type { ReactNode } from "react";

type ReportView = "account_growth" | "tax_benefits" | "taxable_growth" | "able_vs_taxable";

type Props = {
  title: string;
  accountGrowthTabLabel: string;
  ableGrowthTabLabel: string;
  taxableGrowthTabLabel: string;
  ableVsTaxableTabLabel: string;
  reportView: ReportView;
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
  onReportViewChange,
  languageToggle,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center justify-between gap-3 md:justify-start">
        <div
          role="tablist"
          aria-label={title}
          className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
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
            {accountGrowthTabLabel}
          </button>
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
            {ableGrowthTabLabel}
          </button>
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
            {taxableGrowthTabLabel}
          </button>
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
            {ableVsTaxableTabLabel}
          </button>
        </div>
        <div className="md:hidden">{languageToggle}</div>
      </div>
      <div className="hidden md:block">{languageToggle}</div>
    </div>
  );
}
