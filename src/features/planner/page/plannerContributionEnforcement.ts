import { buildPlannerSchedule } from "@/lib/calc/usePlannerSchedule";

type HorizonConfig = {
  safeYears: number;
  startIndex: number;
  horizonEndIndex: number;
};

type ContributionEnforcementParams = {
  contributionConstraintHorizon: HorizonConfig;
  sanitizeAmountInput: (value: string) => string;
  calcStartingBalanceInput: string;
  calcMonthlyContributionInput: string;
  calcMonthlyContributionFutureInput: string;
  calcMonthlyWithdrawalInput: string;
  calcContributionIncreasePctInput: string;
  calcWithdrawalIncreasePctInput: string;
  monthlyContributionNum: number;
  timeHorizonYears: string;
  annualContributionLimit: number;
  calcPlannerAgiInput: string;
  contributionEndTouched: boolean;
  manualContributionEndYear: string;
  manualContributionEndMonth: string;
  withdrawalStartTouched: boolean;
  manualWithdrawalStartYear: string;
  manualWithdrawalStartMonth: string;
  parseMonthYearToIndex: (year: string, month: string) => number | null;
  clampNumber: (value: number, min: number, max: number) => number;
  parsePercentStringToDecimal: (value: string) => number | null;
  calcAnnualReturnInput: string;
  isSsiEligible: boolean;
  plannerFilingStatus: "single" | "married_joint" | "married_separate" | "head_of_household";
  beneficiaryStateOfResidence: string;
  planMaxBalance: number | null;
};

export function getPlannerContributionEnforcement({
  contributionConstraintHorizon,
  sanitizeAmountInput,
  calcStartingBalanceInput,
  calcMonthlyContributionInput,
  calcMonthlyContributionFutureInput,
  calcMonthlyWithdrawalInput,
  calcContributionIncreasePctInput,
  calcWithdrawalIncreasePctInput,
  monthlyContributionNum,
  timeHorizonYears,
  annualContributionLimit,
  calcPlannerAgiInput,
  contributionEndTouched,
  manualContributionEndYear,
  manualContributionEndMonth,
  withdrawalStartTouched,
  manualWithdrawalStartYear,
  manualWithdrawalStartMonth,
  parseMonthYearToIndex,
  clampNumber,
  parsePercentStringToDecimal,
  calcAnnualReturnInput,
  isSsiEligible,
  plannerFilingStatus,
  beneficiaryStateOfResidence,
  planMaxBalance,
}: ContributionEnforcementParams) {
  const startIndex = contributionConstraintHorizon.startIndex;
  const horizonEndIndex = contributionConstraintHorizon.horizonEndIndex;
  const totalMonths = contributionConstraintHorizon.safeYears * 12;
  if (totalMonths <= 0) {
    return {
      enforcedPlanContributionStopIndex: null as number | null,
      enforcedSsiContributionStopIndex: null as number | null,
      enforcedWithdrawalStartIndex: null as number | null,
    };
  }

  const parseAmount = (value: string) => {
    const cleaned = sanitizeAmountInput(value);
    const numeric = Number(cleaned || "0");
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric);
  };

  const startingBalanceValue = parseAmount(calcStartingBalanceInput);
  const monthlyContributionValue = parseAmount(calcMonthlyContributionInput);
  const monthlyContributionFutureValue =
    calcMonthlyContributionFutureInput !== ""
      ? parseAmount(calcMonthlyContributionFutureInput)
      : monthlyContributionValue;
  const monthlyWithdrawalValue = parseAmount(calcMonthlyWithdrawalInput);
  const contributionIncreaseValue = Number(calcContributionIncreasePctInput);
  const withdrawalIncreaseValue = Number(calcWithdrawalIncreasePctInput);

  const computedStopContributionIncreasesAfterYear = (() => {
    const pctRaw = Number(calcContributionIncreasePctInput);
    if (monthlyContributionNum <= 0 || !Number.isFinite(pctRaw) || pctRaw <= 0) return null;
    const horizonInput = Number(timeHorizonYears);
    if (!Number.isFinite(horizonInput) || horizonInput <= 0) return null;
    const limit = annualContributionLimit;
    if (!Number.isFinite(limit) || limit <= 0) return null;

    const baseAnnual = monthlyContributionNum * 12;
    if (baseAnnual >= limit) return 0;

    const pctDecimal = pctRaw / 100;
    const maxYearsToCheck = Math.floor(horizonInput);
    for (let year = 1; year <= maxYearsToCheck; year += 1) {
      const projectedAnnual = baseAnnual * Math.pow(1 + pctDecimal, year - 1);
      if (projectedAnnual > limit) {
        return year - 1;
      }
    }
    return null;
  })();

  const agiValue = Number(calcPlannerAgiInput);
  const agiIsValid =
    calcPlannerAgiInput !== "" && !Number.isNaN(agiValue) && (agiValue > 0 || agiValue === 0);
  const contributionEndRawForEnforcement =
    contributionEndTouched
      ? parseMonthYearToIndex(manualContributionEndYear, manualContributionEndMonth)
      : null;
  const contributionEndIndexForEnforcement =
    contributionEndRawForEnforcement !== null
      ? clampNumber(contributionEndRawForEnforcement, startIndex, horizonEndIndex)
      : horizonEndIndex;
  const defaultWithdrawalStartIndex = Math.min(horizonEndIndex, startIndex + 1);
  const withdrawalStartRawForEnforcement =
    withdrawalStartTouched
      ? parseMonthYearToIndex(manualWithdrawalStartYear, manualWithdrawalStartMonth)
      : null;
  const withdrawalStartIndexForEnforcement =
    withdrawalStartRawForEnforcement !== null
      ? clampNumber(withdrawalStartRawForEnforcement, startIndex, horizonEndIndex)
      : defaultWithdrawalStartIndex;

  const { scheduleRows: unconstrainedContributionRows } = buildPlannerSchedule({
    startMonthIndex: startIndex,
    totalMonths,
    horizonEndIndex,
    startingBalance: startingBalanceValue,
    monthlyContribution: monthlyContributionValue,
    monthlyContributionCurrentYear: monthlyContributionValue,
    monthlyContributionFutureYears: monthlyContributionFutureValue,
    monthlyWithdrawal: monthlyWithdrawalValue,
    contributionIncreasePct: Number.isFinite(contributionIncreaseValue)
      ? Math.max(0, contributionIncreaseValue)
      : 0,
    stopContributionIncreasesAfterYear: computedStopContributionIncreasesAfterYear,
    withdrawalIncreasePct: Number.isFinite(withdrawalIncreaseValue)
      ? Math.max(0, withdrawalIncreaseValue)
      : 0,
    contributionEndIndex: contributionEndIndexForEnforcement,
    withdrawalStartIndex: withdrawalStartIndexForEnforcement,
    annualReturnDecimal: parsePercentStringToDecimal(calcAnnualReturnInput) ?? 0,
    isSsiEligible,
    agi: agiIsValid ? agiValue : null,
    filingStatus: plannerFilingStatus,
    stateOfResidence: beneficiaryStateOfResidence || null,
    enabled: true,
    planMaxBalance,
  });

  let nextPlanContributionStopIndex: number | null = null;
  let nextSsiContributionStopIndex: number | null = null;
  let nextWithdrawalStartIndex: number | null = null;

  for (const yearRow of unconstrainedContributionRows) {
    for (const monthRow of yearRow.months) {
      const hitSsiStop = monthRow.ssiCodes?.includes("SSI_CONTRIBUTIONS_STOPPED") ?? false;
      const hitPlanStop = monthRow.planCodes?.includes("PLAN_MAX_CONTRIBUTIONS_STOPPED") ?? false;
      const hitSsiForcedWithdrawal =
        monthRow.ssiCodes?.includes("SSI_FORCED_WITHDRAWALS_APPLIED") ?? false;

      if (nextPlanContributionStopIndex === null && hitPlanStop) {
        nextPlanContributionStopIndex = monthRow.monthIndex;
      }
      if (nextSsiContributionStopIndex === null && hitSsiStop) {
        nextSsiContributionStopIndex = monthRow.monthIndex;
      }
      if (nextWithdrawalStartIndex === null && hitSsiForcedWithdrawal) {
        nextWithdrawalStartIndex = monthRow.monthIndex;
      }
      if (
        nextPlanContributionStopIndex !== null &&
        nextSsiContributionStopIndex !== null &&
        nextWithdrawalStartIndex !== null
      ) {
        break;
      }
    }
    if (
      nextPlanContributionStopIndex !== null &&
      nextSsiContributionStopIndex !== null &&
      nextWithdrawalStartIndex !== null
    ) {
      break;
    }
  }

  return {
    enforcedPlanContributionStopIndex: nextPlanContributionStopIndex,
    enforcedSsiContributionStopIndex: nextSsiContributionStopIndex,
    enforcedWithdrawalStartIndex: nextWithdrawalStartIndex,
  };
}
