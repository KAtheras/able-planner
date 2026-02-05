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
import federalTaxBrackets from "@/config/rules/federalTaxBrackets.json";
import stateTaxRates from "@/config/rules/stateTaxRates.json";

type FilingStatusKey = "single" | "married_joint" | "married_separate" | "head_of_household";

type BracketEntry = {
  min?: number;
  max?: number;
  rate: number;
};

const clampRate = (rate: number): number => {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(0.7, Math.max(0, rate));
};

const findBracketRate = (entries: BracketEntry[], agi: number): number | null => {
  if (!entries.length) return null;
  for (const entry of entries) {
    const min = Number.isFinite(entry.min ?? 0) ? entry.min! : 0;
    const max = Number.isFinite(entry.max ?? NaN) ? entry.max! : undefined;
    if (agi >= min && (max === undefined || agi <= max)) {
      return entry.rate;
    }
  }
  const last = entries[entries.length - 1];
  return last?.rate ?? null;
};

const getFederalMarginalRateDecimal = (agi: number, filingStatus: FilingStatusKey): number => {
  if (!Number.isFinite(agi) || agi <= 0) return 0;
  const normalizedStatus = filingStatus ?? "single";
  const entries =
    (federalTaxBrackets as Record<string, BracketEntry[]>)[normalizedStatus] ??
    (federalTaxBrackets as Record<string, BracketEntry[]>)["single"] ??
    [];
  const rate = findBracketRate(entries, agi);
  return clampRate(rate ?? 0);
};

const getStateMarginalRateDecimal = (
  agi: number,
  stateCode: string,
  filingStatus: FilingStatusKey,
): number => {
  if (!Number.isFinite(agi) || agi <= 0) return 0;
  const upperState = (stateCode ?? "").toUpperCase();
  const stateConfig =
    (stateTaxRates as Record<string, Record<FilingStatusKey, BracketEntry[]>>)[upperState] ??
    (stateTaxRates as Record<string, Record<FilingStatusKey, BracketEntry[]>>)["default"];
  if (!stateConfig) return 0;
  const entries =
    stateConfig[filingStatus] ??
    stateConfig.single ??
    stateConfig.married_joint ??
    stateConfig.married_separate ??
    stateConfig.head_of_household ??
    Object.values(stateConfig)[0] ??
    [];
  const rate = findBracketRate(entries, agi);
  return clampRate(rate ?? 0);
};

export type UsePlannerScheduleArgs = {
  startMonthIndex: number;
  totalMonths: number;
  horizonEndIndex: number;
  startingBalance: number;
  monthlyContribution: number;
  monthlyContributionCurrentYear?: number;
  monthlyContributionFutureYears?: number;
  monthlyWithdrawal: number;
  contributionIncreasePct: number;
  stopContributionIncreasesAfterYear?: number | null;
  withdrawalIncreasePct: number;
  contributionEndIndex: number;
  withdrawalStartIndex: number;
  annualReturnDecimal: number;
  isSsiEligible: boolean;
  agi?: number | null;
  filingStatus?: FilingStatusKey | null;
  stateOfResidence?: string | null;
  enabled: boolean;
  planMaxBalance: number | null;
};

export type PlannerScheduleResult = {
  scheduleRows: YearRow[];
  ssiMessages: SsiMessage[];
  planMessages: PlanMessage[];
  taxableRows: TaxableYearRow[];
};

export function buildPlannerSchedule({
  startMonthIndex,
  totalMonths,
  horizonEndIndex,
  startingBalance,
  monthlyContribution,
  // Default to the single monthlyContribution when per-period overrides are not provided.
  monthlyContributionCurrentYear = monthlyContribution,
  monthlyContributionFutureYears = monthlyContribution,
  monthlyWithdrawal,
  contributionIncreasePct,
  stopContributionIncreasesAfterYear,
  withdrawalIncreasePct,
  contributionEndIndex,
  withdrawalStartIndex,
  annualReturnDecimal,
  isSsiEligible,
  agi,
  filingStatus,
  stateOfResidence,
  enabled,
  planMaxBalance,
}: UsePlannerScheduleArgs): PlannerScheduleResult {
  if (!enabled) {
    return { scheduleRows: [], ssiMessages: [], planMessages: [], taxableRows: [] };
  }

  const scheduleRows = buildAmortizationSchedule({
    startMonthIndex,
    totalMonths,
    horizonEndIndex,
    startingBalance,
    monthlyContribution,
    monthlyContributionCurrentYear,
    monthlyContributionFutureYears,
    monthlyWithdrawal,
    contributionIncreasePct,
    stopContributionIncreasesAfterYear,
    withdrawalIncreasePct,
    contributionEndIndex,
    withdrawalStartIndex,
    annualReturnDecimal,
    isSsiEligible,
    planMaxBalance,
  });

  const agiNumber = Number.isFinite(agi ?? NaN) ? Math.max(0, agi ?? 0) : 0;
  const resolvedFiling = (filingStatus ?? "single") as FilingStatusKey;
  const resolvedState = stateOfResidence ?? "";
  const federalTaxRateDecimal = getFederalMarginalRateDecimal(agiNumber, resolvedFiling);
  const stateTaxRateDecimal = getStateMarginalRateDecimal(agiNumber, resolvedState, resolvedFiling);

  return {
    scheduleRows,
    ssiMessages: extractSsiMessages(scheduleRows),
    planMessages: extractPlanMessages(scheduleRows, planMaxBalance),
    taxableRows: buildTaxableInvestmentScheduleFromAbleSchedule({
      ableRows: scheduleRows,
      annualReturnDecimal,
      federalTaxRateDecimal,
      stateTaxRateDecimal,
    }),
  };
}
