import { useMemo } from "react";

import {
  buildAmortizationSchedule,
  extractSsiMessages,
  type YearRow,
  type SsiMessage,
} from "@/lib/amortization";

export type UsePlannerScheduleArgs = {
  startMonthIndex: number;
  totalMonths: number;
  horizonEndIndex: number;
  startingBalance: number;
  monthlyContribution: number;
  monthlyWithdrawal: number;
  contributionIncreasePct: number;
  withdrawalIncreasePct: number;
  contributionEndIndex: number;
  withdrawalStartIndex: number;
  annualReturnDecimal: number;
  isSsiEligible: boolean;
  enabled: boolean;
};

export type PlannerScheduleResult = {
  scheduleRows: YearRow[];
  ssiMessages: SsiMessage[];
};

export function usePlannerSchedule({
  startMonthIndex,
  totalMonths,
  horizonEndIndex,
  startingBalance,
  monthlyContribution,
  monthlyWithdrawal,
  contributionIncreasePct,
  withdrawalIncreasePct,
  contributionEndIndex,
  withdrawalStartIndex,
  annualReturnDecimal,
  isSsiEligible,
  enabled,
}: UsePlannerScheduleArgs): PlannerScheduleResult {
  return useMemo(() => {
    if (!enabled) {
      return { scheduleRows: [], ssiMessages: [] };
    }

    const scheduleRows = buildAmortizationSchedule({
      startMonthIndex,
      totalMonths,
      horizonEndIndex,
      startingBalance,
      monthlyContribution,
      monthlyWithdrawal,
      contributionIncreasePct,
      withdrawalIncreasePct,
      contributionEndIndex,
      withdrawalStartIndex,
      annualReturnDecimal,
      isSsiEligible,
    });

    return {
      scheduleRows,
      ssiMessages: extractSsiMessages(scheduleRows),
    };
  }, [
    startMonthIndex,
    totalMonths,
    horizonEndIndex,
    startingBalance,
    monthlyContribution,
    monthlyWithdrawal,
    contributionIncreasePct,
    withdrawalIncreasePct,
    contributionEndIndex,
    withdrawalStartIndex,
    annualReturnDecimal,
    isSsiEligible,
    enabled,
  ]);
}
