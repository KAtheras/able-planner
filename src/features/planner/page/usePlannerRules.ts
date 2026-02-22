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
