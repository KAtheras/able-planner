import { useMemo } from "react";

import {
  buildAmortizationSchedule,
  buildTaxableInvestmentScheduleFromAbleSchedule,
  extractSsiMessages,
  extractPlanMessages,
  type YearRow,
  type PlanMessage,
  type SsiMessage,
  type TaxableYearRow,
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
  taxableRows: TaxableYearRow[];
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
      return { scheduleRows: [], ssiMessages: [], planMessages: [], taxableRows: [] };
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

    // TODO: wire to user inputs / bracket logic
    const FEDERAL_TAX_RATE_DECIMAL = 0.22;
    const STATE_TAX_RATE_DECIMAL = 0.05;

    return {
      scheduleRows,
      ssiMessages: extractSsiMessages(scheduleRows),
      planMessages: extractPlanMessages(scheduleRows, planMaxBalance),
      taxableRows: buildTaxableInvestmentScheduleFromAbleSchedule({
        ableRows: scheduleRows,
        annualReturnDecimal,
        federalTaxRateDecimal: FEDERAL_TAX_RATE_DECIMAL,
        stateTaxRateDecimal: STATE_TAX_RATE_DECIMAL,
        startingBalance,
      }),
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
