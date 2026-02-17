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
  const tabItems = enabledReportViews.map((view) => {
    if (view === "account_growth") {
      return {
        view,
        mobileLabel: "Summary",
        desktopLabel: accountGrowthTabLabel,
      };
    }
    if (view === "tax_benefits") {
      return {
        view,
        mobileLabel: "ABLE",
        desktopLabel: ableGrowthTabLabel,
      };
    }
    if (view === "taxable_growth") {
      return {
        view,
        mobileLabel: "Taxable",
        desktopLabel: taxableGrowthTabLabel,
      };
    }
    return {
      view: "able_vs_taxable" as const,
      mobileLabel: "Comparison",
      desktopLabel: ableVsTaxableTabLabel,
    };
  });

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+6rem)] z-30 -mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-start">
        <div
          role="tablist"
          aria-label={title}
          className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {tabItems.map((tab) => (
            <button
              key={tab.view}
              type="button"
              role="tab"
              aria-selected={reportView === tab.view}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                reportView === tab.view
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onReportViewChange(tab.view)}
            >
              <span className="md:hidden">{tab.mobileLabel}</span>
              <span className="hidden md:inline">{tab.desktopLabel}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto md:hidden">{languageToggle}</div>
      </div>
      <div className="hidden md:block">{languageToggle}</div>
    </div>
  );
}
