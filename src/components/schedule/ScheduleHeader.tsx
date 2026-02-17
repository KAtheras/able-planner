"use client";

import type { ReactNode } from "react";

type ViewMode = "able" | "taxable";

type Props = {
  title: string;
  ableLabel: string;
  taxableLabel: string;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onDownloadAble: () => void;
  onDownloadTaxable: () => void;
  downloadAbleCsvAriaLabel: string;
  downloadTaxableCsvAriaLabel: string;
  downloadCsvTitle: string;
  languageToggle: ReactNode;
};

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M12 3V14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 9.5L12 14L16.5 9.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16.5V19.5H20V16.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ScheduleHeader({
  title,
  ableLabel,
  taxableLabel,
  view,
  onViewChange,
  onDownloadAble,
  onDownloadTaxable,
  downloadAbleCsvAriaLabel,
  downloadTaxableCsvAriaLabel,
  downloadCsvTitle,
  languageToggle,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4">
      <h1 className="order-1 w-full text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50 md:order-2 md:flex-1">
        {title}
      </h1>
      <div className="order-2 flex w-full items-center justify-between md:order-1 md:w-auto md:justify-start">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={view === "able"}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                view === "able"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "border border-zinc-200 bg-white/50 text-zinc-500 hover:border-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onViewChange("able")}
            >
              <span className="md:hidden">ABLE</span>
              <span className="hidden md:inline">{ableLabel}</span>
            </button>
            <button
              type="button"
              aria-label={downloadAbleCsvAriaLabel}
              title={downloadCsvTitle}
              className="grid h-7 w-7 place-items-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:border-slate-400 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              onClick={onDownloadAble}
            >
              <DownloadIcon />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={view === "taxable"}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition",
                view === "taxable"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "border border-zinc-200 bg-white/50 text-zinc-500 hover:border-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => onViewChange("taxable")}
            >
              <span className="md:hidden">Taxable</span>
              <span className="hidden md:inline">{taxableLabel}</span>
            </button>
            <button
              type="button"
              aria-label={downloadTaxableCsvAriaLabel}
              title={downloadCsvTitle}
              className="grid h-7 w-7 place-items-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:border-slate-400 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              onClick={onDownloadTaxable}
            >
              <DownloadIcon />
            </button>
          </div>
        </div>
        <div className="md:hidden">{languageToggle}</div>
      </div>
      <div className="order-3 hidden items-center justify-center md:ml-auto md:flex md:justify-end">
        {languageToggle}
      </div>
    </div>
  );
}
