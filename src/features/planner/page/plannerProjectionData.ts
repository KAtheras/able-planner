import { buildReportAbleRows, buildReportTaxableRows, getAbleMonthlyForDisplay, getTaxableMonthlyForDisplay } from "@/features/planner/report/reportRows";
import { buildReportWindowModel, type ReportWindowOption } from "@/features/planner/report/reportViewModel";
import { enrichScheduleRowsWithBenefits } from "@/features/planner/report/scheduleModel";
import { computeStateBenefitCapped, getFederalIncomeTaxLiability, getStateTaxBenefitConfig, type FilingStatusOption } from "@/features/planner/tax/taxMath";
import { isWtaResolutionPendingForEndingValue as computeWtaResolutionPendingForEndingValue, type WtaMode } from "@/features/planner/inputs/wtaFlow";
import { buildPlannerSchedule } from "@/lib/calc/usePlannerSchedule";
import { buildEndingValueInfo, hasWithdrawalLimitedPlanCode } from "@/lib/planner/messages";
import { buildAccountGrowthNarrative } from "@/lib/report/buildAccountGrowthNarrative";
import type { ReportView } from "@/components/reports/ReportsHeader";

type HorizonConfig = {
  startIndex: number;
  horizonEndIndex: number;
  safeYears: number;
};

export type PlannerProjectionDataParams = {
  timeHorizonYears: string;
  horizonConfig: HorizonConfig;
  calcStartingBalanceInput: string;
  calcMonthlyContributionInput: string;
  calcMonthlyContributionFutureInput: string;
  calcMonthlyWithdrawalInput: string;
  calcContributionIncreasePctInput: string;
  calcWithdrawalIncreasePctInput: string;
  calcAnnualReturnInput: string;
  contributionEndYear: string;
  contributionEndMonth: string;
  withdrawalStartYear: string;
  withdrawalStartMonth: string;
  effectiveEnforcedWithdrawalStartIndex: number | null;
  monthlyContributionNum: number;
  annualContributionLimit: number;
  wtaDismissed: boolean;
  wtaMode: WtaMode;
  baseAnnualLimit: number;
  isSsiEligible: boolean;
  calcAgiValid: boolean;
  calcAgiValue: number;
  plannerFilingStatus: FilingStatusOption;
  beneficiaryStateOfResidence: string;
  planState: string;
  planMaxBalance: number | undefined;
  reportView: ReportView;
  reportWindowYears: ReportWindowOption;
  language: "en" | "es";
  fscStatus: "idle" | "eligible" | "ineligible";
  agiGateEligible: boolean | null;
  agiValid: boolean;
  agiValue: number;
  fscCreditPercent: number;
  fscContributionLimit: number;
  clampNumber: (value: number, min: number, max: number) => number;
  sanitizeAmountInput: (value: string) => string;
  parseMonthYearToIndex: (yearStr: string, monthStr: string) => number | null;
  parsePercentStringToDecimal: (value: string) => number | null;
  formatCurrency: (value: number) => string;
  formatMonthYearLabel: (index: number) => string;
  getMonthsRemainingInCurrentCalendarYear: (startIndex: number) => number;
};

export function buildPlannerProjectionData({
  timeHorizonYears,
  horizonConfig,
  calcStartingBalanceInput,
  calcMonthlyContributionInput,
  calcMonthlyContributionFutureInput,
  calcMonthlyWithdrawalInput,
  calcContributionIncreasePctInput,
  calcWithdrawalIncreasePctInput,
  calcAnnualReturnInput,
  contributionEndYear,
  contributionEndMonth,
  withdrawalStartYear,
  withdrawalStartMonth,
  effectiveEnforcedWithdrawalStartIndex,
  monthlyContributionNum,
  annualContributionLimit,
  wtaDismissed,
  wtaMode,
  baseAnnualLimit,
  isSsiEligible,
  calcAgiValid,
  calcAgiValue,
  plannerFilingStatus,
  beneficiaryStateOfResidence,
  planState,
  planMaxBalance,
  reportView,
  reportWindowYears,
  language,
  fscStatus,
  agiGateEligible,
  agiValid,
  agiValue,
  fscCreditPercent,
  fscContributionLimit,
  clampNumber,
  sanitizeAmountInput,
  parseMonthYearToIndex,
  parsePercentStringToDecimal,
  formatCurrency,
  formatMonthYearLabel,
  getMonthsRemainingInCurrentCalendarYear,
}: PlannerProjectionDataParams) {
  const parsedTimeHorizon = Number(timeHorizonYears.trim());
  const hasTimeHorizon = timeHorizonYears.trim() !== "" && Number.isFinite(parsedTimeHorizon);

  const startIndex = horizonConfig.startIndex;
  const horizonEndIndex = horizonConfig.horizonEndIndex;
  const totalMonths = horizonConfig.safeYears * 12;
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
  const hasConfiguredWithdrawals = monthlyWithdrawalValue > 0;
  const contributionEndRaw = parseMonthYearToIndex(contributionEndYear, contributionEndMonth);
  const contributionEndIndexValue =
    contributionEndRaw !== null
      ? clampNumber(contributionEndRaw, startIndex, horizonEndIndex)
      : horizonEndIndex;
  const withdrawalStartRaw = parseMonthYearToIndex(withdrawalStartYear, withdrawalStartMonth);
  const defaultWithdrawalStartIndex = Math.min(horizonEndIndex, startIndex + 1);
  const enforcedWithdrawalStartIndexValue =
    effectiveEnforcedWithdrawalStartIndex != null
      ? clampNumber(effectiveEnforcedWithdrawalStartIndex, startIndex, horizonEndIndex)
      : null;
  const withdrawalStartIndexValue =
    enforcedWithdrawalStartIndexValue !== null
      ? enforcedWithdrawalStartIndexValue
      : withdrawalStartRaw !== null
      ? clampNumber(withdrawalStartRaw, startIndex, horizonEndIndex)
      : defaultWithdrawalStartIndex;
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

  const monthsRemainingForWtaResolution = getMonthsRemainingInCurrentCalendarYear(startIndex);
  const annualMonthlyBasisForWtaResolution = Number.isFinite(monthlyContributionFutureValue)
    ? monthlyContributionFutureValue
    : monthlyContributionValue;
  const plannedCurrentYearContributionForWtaResolution =
    monthlyContributionValue * monthsRemainingForWtaResolution;
  const plannedAnnualContributionForWtaResolution = annualMonthlyBasisForWtaResolution * 12;
  const isWtaResolutionPendingForEndingValue = computeWtaResolutionPendingForEndingValue({
    wtaDismissed,
    wtaMode,
    plannedCurrentYearContribution: plannedCurrentYearContributionForWtaResolution,
    plannedAnnualContribution: plannedAnnualContributionForWtaResolution,
  });

  const projectionMonthlyContributionCurrent = isWtaResolutionPendingForEndingValue
    ? Math.min(
        monthlyContributionValue,
        Math.floor(baseAnnualLimit / monthsRemainingForWtaResolution),
      )
    : monthlyContributionValue;
  const projectionMonthlyContributionFuture = isWtaResolutionPendingForEndingValue
    ? Math.min(monthlyContributionFutureValue, Math.floor(baseAnnualLimit / 12))
    : monthlyContributionFutureValue;

  const { scheduleRows, ssiMessages, planMessages, taxableRows } = buildPlannerSchedule({
    startMonthIndex: startIndex,
    totalMonths,
    horizonEndIndex,
    startingBalance: startingBalanceValue,
    monthlyContribution: projectionMonthlyContributionCurrent,
    monthlyContributionCurrentYear: projectionMonthlyContributionCurrent,
    monthlyContributionFutureYears: projectionMonthlyContributionFuture,
    monthlyWithdrawal: monthlyWithdrawalValue,
    contributionIncreasePct: Number.isFinite(contributionIncreaseValue)
      ? Math.max(0, contributionIncreaseValue)
      : 0,
    stopContributionIncreasesAfterYear: computedStopContributionIncreasesAfterYear,
    withdrawalIncreasePct: Number.isFinite(withdrawalIncreaseValue)
      ? Math.max(0, withdrawalIncreaseValue)
      : 0,
    contributionEndIndex: contributionEndIndexValue,
    withdrawalStartIndex: withdrawalStartIndexValue,
    annualReturnDecimal: parsePercentStringToDecimal(calcAnnualReturnInput) ?? 0,
    isSsiEligible,
    agi: calcAgiValid ? calcAgiValue : null,
    filingStatus: plannerFilingStatus,
    stateOfResidence: beneficiaryStateOfResidence || null,
    enabled: hasTimeHorizon,
    planMaxBalance,
  });

  const hasWithdrawalLimitedMessage = hasWithdrawalLimitedPlanCode(scheduleRows);
  const endingValueInfo = buildEndingValueInfo({
    scheduleRows,
    hasConfiguredWithdrawals,
    horizonEndIndex,
    formatCurrency,
    formatMonthYearLabel,
  });

  const showFederalSaverCredit =
    fscStatus === "eligible" &&
    agiGateEligible === true &&
    Number.isFinite(fscCreditPercent) &&
    fscCreditPercent > 0 &&
    fscContributionLimit > 0;
  const benefitStateCode = (beneficiaryStateOfResidence || planState || "").toUpperCase();
  const stateBenefitConfig = getStateTaxBenefitConfig(benefitStateCode, plannerFilingStatus);
  const scheduleRowsWithBenefits = enrichScheduleRowsWithBenefits({
    rows: scheduleRows,
    showFederalSaverCredit,
    fscContributionLimit,
    fscCreditPercent,
    getFederalTaxLiability: () =>
      getFederalIncomeTaxLiability(plannerFilingStatus, agiValid ? agiValue : 0),
    getStateBenefitForYear: (contributionsForYear) =>
      computeStateBenefitCapped(
        stateBenefitConfig,
        contributionsForYear,
        agiValid ? agiValue : 0,
        plannerFilingStatus,
        benefitStateCode,
      ),
  });

  const ableMonthlyForDisplay = getAbleMonthlyForDisplay(scheduleRowsWithBenefits);
  const taxableMonthlyForDisplay = getTaxableMonthlyForDisplay(taxableRows);
  const { reportWindowMaxYears, reportWindowYearsValue, reportWindowEndIndex } =
    buildReportWindowModel({
      reportView,
      reportWindowYears,
      startIndex,
      horizonEndIndex: horizonConfig.horizonEndIndex,
      horizonSafeYears: horizonConfig.safeYears,
      ableMonthly: ableMonthlyForDisplay,
      taxableMonthly: taxableMonthlyForDisplay,
    });
  const reportAbleRows = buildReportAbleRows(scheduleRowsWithBenefits, reportWindowEndIndex);
  const reportTaxableRows = buildReportTaxableRows(taxableRows, reportWindowEndIndex);
  const accountGrowthNarrative = buildAccountGrowthNarrative({
    language,
    ableRows: reportAbleRows,
    taxableRows: reportTaxableRows,
  });
  const accountGrowthNarrativeParagraphs = accountGrowthNarrative
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    hasTimeHorizon,
    contributionEndIndexValue,
    scheduleRows,
    ssiMessages,
    planMessages,
    taxableRows,
    hasConfiguredWithdrawals,
    hasWithdrawalLimitedMessage,
    endingValueInfo,
    isWtaResolutionPendingForEndingValue,
    scheduleRowsWithBenefits,
    reportWindowMaxYears,
    reportWindowYearsValue,
    reportAbleRows,
    reportTaxableRows,
    accountGrowthNarrativeParagraphs,
  };
}

export type PlannerProjectionDataResult = ReturnType<typeof buildPlannerProjectionData>;
