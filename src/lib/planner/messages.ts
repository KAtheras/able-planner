import type { YearRow } from "@/lib/amortization";

export type EndingValueInfo = {
  endingLabel: string;
  depletionEligible: boolean;
  withdrawalsStopAfterDepletion: boolean;
  reachLabel: string;
  stopLabel: string;
};

type BuildEndingValueInfoParams = {
  scheduleRows: YearRow[];
  hasConfiguredWithdrawals: boolean;
  horizonEndIndex: number;
  formatCurrency: (value: number) => string;
  formatMonthYearLabel: (index: number) => string;
};

export function buildEndingValueInfo({
  scheduleRows,
  hasConfiguredWithdrawals,
  horizonEndIndex,
  formatCurrency,
  formatMonthYearLabel,
}: BuildEndingValueInfoParams): EndingValueInfo {
  if (!scheduleRows.length) {
    return {
      endingLabel: "—",
      depletionEligible: false,
      withdrawalsStopAfterDepletion: false,
      reachLabel: "",
      stopLabel: "",
    };
  }

  const lastRow = scheduleRows[scheduleRows.length - 1];
  const endingValue = Number.isFinite(lastRow?.endingBalance) ? lastRow.endingBalance : Number.NaN;
  const endingLabel = Number.isFinite(endingValue)
    ? formatCurrency(endingValue).replace(".00", "")
    : "—";

  const scheduleHasWithdrawals = scheduleRows.some((row) =>
    row.months.some(
      (monthRow) =>
        Number.isFinite(monthRow.withdrawal) && monthRow.withdrawal > 0,
    ),
  );

  let depletionMonthIndex: number | null = null;
  for (const row of scheduleRows) {
    for (const monthRow of row.months) {
      if (!Number.isFinite(monthRow.endingBalance)) continue;
      if (monthRow.endingBalance <= 0.01) {
        depletionMonthIndex = monthRow.monthIndex;
        break;
      }
    }
    if (depletionMonthIndex !== null) break;
  }

  const depletionEligible =
    hasConfiguredWithdrawals &&
    scheduleHasWithdrawals &&
    depletionMonthIndex !== null &&
    depletionMonthIndex < horizonEndIndex;
  const reachLabel =
    depletionMonthIndex !== null ? formatMonthYearLabel(depletionMonthIndex) : "";
  const stopLabel = reachLabel;
  const withdrawalsStopAfterDepletion =
    depletionMonthIndex !== null
      ? !scheduleRows.some((row) =>
          row.months.some(
            (monthRow) =>
              monthRow.monthIndex > depletionMonthIndex &&
              Number.isFinite(monthRow.withdrawal) &&
              monthRow.withdrawal > 0,
          ),
        )
      : false;

  return {
    endingLabel,
    depletionEligible,
    withdrawalsStopAfterDepletion,
    reachLabel,
    stopLabel,
  };
}

export function hasWithdrawalLimitedPlanCode(scheduleRows: YearRow[]): boolean {
  return scheduleRows.some((row) =>
    row.months.some(
      (monthRow) =>
        Array.isArray(monthRow.planCodes) &&
        monthRow.planCodes.includes("WITHDRAWALS_LIMITED_TO_AVAILABLE_BALANCE"),
    ),
  );
}

export function shouldShowStandaloneWithdrawalLimitedMessage(params: {
  hasConfiguredWithdrawals: boolean;
  hasWithdrawalLimitedMessage: boolean;
  endingValueInfo: EndingValueInfo;
}): boolean {
  return (
    params.hasConfiguredWithdrawals &&
    params.hasWithdrawalLimitedMessage &&
    !params.endingValueInfo.depletionEligible
  );
}
