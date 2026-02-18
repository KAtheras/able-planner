import {
  getMonthsRemainingInCurrentCalendarYear,
  WTA_BASE_ANNUAL_LIMIT,
  type WtaStatus,
} from "@/features/planner/inputs/wtaFlow";

export type HorizonLimits = {
  minYears: number;
  maxYears: number;
};

type BuildInputsContentModelParams = {
  plannerAgi: string;
  monthlyContribution: string;
  monthlyContributionFuture: string;
  startingBalance: string;
  inputStep: 1 | 2;
  beneficiaryStateOfResidence: string;
  planState: string;
  planResidencyRequired: boolean;
  nonResidentProceedAck: boolean;
  wtaStatus: WtaStatus;
  wtaCombinedLimit: number;
  horizonStartIndex: number;
};

export function buildInputsContentModel({
  plannerAgi,
  monthlyContribution,
  monthlyContributionFuture,
  startingBalance,
  inputStep,
  beneficiaryStateOfResidence,
  planState,
  planResidencyRequired,
  nonResidentProceedAck,
  wtaStatus,
  wtaCombinedLimit,
  horizonStartIndex,
}: BuildInputsContentModelParams) {
  const agiValue = Number(plannerAgi);
  const agiValid =
    plannerAgi !== "" && !Number.isNaN(agiValue) && (agiValue > 0 || agiValue === 0);

  const monthlyContributionNumber = monthlyContribution === "" ? 0 : Number(monthlyContribution);
  const monthlyContributionFutureNumber =
    typeof monthlyContributionFuture === "string" && monthlyContributionFuture !== ""
      ? Number(monthlyContributionFuture)
      : NaN;
  const annualMonthlyBasis = Number.isFinite(monthlyContributionFutureNumber)
    ? monthlyContributionFutureNumber
    : monthlyContributionNumber;
  const plannedAnnualContribution = Number.isFinite(annualMonthlyBasis)
    ? annualMonthlyBasis * 12
    : 0;
  const monthsRemainingInCurrentCalendarYear = getMonthsRemainingInCurrentCalendarYear(
    horizonStartIndex,
  );
  const plannedCurrentYearContribution =
    monthlyContributionNumber * monthsRemainingInCurrentCalendarYear;
  const allowedAnnualLimit =
    wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;
  const breachNow = plannedCurrentYearContribution > allowedAnnualLimit;
  const breachFuture = plannedAnnualContribution > allowedAnnualLimit;
  const baseMeetsOrExceedsLimitNow = (() => {
    if (!Number.isFinite(monthlyContributionNumber) || monthlyContributionNumber <= 0) return false;
    if (!Number.isFinite(allowedAnnualLimit) || allowedAnnualLimit <= 0) return false;
    const currentSliceTotal = monthlyContributionNumber * monthsRemainingInCurrentCalendarYear;
    const futureYearTotal = monthlyContributionNumber * 12;
    return currentSliceTotal >= allowedAnnualLimit || futureYearTotal >= allowedAnnualLimit;
  })();

  const contributionIncreaseDisabledNow = baseMeetsOrExceedsLimitNow;
  const hasContributionIssue = inputStep === 2 && (breachNow || breachFuture);
  const startingBalanceNumber = startingBalance === "" ? 0 : Number(startingBalance);
  const hasDriverForProjection =
    (Number.isFinite(startingBalanceNumber) && startingBalanceNumber > 0) ||
    (Number.isFinite(monthlyContributionNumber) && monthlyContributionNumber > 0);
  const residencyMismatch = Boolean(
    beneficiaryStateOfResidence &&
    planState &&
    beneficiaryStateOfResidence !== planState,
  );
  const residencyBlocking =
    residencyMismatch && (planResidencyRequired || !nonResidentProceedAck);
  const isNextDisabled =
    (inputStep === 1 && (!agiValid || residencyBlocking)) ||
    (inputStep === 2 && (hasContributionIssue || !hasDriverForProjection));

  return {
    agiValid,
    contributionIncreaseDisabledNow,
    hasContributionIssue,
    hasDriverForProjection,
    residencyBlocking,
    residencyMismatch,
    isNextDisabled,
  };
}

export function deriveMonthlyCaps(limit: number, startIndex: number) {
  const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(startIndex);
  const currentYearMaxMonthly = Math.floor(limit / monthsRemaining);
  const futureYearMaxMonthly = Math.floor(limit / 12);
  return { currentYearMaxMonthly, futureYearMaxMonthly };
}

export function buildMonthOptions(language: "en" | "es") {
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2020, i, 1);
    return {
      value: String(i + 1).padStart(2, "0"),
      label: new Intl.DateTimeFormat(language === "es" ? "es" : "en", { month: "long" }).format(
        date,
      ),
    };
  });
}

export function clampTimeHorizonYears(params: {
  timeHorizonYears: string;
  horizonLimits: HorizonLimits;
  parseIntegerInput: (value: string) => number | null;
}) {
  const { timeHorizonYears, horizonLimits, parseIntegerInput } = params;
  const { minYears, maxYears } = horizonLimits;
  if (timeHorizonYears === "") return timeHorizonYears;
  const parsed = parseIntegerInput(timeHorizonYears);
  if (parsed === null) return timeHorizonYears;
  let next = parsed;
  if (next < minYears) next = minYears;
  if (next > maxYears) next = maxYears;
  return String(next);
}
