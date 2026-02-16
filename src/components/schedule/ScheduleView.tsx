"use client";

import type { ReactNode } from "react";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";
import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import AmortizationScheduleTable from "@/components/schedule/AmortizationScheduleTable";

type ViewMode = "able" | "taxable";

type ScheduleLabels = {
  monthYear?: string;
  accountTotals?: string;
  contributions?: string;
  withdrawals?: string;
  investmentReturns?: string;
  accountBalance?: string;
  federalSaversCredit?: string;
  stateTaxBenefit?: string;
  federalTaxes?: string;
  stateTaxes?: string;
  ableAccountToggle?: string;
  taxableAccountToggle?: string;
  amortizationTitle?: string;
  enterTimeHorizonPrompt?: string;
  downloadAbleCsvAria?: string;
  downloadTaxableCsvAria?: string;
  downloadCsvTitle?: string;
};

type Props = {
  hasTimeHorizon: boolean;
  language: "en" | "es";
  labels?: ScheduleLabels;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onDownloadAble: () => void;
  onDownloadTaxable: () => void;
  languageToggle: ReactNode;
  rows: YearRow[];
  taxableRows: TaxableYearRow[];
};

export default function ScheduleView({
  hasTimeHorizon,
  language,
  labels,
  view,
  onViewChange,
  onDownloadAble,
  onDownloadTaxable,
  languageToggle,
  rows,
  taxableRows,
}: Props) {
  if (!hasTimeHorizon) {
    return (
      <div className="space-y-6">
        <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {labels?.amortizationTitle ?? ""}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {labels?.enterTimeHorizonPrompt ?? ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="h-full text-sm text-zinc-600 dark:text-zinc-400">
        <ScheduleHeader
          title={labels?.amortizationTitle ?? ""}
          ableLabel={labels?.ableAccountToggle ?? ""}
          taxableLabel={labels?.taxableAccountToggle ?? ""}
          view={view}
          onViewChange={onViewChange}
          onDownloadAble={onDownloadAble}
          onDownloadTaxable={onDownloadTaxable}
          downloadAbleCsvAriaLabel={labels?.downloadAbleCsvAria ?? ""}
          downloadTaxableCsvAriaLabel={labels?.downloadTaxableCsvAria ?? ""}
          downloadCsvTitle={labels?.downloadCsvTitle ?? ""}
          languageToggle={languageToggle}
        />
        <div className="mt-4">
          <AmortizationScheduleTable
            rows={rows}
            taxableRows={taxableRows}
            view={view}
            language={language}
            labels={labels}
          />
        </div>
      </div>
    </div>
  );
}
