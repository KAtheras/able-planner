import type { NavKey } from "@/components/layout/Sidebar";
import type { ReportView } from "@/components/reports/ReportsHeader";
import {
  getMonthsRemainingInCurrentCalendarYear,
  WTA_BASE_ANNUAL_LIMIT,
  type WtaStatus,
} from "@/features/planner/inputs/wtaFlow";

type Params = {
  active: NavKey;
  inputStep: 1 | 2;
  plannerAgi: string;
  monthlyContribution: string;
  monthlyContributionFuture: string;
  startingBalance: string;
  beneficiaryStateOfResidence: string;
  planState: string;
  planResidencyRequired: boolean;
  nonResidentProceedAck: boolean;
  wtaStatus: WtaStatus;
  wtaCombinedLimit: number;
  horizonStartIndex: number;
  enabledReportViews: ReportView[];
  reportView: ReportView;
  defaultReportView: ReportView;
};

export function buildMobileNavModel({
  active,
  inputStep,
  plannerAgi,
  monthlyContribution,
  monthlyContributionFuture,
  startingBalance,
  beneficiaryStateOfResidence,
  planState,
  planResidencyRequired,
  nonResidentProceedAck,
  wtaStatus,
  wtaCombinedLimit,
  horizonStartIndex,
  enabledReportViews,
  reportView,
  defaultReportView,
}: Params) {
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
  const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(horizonStartIndex);
  const plannedCurrentYearContribution = monthlyContributionNumber * monthsRemaining;
  const allowedAnnualLimit =
    wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;
  const contributionBreachesNow = plannedCurrentYearContribution > allowedAnnualLimit;
  const contributionBreachesFuture = plannedAnnualContribution > allowedAnnualLimit;
  const hasContributionIssue =
    inputStep === 2 && (contributionBreachesNow || contributionBreachesFuture);

  const startingBalanceNumber = startingBalance === "" ? 0 : Number(startingBalance);
  const hasDriverForProjection =
    (Number.isFinite(startingBalanceNumber) && startingBalanceNumber > 0) ||
    (Number.isFinite(monthlyContributionNumber) && monthlyContributionNumber > 0);

  const residencyMismatch =
    beneficiaryStateOfResidence &&
    planState &&
    beneficiaryStateOfResidence !== planState;
  const residencyBlocking =
    residencyMismatch && (planResidencyRequired || !nonResidentProceedAck);

  const isInputNextDisabled =
    (inputStep === 1 && (!agiValid || residencyBlocking)) ||
    (inputStep === 2 && (hasContributionIssue || !hasDriverForProjection));

  const reportViewIndex = Math.max(0, enabledReportViews.indexOf(reportView));
  const defaultLastReportView =
    enabledReportViews[enabledReportViews.length - 1] ?? defaultReportView;

  const mobileBackDisabled = active === "inputs" && inputStep === 1;
  const mobileNextDisabled = (active === "inputs" && isInputNextDisabled) || active === "disclosures";

  return {
    isInputNextDisabled,
    reportViewIndex,
    defaultLastReportView,
    mobileBackDisabled,
    mobileNextDisabled,
  };
}
