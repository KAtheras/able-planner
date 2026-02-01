import { useMemo } from "react";

import {
  buildAmortizationSchedule,
  extractSsiMessages,
  extractPlanMessages,
  type YearRow,
  type SsiMessage,
  type PlanMessage,
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
  planMaxBalance: number | null;
};

export type PlannerScheduleResult = {
  scheduleRows: YearRow[];
  ssiMessages: SsiMessage[];
  planMessages: PlanMessage[];
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
  planMaxBalance,
}: UsePlannerScheduleArgs): PlannerScheduleResult {
  return useMemo(() => {
    if (!enabled) {
      return { scheduleRows: [], ssiMessages: [], planMessages: [] };
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
      planMaxBalance,
    });

    return {
      scheduleRows,
      ssiMessages: extractSsiMessages(scheduleRows),
      planMessages: extractPlanMessages(scheduleRows, planMaxBalance),
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
    planMaxBalance,
    enabled,
  ]);
}
