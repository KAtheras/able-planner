"use client";

import type { ComponentProps, ReactNode } from "react";
import ScheduleView from "@/components/schedule/ScheduleView";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";

type Props = {
  hasTimeHorizon: boolean;
  language: "en" | "es";
  labels: ComponentProps<typeof ScheduleView>["labels"];
  view: "able" | "taxable";
  onViewChange: (view: "able" | "taxable") => void;
  onDownloadAble: () => void;
  onDownloadTaxable: () => void;
  languageToggle: ReactNode;
  rows: YearRow[];
  taxableRows: TaxableYearRow[];
};

export default function ScheduleSection({
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
  return (
    <ScheduleView
      hasTimeHorizon={hasTimeHorizon}
      language={language}
      labels={labels}
      view={view}
      onViewChange={onViewChange}
      onDownloadAble={onDownloadAble}
      onDownloadTaxable={onDownloadTaxable}
      languageToggle={languageToggle}
      rows={rows}
      taxableRows={taxableRows}
    />
  );
}
