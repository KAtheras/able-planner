"use client";

import type { ReactNode } from "react";

type ReportView = "account_growth" | "tax_benefits" | "taxable_growth";

type ReportWindowOptionItem = {
  key: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
};

type Props = {
  title: string;
  accountGrowthTabLabel: string;
  ableGrowthTabLabel: string;
  taxableGrowthTabLabel: string;
  reportView: ReportView;
  onReportViewChange: (view: ReportView) => void;
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
  languageToggle: ReactNode;
};

export default function ReportsHeader({
  title,
  accountGrowthTabLabel,
  ableGrowthTabLabel,
  taxableGrowthTabLabel,
  reportView,
  onReportViewChange,
  reportWindowLabel,
  reportWindowOptions,
  languageToggle,
}: Props) {
  return (
    <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-3">
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
        </div>
        <div className="md:hidden">{languageToggle}</div>
      </div>
      <div className="flex w-full items-center justify-between gap-1 md:inline-flex md:w-auto md:justify-start">
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {reportWindowLabel}
        </span>
        <div className="ml-auto inline-flex flex-nowrap rounded-full border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
          {reportWindowOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={option.isActive}
              className={[
                "rounded-full px-2 py-1.5 text-xs font-semibold leading-none whitespace-nowrap transition md:px-3 md:py-1 md:text-xs",
                option.isActive
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={option.onClick}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="hidden md:block">{languageToggle}</div>
    </div>
  );
}
