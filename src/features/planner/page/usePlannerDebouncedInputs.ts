import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

type PlannerDebouncedInputsParams = {
  startingBalance: string;
  monthlyContribution: string;
  monthlyContributionFuture: string;
  monthlyWithdrawal: string;
  contributionIncreasePct: string;
  withdrawalIncreasePct: string;
  plannerAgi: string;
  annualReturn: string;
  delayMs: number;
};

export function usePlannerDebouncedInputs({
  startingBalance,
  monthlyContribution,
  monthlyContributionFuture,
  monthlyWithdrawal,
  contributionIncreasePct,
  withdrawalIncreasePct,
  plannerAgi,
  annualReturn,
  delayMs,
}: PlannerDebouncedInputsParams) {
  return {
    calcStartingBalanceInput: useDebouncedValue(startingBalance, delayMs),
    calcMonthlyContributionInput: useDebouncedValue(monthlyContribution, delayMs),
    calcMonthlyContributionFutureInput: useDebouncedValue(monthlyContributionFuture, delayMs),
    calcMonthlyWithdrawalInput: useDebouncedValue(monthlyWithdrawal, delayMs),
    calcContributionIncreasePctInput: useDebouncedValue(contributionIncreasePct, delayMs),
    calcWithdrawalIncreasePctInput: useDebouncedValue(withdrawalIncreasePct, delayMs),
    calcPlannerAgiInput: useDebouncedValue(plannerAgi, delayMs),
    calcAnnualReturnInput: useDebouncedValue(annualReturn, delayMs),
  };
}
