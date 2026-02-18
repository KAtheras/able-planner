import wtaPovertyLevel from "@/config/rules/wtaPovertyLevel.json";

export const WTA_BASE_ANNUAL_LIMIT = 20000;

export type WtaMode = "idle" | "initialPrompt" | "wtaQuestion" | "noPath" | "combinedLimit";
export type WtaStatus = "unknown" | "ineligible" | "eligible";

export function getMonthsRemainingInCurrentCalendarYear(startIndex: number) {
  if (!Number.isFinite(startIndex)) {
    return 12;
  }
  const monthOfYearIndex = ((startIndex % 12) + 12) % 12;
  const remaining = 12 - monthOfYearIndex;
  return remaining > 0 ? remaining : 12;
}

export function getPovertyLevel(state: string) {
  const entry = (wtaPovertyLevel as Record<string, { onePerson: number }>)[state];
  if (entry?.onePerson) return entry.onePerson;
  return wtaPovertyLevel.default.onePerson;
}

export function getBaseLimitBreaches(monthlyContribution: string, startIndex: number) {
  const numeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
  const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(startIndex);
  const plannedCurrentYear = Number.isFinite(numeric) ? numeric * monthsRemaining : 0;
  const plannedAnnual = Number.isFinite(numeric) ? numeric * 12 : 0;
  return {
    breachNow: plannedCurrentYear > WTA_BASE_ANNUAL_LIMIT,
    breachFuture: plannedAnnual > WTA_BASE_ANNUAL_LIMIT,
    plannedAnnual,
  };
}

export function getWtaEligibilityOutcome(params: {
  hasEarnedIncome: boolean | null;
  earnedIncome: string;
  retirementAnswer: boolean;
  plannerStateCode: string;
  monthlyContribution: string;
}) {
  const { hasEarnedIncome, earnedIncome, retirementAnswer, plannerStateCode, monthlyContribution } =
    params;
  const earnedIncomeValue = Number(earnedIncome);

  if (!hasEarnedIncome || Number.isNaN(earnedIncomeValue) || earnedIncomeValue <= 0) {
    return {
      delegateToOverLimitNo: false,
      status: "ineligible" as WtaStatus,
      additionalAllowed: 0,
      combinedLimit: WTA_BASE_ANNUAL_LIMIT,
      mode: "noPath" as WtaMode,
    };
  }

  if (retirementAnswer) {
    return {
      delegateToOverLimitNo: true,
      status: "ineligible" as WtaStatus,
      additionalAllowed: 0,
      combinedLimit: WTA_BASE_ANNUAL_LIMIT,
      mode: "noPath" as WtaMode,
    };
  }

  const povertyLevel = getPovertyLevel(plannerStateCode);
  const additionalAllowed = Math.min(earnedIncomeValue, povertyLevel);
  const combinedLimit = WTA_BASE_ANNUAL_LIMIT + additionalAllowed;
  const monthlyNumeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
  const plannedAnnual = Number.isFinite(monthlyNumeric) ? monthlyNumeric * 12 : 0;

  return {
    delegateToOverLimitNo: false,
    status: "eligible" as WtaStatus,
    additionalAllowed,
    combinedLimit,
    mode: (plannedAnnual > combinedLimit ? "combinedLimit" : "idle") as WtaMode,
  };
}

export function isWtaResolutionPendingForEndingValue(params: {
  wtaDismissed: boolean;
  wtaMode: WtaMode;
  plannedCurrentYearContribution: number;
  plannedAnnualContribution: number;
}) {
  const { wtaDismissed, wtaMode, plannedCurrentYearContribution, plannedAnnualContribution } = params;
  return (
    !wtaDismissed &&
    (wtaMode === "initialPrompt" || wtaMode === "wtaQuestion") &&
    (plannedCurrentYearContribution > WTA_BASE_ANNUAL_LIMIT ||
      plannedAnnualContribution > WTA_BASE_ANNUAL_LIMIT)
  );
}
