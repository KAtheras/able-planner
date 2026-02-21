import type { ReportView } from "@/components/reports/ReportsHeader";

export type ReportWindowOption = 3 | 10 | 20 | 40 | "max";

export const ALL_REPORT_VIEWS: ReportView[] = [
  "account_growth",
  "tax_benefits",
  "taxable_growth",
  "able_vs_taxable",
  "experimental_comparison",
];

type BalancePoint = {
  monthIndex: number;
  endingBalance: number;
};

type ReportWindowInputs = {
  reportView: ReportView;
  reportWindowYears: ReportWindowOption;
  startIndex: number;
  horizonEndIndex: number;
  horizonSafeYears: number;
  ableMonthly: BalancePoint[];
  taxableMonthly: BalancePoint[];
};

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const getDisplayEndIndex = (months: BalancePoint[], fallbackEndIndex: number) => {
  const depletionMonth = months.find((month) => month.endingBalance <= 0);
  return depletionMonth ? depletionMonth.monthIndex : fallbackEndIndex;
};

export function getEnabledReportViews(configuredTabs: string[]): ReportView[] {
  const sanitized = configuredTabs.filter((tab): tab is ReportView =>
    ALL_REPORT_VIEWS.includes(tab as ReportView),
  );
  return sanitized.length ? Array.from(new Set(sanitized)) : ALL_REPORT_VIEWS;
}

export function buildReportWindowModel({
  reportView,
  reportWindowYears,
  startIndex,
  horizonEndIndex,
  horizonSafeYears,
  ableMonthly,
  taxableMonthly,
}: ReportWindowInputs) {
  const ableDisplayEndIndex = getDisplayEndIndex(ableMonthly, horizonEndIndex);
  const taxableDisplayEndIndex = getDisplayEndIndex(taxableMonthly, horizonEndIndex);

  const reportDisplayEndIndex =
    reportView === "tax_benefits"
      ? ableDisplayEndIndex
      : reportView === "taxable_growth"
        ? taxableDisplayEndIndex
        : Math.max(ableDisplayEndIndex, taxableDisplayEndIndex);

  const reportDisplayMonths = Math.max(1, reportDisplayEndIndex - startIndex + 1);
  const reportDisplayYearsRaw = Math.ceil(reportDisplayMonths / 12);
  const reportDisplayYearsEvenRounded =
    reportDisplayYearsRaw % 2 === 0 ? reportDisplayYearsRaw : reportDisplayYearsRaw + 1;

  const reportWindowMaxYears = clampNumber(
    reportDisplayYearsEvenRounded,
    1,
    horizonSafeYears,
  );

  const reportWindowYearsValue =
    reportWindowYears === "max"
      ? reportWindowMaxYears
      : Math.min(reportWindowYears, reportWindowMaxYears);

  const reportWindowEndIndex =
    reportWindowYearsValue > 0 ? startIndex + reportWindowYearsValue * 12 - 1 : startIndex - 1;

  return {
    reportWindowMaxYears,
    reportWindowYearsValue,
    reportWindowEndIndex,
  };
}
