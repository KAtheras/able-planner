"use client";

import { useState, type ReactNode } from "react";

export type ReportView = "account_growth" | "tax_benefits" | "taxable_growth" | "able_vs_taxable";

type Props = {
  title: string;
  accountGrowthTabLabel: string;
  ableGrowthTabLabel: string;
  taxableGrowthTabLabel: string;
  ableVsTaxableTabLabel: string;
  language: "en" | "es";
  reportView: ReportView;
  enabledReportViews: ReportView[];
  onReportViewChange: (view: ReportView) => void;
  reportActions?: ReactNode;
  languageToggle: ReactNode;
};

export default function ReportsHeader({
  title,
  accountGrowthTabLabel,
  ableGrowthTabLabel,
  taxableGrowthTabLabel,
  ableVsTaxableTabLabel,
  language,
  reportView,
  enabledReportViews,
  onReportViewChange,
  reportActions,
  languageToggle,
}: Props) {
  const [mobileReportsOpen, setMobileReportsOpen] = useState(false);
  const tabItems = enabledReportViews.map((view) => {
    if (view === "account_growth") {
      return {
        view,
        mobileLabel: language === "es" ? "Resumen" : "Summary",
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
        mobileLabel: language === "es" ? "Gravable" : "Taxable",
        desktopLabel: taxableGrowthTabLabel,
      };
    }
    return {
      view: "able_vs_taxable" as const,
      mobileLabel: language === "es" ? "Comparación" : "Comparison",
      desktopLabel: ableVsTaxableTabLabel,
    };
  });
  const mobileReportLabel = language === "es" ? "Informes" : "Reports";

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+5rem)] z-30 -mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50/95 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:static md:mx-0 md:mb-0 md:gap-3 md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="flex w-full items-center gap-1 md:w-auto md:gap-2 md:justify-start">
        <div className="min-w-0 flex-1 overflow-x-auto hidden md:block md:overflow-visible">
          <div
            role="tablist"
            aria-label={title}
            className="inline-flex w-max rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {tabItems.map((tab) => (
              <button
                key={tab.view}
                type="button"
                role="tab"
                aria-selected={reportView === tab.view}
                className={[
                  "rounded-full px-2 py-1 text-xs font-semibold transition md:px-4",
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
        </div>
        <div className="min-w-0 flex-1 md:hidden">
          <div className="relative inline-flex w-full">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={mobileReportsOpen}
              onClick={() => setMobileReportsOpen((open) => !open)}
              className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {mobileReportLabel}
              </span>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.12l3.71-3.9a.75.75 0 0 1 1.08 1.04l-4.25 4.46a.75.75 0 0 1-1.08 0L5.2 8.27a.75.75 0 0 1 .02-1.06Z" />
              </svg>
            </button>
            {mobileReportsOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-40 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              >
                {tabItems.map((tab) => (
                  <button
                    key={`mobile-report-${tab.view}`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onReportViewChange(tab.view);
                      setMobileReportsOpen(false);
                    }}
                    className={[
                      "block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                      reportView === tab.view
                        ? "bg-[var(--brand-primary)] text-white"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {tab.mobileLabel}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 md:hidden">
          <div className="flex items-center gap-2">
            {reportActions}
            {languageToggle}
          </div>
        </div>
      </div>
      <div className="hidden md:block">
        <div className="flex items-center gap-2">
          {reportActions}
          {languageToggle}
        </div>
      </div>
    </div>
  );
}
