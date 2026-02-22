import { useEffect } from "react";

type HorizonConfig = {
  startIndex: number;
  horizonEndIndex: number;
};

type UseProjectionDateSyncParams = {
  plannerStateCode: string;
  timeHorizonYears: string;
  contributionEndTouched: boolean;
  withdrawalStartTouched: boolean;
  contributionEndMonth: string;
  contributionEndYear: string;
  withdrawalStartMonth: string;
  withdrawalStartYear: string;
  contributionEndMaxIndex: number;
  effectiveEnforcedWithdrawalStartIndex: number | null;
  isTimeHorizonEditing: boolean;
  getHorizonConfig: () => HorizonConfig;
  clampNumber: (value: number, min: number, max: number) => number;
  parseMonthYearToIndex: (yearStr: string, monthStr: string) => number | null;
  monthIndexToParts: (index: number) => { year: number; month: number };
  setContributionEndYear: (next: string) => void;
  setContributionEndMonth: (next: string) => void;
  setWithdrawalStartYear: (next: string) => void;
  setWithdrawalStartMonth: (next: string) => void;
};

type UseWtaAutoAdjustRulesParams = {
  monthlyContribution: string;
  monthlyContributionFuture: string;
  timeHorizonYears: string;
  contributionIncreasePct: string;
  wtaStatus: "unknown" | "ineligible" | "eligible";
  wtaCombinedLimit: number;
  wtaDismissed: boolean;
  wtaAutoApplied: boolean;
  baseAnnualLimit: number;
  getHorizonConfig: () => HorizonConfig;
  getMonthsRemainingInCurrentCalendarYear: (startIndex: number) => number;
  applySetToMax: (limit: number) => void;
  setWtaAutoApplied: (next: boolean) => void;
  setWtaMode: (next: "idle" | "initialPrompt" | "wtaQuestion" | "combinedLimit" | "noPath") => void;
};

type UseContributionIncreaseInputLockParams = {
  monthlyContribution: string;
  wtaStatus: "unknown" | "ineligible" | "eligible";
  wtaCombinedLimit: number;
  contributionBreachYear: number | null;
  contributionIncreaseDisabledHelperText?: string;
  baseAnnualLimit: number;
  getHorizonConfig: () => HorizonConfig;
  getMonthsRemainingInCurrentCalendarYear: (startIndex: number) => number;
  setContributionIncreasePct: (next: string) => void;
  setStopContributionIncreasesAfterYear: (next: number | null) => void;
  setContributionIncreaseHelperText: (next: string | undefined) => void;
};

export function useContributionIncreaseInputLock({
  monthlyContribution,
  wtaStatus,
  wtaCombinedLimit,
  contributionBreachYear,
  contributionIncreaseDisabledHelperText,
  baseAnnualLimit,
  getHorizonConfig,
  getMonthsRemainingInCurrentCalendarYear,
  setContributionIncreasePct,
  setStopContributionIncreasesAfterYear,
  setContributionIncreaseHelperText,
}: UseContributionIncreaseInputLockParams) {
  useEffect(() => {
    const numeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      const input = document.getElementById("activity-contribution-increase");
      if (input) {
        input.removeAttribute("readOnly");
        input.removeAttribute("aria-disabled");
        input.setAttribute("tabindex", "0");
        input.classList.remove("pointer-events-none");
      }
      return;
    }
    const { startIndex } = getHorizonConfig();
    const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(startIndex);
    const limit = wtaStatus === "eligible" ? wtaCombinedLimit : baseAnnualLimit;
    if (!Number.isFinite(limit) || limit <= 0) {
      const input = document.getElementById("activity-contribution-increase");
      if (input) {
        input.removeAttribute("readOnly");
        input.removeAttribute("aria-disabled");
        input.setAttribute("tabindex", "0");
        input.classList.remove("pointer-events-none");
      }
      return;
    }
    const currentSliceTotal = numeric * monthsRemaining;
    const futureYearTotal = numeric * 12;
    const meetsLimit = currentSliceTotal >= limit || futureYearTotal >= limit;
    const input = document.getElementById("activity-contribution-increase");
    if (meetsLimit) {
      setContributionIncreasePct("0");
      setStopContributionIncreasesAfterYear(null);
      setContributionIncreaseHelperText(
        contributionIncreaseDisabledHelperText ??
          "Base contributions already meet the annual limit; increases are disabled.",
      );
      if (input) {
        input.setAttribute("readOnly", "true");
        input.setAttribute("aria-disabled", "true");
        input.setAttribute("tabindex", "-1");
        input.classList.add("pointer-events-none");
      }
    } else if (input) {
      input.removeAttribute("readOnly");
      input.removeAttribute("aria-disabled");
      input.setAttribute("tabindex", "0");
      input.classList.remove("pointer-events-none");
    }
    void contributionBreachYear;
  }, [
    contributionBreachYear,
    contributionIncreaseDisabledHelperText,
    getHorizonConfig,
    monthlyContribution,
    wtaCombinedLimit,
    wtaStatus,
    baseAnnualLimit,
    getMonthsRemainingInCurrentCalendarYear,
    setContributionIncreasePct,
    setStopContributionIncreasesAfterYear,
    setContributionIncreaseHelperText,
  ]);
}

type UseWtaModeRulesParams = {
  monthlyContribution: string;
  wtaCombinedLimit: number;
  wtaStatus: "unknown" | "ineligible" | "eligible";
  wtaAutoPromptedForIncrease: boolean;
  wtaMode: "idle" | "initialPrompt" | "wtaQuestion" | "combinedLimit" | "noPath";
  wtaDismissed: boolean;
  baseAnnualLimit: number;
  getHorizonConfig: () => HorizonConfig & { safeYears: number };
  getMonthsRemainingInCurrentCalendarYear: (startIndex: number) => number;
  setWtaMode: (next: "idle" | "initialPrompt" | "wtaQuestion" | "combinedLimit" | "noPath") => void;
  setWtaAutoPromptedForIncrease: (next: boolean) => void;
};

export function useWtaModeRules({
  monthlyContribution,
  wtaCombinedLimit,
  wtaStatus,
  wtaAutoPromptedForIncrease,
  wtaMode,
  wtaDismissed,
  baseAnnualLimit,
  getHorizonConfig,
  getMonthsRemainingInCurrentCalendarYear,
  setWtaMode,
  setWtaAutoPromptedForIncrease,
}: UseWtaModeRulesParams) {
  useEffect(() => {
    const numeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
    const plannedAnnual = Number.isFinite(numeric) ? numeric * 12 : 0;
    const { startIndex, safeYears } = getHorizonConfig();
    const totalMonthsInHorizon = safeYears * 12;
    const monthsRemainingInCurrentCalendarYear = getMonthsRemainingInCurrentCalendarYear(startIndex);
    const plannedCurrentYear = Number.isFinite(numeric)
      ? numeric * monthsRemainingInCurrentCalendarYear
      : 0;
    const monthsBeyondThisYear = Math.max(0, totalMonthsInHorizon - monthsRemainingInCurrentCalendarYear);
    const monthsInNextCalendarYearWithinHorizon = Math.min(12, monthsBeyondThisYear);
    const plannedNextCalendarYear = Number.isFinite(numeric)
      ? numeric * monthsInNextCalendarYearWithinHorizon
      : 0;
    const overBaseLimit =
      plannedCurrentYear > baseAnnualLimit ||
      plannedNextCalendarYear > baseAnnualLimit;

    if (!wtaDismissed && (wtaMode === "noPath" || wtaMode === "combinedLimit")) {
      return;
    }
    if (!wtaDismissed && (wtaMode === "initialPrompt" || wtaMode === "wtaQuestion")) {
      if (overBaseLimit) {
        return;
      }
      setWtaMode("idle");
      return;
    }

    if (wtaStatus === "unknown") {
      // If the current annualized contribution exceeds the base limit, ALWAYS prompt WTA.
      if (overBaseLimit) {
        if (wtaAutoPromptedForIncrease) {
          setWtaAutoPromptedForIncrease(false);
        }
        setWtaMode("initialPrompt");
        return;
      }

      if (wtaAutoPromptedForIncrease) {
        return;
      }

      setWtaMode("idle");
      return;
    }

    if (wtaStatus === "eligible") {
      setWtaMode(
        plannedAnnual > wtaCombinedLimit ? "combinedLimit" : "idle",
      );
      return;
    }

    setWtaMode(
      plannedCurrentYear > baseAnnualLimit || plannedAnnual > baseAnnualLimit
        ? "noPath"
        : "idle",
    );
  }, [
    monthlyContribution,
    getHorizonConfig,
    wtaCombinedLimit,
    wtaStatus,
    wtaAutoPromptedForIncrease,
    wtaMode,
    wtaDismissed,
    baseAnnualLimit,
    getMonthsRemainingInCurrentCalendarYear,
    setWtaMode,
    setWtaAutoPromptedForIncrease,
  ]);
}

export function useWtaAutoAdjustRules({
  monthlyContribution,
  monthlyContributionFuture,
  timeHorizonYears,
  contributionIncreasePct,
  wtaStatus,
  wtaCombinedLimit,
  wtaDismissed,
  wtaAutoApplied,
  baseAnnualLimit,
  getHorizonConfig,
  getMonthsRemainingInCurrentCalendarYear,
  applySetToMax,
  setWtaAutoApplied,
  setWtaMode,
}: UseWtaAutoAdjustRulesParams) {
  useEffect(() => {
    if (wtaDismissed || wtaAutoApplied) {
      return;
    }
    const numeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
    const futureNumeric =
      typeof monthlyContributionFuture === "string" && monthlyContributionFuture !== ""
        ? Number(monthlyContributionFuture)
        : NaN;
    const { startIndex } = getHorizonConfig();
    const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(startIndex);
    const plannedCurrentYear = Number.isFinite(numeric) ? numeric * monthsRemaining : 0;
    const annualBasis =
      Number.isFinite(futureNumeric) && futureNumeric >= 0 ? futureNumeric : numeric;
    const plannedAnnual = Number.isFinite(annualBasis) ? annualBasis * 12 : 0;
    const breachNow = plannedCurrentYear > baseAnnualLimit;
    const breachFuture = plannedAnnual > baseAnnualLimit;
    const ineligibleBreach = wtaStatus === "ineligible" && (breachNow || breachFuture);
    const eligibleCombinedBreach =
      wtaStatus === "eligible" && plannedAnnual > wtaCombinedLimit;

    if (ineligibleBreach) {
      applySetToMax(baseAnnualLimit);
      setWtaAutoApplied(true);
      setWtaMode("noPath");
      return;
    }

    if (eligibleCombinedBreach) {
      applySetToMax(wtaCombinedLimit);
      setWtaAutoApplied(true);
      setWtaMode("combinedLimit");
    }
  }, [
    monthlyContribution,
    monthlyContributionFuture,
    timeHorizonYears,
    contributionIncreasePct,
    wtaStatus,
    wtaCombinedLimit,
    wtaDismissed,
    wtaAutoApplied,
    baseAnnualLimit,
    getHorizonConfig,
    getMonthsRemainingInCurrentCalendarYear,
    applySetToMax,
    setWtaMode,
    setWtaAutoApplied,
  ]);
}

type UseContributionIncreaseRulesParams = {
  annualContributionLimit: number;
  contributionIncreaseBreachHelperText?: string;
  contributionIncreaseDisabledHelperText?: string;
  contributionIncreasePct: string;
  monthlyContributionNum: number;
  timeHorizonYears: string;
  wtaStatus: "unknown" | "ineligible" | "eligible";
  wtaAutoPromptedForIncrease: boolean;
  baseAnnualLimit: number;
  setContributionBreachYear: (next: number | null) => void;
  setContributionIncreaseHelperText: (next: string | undefined) => void;
  setStopContributionIncreasesAfterYear: (next: number | null) => void;
  setWtaAutoPromptedForIncrease: (next: boolean) => void;
  setWtaMode: (next: "idle" | "initialPrompt" | "wtaQuestion" | "combinedLimit" | "noPath") => void;
  setWtaHasEarnedIncome: (next: boolean | null) => void;
  setWtaEarnedIncome: (next: string) => void;
  setWtaRetirementPlan: (next: boolean | null) => void;
  setContributionIncreasePct: (next: string) => void;
};

export function useContributionIncreaseRules({
  annualContributionLimit,
  contributionIncreaseBreachHelperText,
  contributionIncreaseDisabledHelperText,
  contributionIncreasePct,
  monthlyContributionNum,
  timeHorizonYears,
  wtaStatus,
  wtaAutoPromptedForIncrease,
  baseAnnualLimit,
  setContributionBreachYear,
  setContributionIncreaseHelperText,
  setStopContributionIncreasesAfterYear,
  setWtaAutoPromptedForIncrease,
  setWtaMode,
  setWtaHasEarnedIncome,
  setWtaEarnedIncome,
  setWtaRetirementPlan,
  setContributionIncreasePct,
}: UseContributionIncreaseRulesParams) {
  useEffect(() => {
    const pctRaw = Number(contributionIncreasePct);
    if (monthlyContributionNum <= 0 || !Number.isFinite(pctRaw) || pctRaw <= 0) {
      setContributionBreachYear(null);
      setContributionIncreaseHelperText(undefined);
      setStopContributionIncreasesAfterYear(null);
      return;
    }

    const baseAnnual = monthlyContributionNum * 12;
    const pctDecimal = pctRaw / 100;
    const horizonInput = Number(timeHorizonYears);
    if (!Number.isFinite(horizonInput) || horizonInput <= 0) {
      setContributionBreachYear(null);
      setContributionIncreaseHelperText(undefined);
      setStopContributionIncreasesAfterYear(null);
      return;
    }
    const maxYearsToCheck = Math.floor(horizonInput);

    const computeBreachYear = (limit: number): number | null => {
      if (baseAnnual >= limit) {
        return 0;
      }
      for (let year = 1; year <= maxYearsToCheck; year += 1) {
        const projectedAnnual = baseAnnual * Math.pow(1 + pctDecimal, year - 1);
        if (projectedAnnual > limit) {
          return year;
        }
      }
      return null;
    };

    const baseBreachYear = computeBreachYear(baseAnnualLimit);
    const projectionBreachesBaseLimit = baseBreachYear !== null && baseBreachYear > 0;

    if (wtaStatus === "unknown" && !projectionBreachesBaseLimit && wtaAutoPromptedForIncrease) {
      setWtaAutoPromptedForIncrease(false);
    }

    const shouldPromptWtaFromIncrease =
      wtaStatus === "unknown" &&
      projectionBreachesBaseLimit &&
      !wtaAutoPromptedForIncrease;

    if (shouldPromptWtaFromIncrease) {
      setWtaAutoPromptedForIncrease(true);
      setWtaMode("initialPrompt");
      setWtaHasEarnedIncome(null);
      setWtaEarnedIncome("");
      setWtaRetirementPlan(null);
      setContributionBreachYear(null);
      setContributionIncreaseHelperText(undefined);
      setStopContributionIncreasesAfterYear(null);
      return;
    }

    if (wtaStatus === "unknown") {
      setContributionBreachYear(null);
      setContributionIncreaseHelperText(undefined);
      setStopContributionIncreasesAfterYear(null);
      return;
    }

    if (annualContributionLimit <= 0) {
      setContributionBreachYear(null);
      setContributionIncreaseHelperText(undefined);
      setStopContributionIncreasesAfterYear(null);
      return;
    }

    const limitBreachYear = computeBreachYear(annualContributionLimit);
    if (limitBreachYear === null) {
      setContributionBreachYear(null);
      setContributionIncreaseHelperText(undefined);
      setStopContributionIncreasesAfterYear(null);
      return;
    }

    setContributionBreachYear(limitBreachYear);
    setStopContributionIncreasesAfterYear(limitBreachYear > 0 ? limitBreachYear - 1 : null);

    if (limitBreachYear === 0) {
      setContributionIncreasePct("0");
      setStopContributionIncreasesAfterYear(null);
      setContributionIncreaseHelperText(
        contributionIncreaseDisabledHelperText ??
          "Base contributions already meet the annual limit; increases are disabled.",
      );
      return;
    }

    setContributionIncreaseHelperText(
      (contributionIncreaseBreachHelperText ??
        "At {{pct}}%, contributions exceed the annual limit in year {{breachYear}}. Contribution increases will stop after year {{stopYear}}.")
        .replace("{{pct}}", contributionIncreasePct)
        .replace("{{breachYear}}", String(limitBreachYear))
        .replace("{{stopYear}}", String(limitBreachYear - 1)),
    );
  }, [
    annualContributionLimit,
    contributionIncreaseBreachHelperText,
    contributionIncreaseDisabledHelperText,
    contributionIncreasePct,
    monthlyContributionNum,
    timeHorizonYears,
    wtaStatus,
    wtaAutoPromptedForIncrease,
    baseAnnualLimit,
    setContributionBreachYear,
    setContributionIncreaseHelperText,
    setStopContributionIncreasesAfterYear,
    setWtaAutoPromptedForIncrease,
    setWtaMode,
    setWtaHasEarnedIncome,
    setWtaEarnedIncome,
    setWtaRetirementPlan,
    setContributionIncreasePct,
  ]);
}

export function useProjectionDateSync({
  plannerStateCode,
  timeHorizonYears,
  contributionEndTouched,
  withdrawalStartTouched,
  contributionEndMonth,
  contributionEndYear,
  withdrawalStartMonth,
  withdrawalStartYear,
  contributionEndMaxIndex,
  effectiveEnforcedWithdrawalStartIndex,
  isTimeHorizonEditing,
  getHorizonConfig,
  clampNumber,
  parseMonthYearToIndex,
  monthIndexToParts,
  setContributionEndYear,
  setContributionEndMonth,
  setWithdrawalStartYear,
  setWithdrawalStartMonth,
}: UseProjectionDateSyncParams) {
  useEffect(() => {
    if (isTimeHorizonEditing) {
      return;
    }
    const { startIndex, horizonEndIndex } = getHorizonConfig();
    const minIndex = startIndex;
    const contributionMaxIndex = Math.max(startIndex, contributionEndMaxIndex);
    const defaultWithdrawalStartIndex = Math.min(horizonEndIndex, startIndex + 1);
    const withdrawalEnforcedIndex =
      effectiveEnforcedWithdrawalStartIndex != null
        ? clampNumber(effectiveEnforcedWithdrawalStartIndex, startIndex, horizonEndIndex)
        : null;
    const withdrawalMaxIndex = withdrawalEnforcedIndex ?? Math.max(startIndex, horizonEndIndex);
    const withdrawalDefaultIndex = withdrawalEnforcedIndex ?? defaultWithdrawalStartIndex;

    const setContributionFromIndex = (index: number) => {
      const { year, month } = monthIndexToParts(index);
      const nextYear = String(year);
      const nextMonth = String(month).padStart(2, "0");
      if (contributionEndYear !== nextYear) setContributionEndYear(nextYear);
      if (contributionEndMonth !== nextMonth) setContributionEndMonth(nextMonth);
    };

    const setWithdrawalFromIndex = (index: number) => {
      const { year, month } = monthIndexToParts(index);
      const nextYear = String(year);
      const nextMonth = String(month).padStart(2, "0");
      if (withdrawalStartYear !== nextYear) setWithdrawalStartYear(nextYear);
      if (withdrawalStartMonth !== nextMonth) setWithdrawalStartMonth(nextMonth);
    };

    const contributionIndex = parseMonthYearToIndex(contributionEndYear, contributionEndMonth);
    if (!contributionEndTouched || contributionIndex === null) {
      setContributionFromIndex(contributionMaxIndex);
    } else {
      const clamped = clampNumber(contributionIndex, minIndex, contributionMaxIndex);
      if (clamped !== contributionIndex) {
        setContributionFromIndex(clamped);
      }
    }

    const withdrawalIndex = parseMonthYearToIndex(withdrawalStartYear, withdrawalStartMonth);
    if (withdrawalEnforcedIndex !== null) {
      if (withdrawalIndex !== withdrawalEnforcedIndex) {
        setWithdrawalFromIndex(withdrawalEnforcedIndex);
      }
    } else if (!withdrawalStartTouched || withdrawalIndex === null) {
      setWithdrawalFromIndex(withdrawalDefaultIndex);
    } else {
      const clamped = clampNumber(withdrawalIndex, minIndex, withdrawalMaxIndex);
      if (clamped !== withdrawalIndex) {
        setWithdrawalFromIndex(clamped);
      }
    }
  }, [
    plannerStateCode,
    timeHorizonYears,
    contributionEndTouched,
    withdrawalStartTouched,
    contributionEndMonth,
    contributionEndYear,
    withdrawalStartMonth,
    withdrawalStartYear,
    getHorizonConfig,
    contributionEndMaxIndex,
    effectiveEnforcedWithdrawalStartIndex,
    isTimeHorizonEditing,
    clampNumber,
    parseMonthYearToIndex,
    monthIndexToParts,
    setContributionEndYear,
    setContributionEndMonth,
    setWithdrawalStartYear,
    setWithdrawalStartMonth,
  ]);
}
