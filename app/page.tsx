"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { getCopy, type SupportedLanguage } from "@/copy";
import { getClientConfig } from "@/config/clients";
import ResidencyWarningCard from "@/components/inputs/ResidencyWarningCard";
import Screen2MessagesPanel from "@/components/inputs/Screen2MessagesPanel";
import Screen2WtaPanel from "@/components/inputs/Screen2WtaPanel";
import QualifiedWithdrawalsBudgetPanel from "@/components/inputs/QualifiedWithdrawalsBudgetPanel";
import PlannerNoticeCard from "@/components/inputs/PlannerNoticeCard";
import type { ReportView } from "@/components/reports/ReportsHeader";
import { resetPlannerInputs } from "@/features/planner/actions/resetPlannerInputs";
import {
  buildInputsContentModel,
  buildMonthOptions,
  clampTimeHorizonYears,
  deriveMonthlyCaps,
} from "@/features/planner/content/contentModel";
import DisclosuresSection from "@/features/planner/content/DisclosuresSection";
import InputsLeftPane from "@/features/planner/content/InputsLeftPane";
import InputsRightPane from "@/features/planner/content/InputsRightPane";
import { InputsDesktopHeader, InputsTwoColumnShell } from "@/features/planner/content/InputsSectionLayout";
import ReportsSection from "@/features/planner/content/ReportsSection";
import ScheduleSection from "@/features/planner/content/ScheduleSection";
import WelcomeSection from "@/features/planner/content/WelcomeSection";
import { usePlannerUiEffects } from "@/features/planner/effects/usePlannerUiEffects";
import {
  buildFscQuestions,
  EMPTY_FSC,
  getFscButtonLabel,
  getVisibleFscQuestions,
  isLastFscQuestion,
  shouldDisqualifyFscAnswer,
  type FscAnswers,
} from "@/features/planner/inputs/fscFlow";
import {
  getBaseLimitBreaches,
  getMonthsRemainingInCurrentCalendarYear,
  getWtaEligibilityOutcome,
  isWtaResolutionPendingForEndingValue as computeWtaResolutionPendingForEndingValue,
  WTA_BASE_ANNUAL_LIMIT,
  type WtaMode,
  type WtaStatus,
} from "@/features/planner/inputs/wtaFlow";
import { buildMobileNavModel } from "@/features/planner/navigation/mobileNavModel";
import {
  buildReportWindowModel,
  getEnabledReportViews,
  type ReportWindowOption,
} from "@/features/planner/report/reportViewModel";
import {
  buildReportAbleRows,
  buildReportTaxableRows,
  getAbleMonthlyForDisplay,
  getTaxableMonthlyForDisplay,
} from "@/features/planner/report/reportRows";
import { enrichScheduleRowsWithBenefits } from "@/features/planner/report/scheduleModel";
import {
  computeStateBenefitCapped,
  getFederalIncomeTaxLiability,
  getStateTaxBenefitConfig,
} from "@/features/planner/tax/taxMath";
import federalSaversCreditBrackets from "@/config/rules/federalSaversCreditBrackets.json";
import federalSaversContributionLimits from "@/config/rules/federalSaversContributionLimits.json";
import planLevelInfo from "@/config/rules/planLevelInfo.json";
import ssiIncomeWarningThresholds from "@/config/rules/ssiIncomeWarningThresholds.json";
import { buildAccountGrowthNarrative } from "@/lib/report/buildAccountGrowthNarrative";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";
import {
  downloadAbleScheduleCsv as exportAbleScheduleCsv,
  downloadTaxableScheduleCsv as exportTaxableScheduleCsv,
} from "@/lib/report/exportScheduleCsv";
import {
  buildEndingValueInfo,
  hasWithdrawalLimitedPlanCode,
  shouldShowStandaloneWithdrawalLimitedMessage,
} from "@/lib/planner/messages";
import { useQualifiedWithdrawalBudget } from "@/lib/inputs/useQualifiedWithdrawalBudget";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

type ClientBlocks = Partial<
  Record<
    "landingWelcome" | "disclosuresAssumptions" | "rightCardPrimary" | "rightCardSecondary",
    Partial<Record<SupportedLanguage, string>>
  >
>;
type ClientLandingContent = Partial<{
  heroTitle: string;
  heroBody: string;
  heroBullets: string[];
  disclosuresTitle: string;
  disclosuresIntro: string;
  disclosuresBody: string;
  agreeToTermsPrefix: string;
  agreeAndContinueLabel: string;
  termsOfUseLinkLabel: string;
  termsOfUseTitle: string;
  termsOfUseBody: string;
}>;
type ClientLandingOverrides = Partial<Record<SupportedLanguage, ClientLandingContent>>;

function resolveDefaultMessages(
  override: string,
  fallback: string[] | undefined,
  defaultMessages: string[],
): string[] {
  if (override) {
    return override
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [...(fallback ?? defaultMessages)];
}

import { buildPlannerSchedule } from "@/lib/calc/usePlannerSchedule";

const WELCOME_KEY = "ablePlannerWelcomeAcknowledged";
const INPUT_DEBOUNCE_MS = 900;

type FilingStatusOption = "single" | "married_joint" | "married_separate" | "head_of_household";
type PlannerState = string;

const INITIAL_MESSAGES: string[] = ["", "", "", ""];

const SCREEN2_DEFAULT_MESSAGES: string[] = ["", "", "", "", ""];


const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type FederalSaverBracketEntry = (typeof federalSaversCreditBrackets)[number];

function getFederalSaverCreditPercent(status: FilingStatusOption, agi: number) {
  for (const bracket of federalSaversCreditBrackets as FederalSaverBracketEntry[]) {
    const info = bracket.brackets[status];
    if (!info) continue;
    if (info.type === "max" && agi <= info.value!) {
      return bracket.creditRate;
    }
    if (info.type === "range" && agi >= info.min! && agi <= info.max!) {
      return bracket.creditRate;
    }
    if (info.type === "min" && agi > info.value!) {
      return bracket.creditRate;
    }
  }
  return 0;
}

export default function Home() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [active, setActive] = useState<NavKey>("inputs");
  const [reportView, setReportView] = useState<ReportView>("account_growth");
  const [reportWindowYears, setReportWindowYears] = useState<ReportWindowOption>("max");
  const [plannerStateCode, setPlannerStateCode] = useState<PlannerState>("default");
  const [inputStep, setInputStep] = useState<1 | 2>(1);
  const [plannerAgi, setPlannerAgi] = useState("");
  const [plannerFilingStatus, setPlannerFilingStatus] = useState<FilingStatusOption>("single");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryStateOfResidence, setBeneficiaryStateOfResidence] = useState("");
  const [annualReturn, setAnnualReturn] = useState("");
  const [annualReturnEdited, setAnnualReturnEdited] = useState(false);
  const [annualReturnWarningMax, setAnnualReturnWarningMax] = useState<number | null>(null);
  const [timeHorizonYears, setTimeHorizonYears] = useState("");
  const [timeHorizonEdited, setTimeHorizonEdited] = useState(false);
  const copy = getCopy(language);
  const annualReturnWarningText =
    annualReturnWarningMax === null
      ? null
      : (copy?.labels?.highReturnWarning ?? "")
          .replace("{{max}}", formatDecimalToPercentString(annualReturnWarningMax));

  const [nonResidentProceedAck, setNonResidentProceedAck] = useState(false);
  const [isSsiEligible, setIsSsiEligible] = useState(false);
  const [startingBalance, setStartingBalance] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [monthlyContributionFuture, setMonthlyContributionFuture] = useState("");
  const [contributionEndYear, setContributionEndYear] = useState("");
  const [contributionEndMonth, setContributionEndMonth] = useState("");
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState("");
  const [withdrawalStartYear, setWithdrawalStartYear] = useState("");
  const [withdrawalStartMonth, setWithdrawalStartMonth] = useState("");
  const [contributionIncreasePct, setContributionIncreasePct] = useState("");
  const [hasUserEnteredContributionIncrease, setHasUserEnteredContributionIncrease] = useState(false);
  const [withdrawalIncreasePct, setWithdrawalIncreasePct] = useState("");
  const [contributionIncreaseHelperText, setContributionIncreaseHelperText] = useState<string | undefined>(
    undefined,
  );
  const [contributionBreachYear, setContributionBreachYear] = useState<number | null>(null);
  const [stopContributionIncreasesAfterYear, setStopContributionIncreasesAfterYear] = useState<number | null>(
    null,
  );
  const [contributionEndTouched, setContributionEndTouched] = useState(false);
  const [withdrawalStartTouched, setWithdrawalStartTouched] = useState(false);
  const [wtaMode, setWtaMode] = useState<WtaMode>("idle");
  const [wtaHasEarnedIncome, setWtaHasEarnedIncome] = useState<boolean | null>(null);
  const [wtaEarnedIncome, setWtaEarnedIncome] = useState("");
  const [wtaRetirementPlan, setWtaRetirementPlan] = useState<boolean | null>(null);
  const [wtaStatus, setWtaStatus] = useState<WtaStatus>("unknown");
  const [wtaAutoPromptedForIncrease, setWtaAutoPromptedForIncrease] = useState(false);
  const [wtaAdditionalAllowed, setWtaAdditionalAllowed] = useState(0);
  const [wtaCombinedLimit, setWtaCombinedLimit] = useState(WTA_BASE_ANNUAL_LIMIT);
  const [fscStatus, setFscStatus] = useState<"idle" | "eligible" | "ineligible">("idle");
  const [fscQ, setFscQ] = useState<FscAnswers>(() => ({ ...EMPTY_FSC }));
  const [messagesMode, setMessagesMode] = useState<"intro" | "fsc">("intro");
  const [agiGateEligible, setAgiGateEligible] = useState<boolean | null>(null);
  const [wtaAutoApplied, setWtaAutoApplied] = useState(false);
  const [wtaDismissed, setWtaDismissed] = useState(false);
  const [ssiIncomeWarningDismissed, setSsiIncomeWarningDismissed] = useState(false);
  const calcStartingBalanceInput = useDebouncedValue(startingBalance, INPUT_DEBOUNCE_MS);
  const calcMonthlyContributionInput = useDebouncedValue(monthlyContribution, INPUT_DEBOUNCE_MS);
  const calcMonthlyContributionFutureInput = useDebouncedValue(monthlyContributionFuture, INPUT_DEBOUNCE_MS);
  const calcMonthlyWithdrawalInput = useDebouncedValue(monthlyWithdrawal, INPUT_DEBOUNCE_MS);
  const calcContributionIncreasePctInput = useDebouncedValue(contributionIncreasePct, INPUT_DEBOUNCE_MS);
  const calcWithdrawalIncreasePctInput = useDebouncedValue(withdrawalIncreasePct, INPUT_DEBOUNCE_MS);
  const calcPlannerAgiInput = useDebouncedValue(plannerAgi, INPUT_DEBOUNCE_MS);
  const calcAnnualReturnInput = useDebouncedValue(annualReturn, INPUT_DEBOUNCE_MS);
  const calcContributionEndSelection = useDebouncedValue(
    `${contributionEndYear}:${contributionEndMonth}`,
    INPUT_DEBOUNCE_MS,
  );
  const [calcContributionEndYearInput = "", calcContributionEndMonthInput = ""] =
    calcContributionEndSelection.split(":");
  const calcWithdrawalStartSelection = useDebouncedValue(
    `${withdrawalStartYear}:${withdrawalStartMonth}`,
    INPUT_DEBOUNCE_MS,
  );
  const [calcWithdrawalStartYearInput = "", calcWithdrawalStartMonthInput = ""] =
    calcWithdrawalStartSelection.split(":");
  useEffect(() => {
    setWtaAutoApplied(false);
    setWtaDismissed(false);
  }, [monthlyContribution, monthlyContributionFuture]);

  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeTermsAgreed, setWelcomeTermsAgreed] = useState(false);
  const [showWelcomeTermsOfUse, setShowWelcomeTermsOfUse] = useState(false);
  const [amortizationView, setAmortizationView] = useState<"able" | "taxable">("able");
  const [sidebarDesktopTopOffset, setSidebarDesktopTopOffset] = useState(0);
  const fscPassedRef = useRef(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const welcomeTermsCardRef = useRef<HTMLElement | null>(null);
  const inputsColumnRef = useRef<HTMLDivElement | null>(null);
  const consoleCardRef = useRef<HTMLDivElement | null>(null);
  const fscQuestionnaireRef = useRef<HTMLDivElement | null>(null);
  const lastMobileConsoleModeRef = useRef<"annual" | "residency" | "fsc" | "ssi" | null>(null);
  const lastMobileScreen2PanelRef = useRef<string | null>(null);
  const currentClientConfig = getClientConfig(plannerStateCode);
  const configuredReportTabs =
    (currentClientConfig as { features?: { reports?: { tabs?: string[] } } })?.features?.reports?.tabs ??
    [];
  const enabledReportViews = getEnabledReportViews(configuredReportTabs);
  const defaultReportView = enabledReportViews[0] ?? "account_growth";
  const planStateOverride = currentClientConfig.planStateCode?.toUpperCase();
  const planStateFallback = /^[A-Z]{2}$/.test(plannerStateCode) ? plannerStateCode.toUpperCase() : undefined;
  const planState = planStateOverride ?? planStateFallback ?? "";
  const getClientBlock = (slot: "landingWelcome" | "disclosuresAssumptions" | "rightCardPrimary" | "rightCardSecondary") => {
    const raw = (currentClientConfig as { clientBlocks?: ClientBlocks } | undefined)?.clientBlocks?.[slot]?.[language];
    return typeof raw === "string" && raw.trim() ? raw : "";
  };
  const landingOverride = (currentClientConfig as { landing?: ClientLandingOverrides } | undefined)?.landing?.[language];
  const hasLandingOverride = Boolean(
    landingOverride &&
      (landingOverride.heroTitle?.trim() ||
        landingOverride.heroBody?.trim() ||
        landingOverride.disclosuresTitle?.trim() ||
        landingOverride.disclosuresIntro?.trim() ||
        landingOverride.disclosuresBody?.trim() ||
        landingOverride.agreeToTermsPrefix?.trim() ||
        landingOverride.agreeAndContinueLabel?.trim() ||
        landingOverride.termsOfUseLinkLabel?.trim() ||
        landingOverride.termsOfUseTitle?.trim() ||
        landingOverride.termsOfUseBody?.trim() ||
        (Array.isArray(landingOverride.heroBullets) && landingOverride.heroBullets.length > 0)),
  );
  const rightCardPrimaryOverride = getClientBlock("rightCardPrimary");
  const rightCardSecondaryOverride = getClientBlock("rightCardSecondary");
  const screen1DefaultMessages = resolveDefaultMessages(
    rightCardPrimaryOverride,
    copy.flows?.screen1?.defaultMessages,
    INITIAL_MESSAGES,
  );
  const screen2DefaultMessages = resolveDefaultMessages(
    rightCardSecondaryOverride,
    copy.flows?.screen2?.defaultMessages,
    SCREEN2_DEFAULT_MESSAGES,
  );
  const [screen1Messages, setScreen1Messages] = useState<string[]>(() => [...screen1DefaultMessages]);
  const [screen2Messages, setScreen2Messages] = useState<string[]>(() => [...screen2DefaultMessages]);

  useEffect(() => {
    if (!enabledReportViews.includes(reportView)) {
      setReportView(defaultReportView);
    }
  }, [defaultReportView, enabledReportViews, reportView]);

  const languageToggle = (
    <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-black">
      <button
        type="button"
        aria-pressed={language === "en"}
        className={[
          "rounded-full px-2.5 py-1 text-[11px] font-semibold md:px-3 md:text-xs",
          language === "en"
            ? "bg-[var(--brand-primary)] text-white"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
        ].join(" ")}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={language === "es"}
        className={[
          "rounded-full px-2.5 py-1 text-[11px] font-semibold md:px-3 md:text-xs",
          language === "es"
            ? "bg-[var(--brand-primary)] text-white"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
        ].join(" ")}
        onClick={() => setLanguage("es")}
      >
        ES
      </button>
    </div>
  );
  const planInfoMap = planLevelInfo as unknown as Record<
    string,
    { name?: string; residencyRequired?: boolean; maxAccountBalance?: number }
  >;
  const ssiIncomeThresholdMap = (
    ssiIncomeWarningThresholds as { thresholds?: Partial<Record<FilingStatusOption, number>> }
  ).thresholds;
  const planInfoEntry = planInfoMap[planState];
  const planName = planInfoEntry?.name ?? planState;
  const planLabel = `${planName} Able`;
  const planResidencyRequired = Boolean(planInfoEntry?.residencyRequired);
  const planMaxBalance = planInfoMap[planState]?.maxAccountBalance ?? planInfoMap.default?.maxAccountBalance ?? null;
  const residencyMismatch =
    Boolean(beneficiaryStateOfResidence) &&
    Boolean(planState) &&
    beneficiaryStateOfResidence.toUpperCase() !== planState;
  const residencyBlocking = residencyMismatch && (planResidencyRequired || !nonResidentProceedAck);
  const showFscQuestionnaire = messagesMode === "fsc" && agiGateEligible === true;
  const startingBalanceNum =
    Number((calcStartingBalanceInput ?? "").replace(".00", "")) || 0;
  const monthlyContributionNum =
    Number((calcMonthlyContributionInput ?? "").replace(".00","")) || 0;
  const hasProjectionDriver = startingBalanceNum > 0 || monthlyContributionNum > 0;
  const annualContributionLimit =
    wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;
  const agiValueForSsiWarning = Number(calcPlannerAgiInput);
  const agiValidForSsiWarning =
    calcPlannerAgiInput !== "" &&
    !Number.isNaN(agiValueForSsiWarning) &&
    (agiValueForSsiWarning > 0 || agiValueForSsiWarning === 0);
  const canAccessProjectionViews =
    agiValidForSsiWarning &&
    !residencyBlocking &&
    hasProjectionDriver;
  const handleSidebarChange = (next: NavKey) => {
    if ((next === "reports" || next === "schedule") && !canAccessProjectionViews) {
      setActive("inputs");
      setMessagesMode("intro");
      if (!agiValidForSsiWarning || residencyBlocking) {
        setInputStep(1);
      } else {
        setInputStep(2);
      }
      return;
    }
    setActive(next);
  };
  const ssiWarningThreshold = ssiIncomeThresholdMap?.[plannerFilingStatus];
  const showSsiIncomeEligibilityWarning =
    isSsiEligible &&
    agiValidForSsiWarning &&
    Number.isFinite(ssiWarningThreshold ?? NaN) &&
    agiValueForSsiWarning > Number(ssiWarningThreshold);
  const ssiIncomeEligibilityWarningText = showSsiIncomeEligibilityWarning
    ? (copy?.messages?.ssiIncomeEligibilityWarning ??
      "Based on your taxable income and filing status, you may not be eligible for SSI benefits. However, the ABLE planner will assume the beneficiary is eligible for SSI benefits based on your selection. Accordingly, the ABLE planner will implement logic that will keep the account balances below the SSI limit by stopping contributions and enforcing required distributions, where necessary.")
    : "";
  const showSsiSelectionPlannerMessage = isSsiEligible && !showSsiIncomeEligibilityWarning;
  const ssiSelectionPlannerMessageText = showSsiSelectionPlannerMessage
    ? (copy?.messages?.ssiSelectionPlannerMessage ??
      "Checking this box will instruct the planner to stop contributions and implement withdrawals where necessary to keep your projected account balance under $100,000.")
    : "";

  useEffect(() => {
    if (!showSsiIncomeEligibilityWarning) {
      setSsiIncomeWarningDismissed(false);
    }
  }, [showSsiIncomeEligibilityWarning]);

  const landingWelcomeOverride = getClientBlock("landingWelcome");
  const useLegacyLandingWelcomeOverride = Boolean(landingWelcomeOverride) && !hasLandingOverride;
  const landingCopy = {
    heroTitle: landingOverride?.heroTitle?.trim() || copy.landing?.heroTitle || "",
    heroBody:
      landingOverride?.heroBody?.trim() ||
      (useLegacyLandingWelcomeOverride ? landingWelcomeOverride : "") ||
      copy.landing?.heroBody ||
      "",
    heroBullets:
      Array.isArray(landingOverride?.heroBullets) && landingOverride.heroBullets.length > 0
        ? landingOverride.heroBullets
        : (copy.landing?.heroBullets ?? []),
    disclosuresTitle: landingOverride?.disclosuresTitle?.trim() || copy.landing?.disclosuresTitle || "",
    disclosuresIntro: landingOverride?.disclosuresIntro?.trim() || copy.landing?.disclosuresIntro || "",
    disclosuresBody: landingOverride?.disclosuresBody?.trim() || copy.landing?.disclosuresBody || "",
    agreeToTermsPrefix: landingOverride?.agreeToTermsPrefix?.trim() || copy.landing?.agreeToTermsPrefix || "",
    agreeAndContinueLabel: landingOverride?.agreeAndContinueLabel?.trim() || copy.landing?.agreeAndContinueLabel || "",
    termsOfUseLinkLabel: landingOverride?.termsOfUseLinkLabel?.trim() || copy.landing?.termsOfUseLinkLabel || "",
    termsOfUseTitle: landingOverride?.termsOfUseTitle?.trim() || copy.landing?.termsOfUseTitle || "",
    termsOfUseBody: landingOverride?.termsOfUseBody?.trim() || copy.landing?.termsOfUseBody || "",
  };

  const termsOfUseParagraphs = (landingCopy.termsOfUseBody || "").split("\n\n").filter(Boolean);

  const sanitizeAgiInput = (value: string) => {
    if (value === "") return "";
    const next = value.replace(".00","");
    if (next === "") return "";
    const numeric = Number(next);
    if (Number.isNaN(numeric)) return next;
    if (numeric < 0) return "0";
    return next;
  };

const parsePercentStringToDecimal = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    return num / 100;
  };

  function formatDecimalToPercentString(decimal: number): string {
    const percent = Math.round(decimal * 10000) / 100;
  return String(percent);
}

  const clampNumber = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const sanitizeAmountInput = (value: string) => {
    if (value === "") return "";
    const clean = value.replace(".00", "");
    const digitsAndDot = clean.replace(/[^0-9.]/g, "");
    const parts = digitsAndDot.split(".");
    if (parts.length <= 2) {
      return digitsAndDot;
    }
    return `${parts[0]}.${parts.slice(1).join("")}`;
  };

  const parseIntegerInput = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    return Math.round(num);
  };

  const getStartMonthIndex = () => {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth() + 1;
  };

  const monthIndexToParts = (index: number) => ({
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  });

  const formatMonthYearLabel = (index: number) => {
    return formatMonthYearFromIndex(index, language, { monthStyle: "long" });
  };

  const parseMonthYearToIndex = (yearStr: string, monthStr: string): number | null => {
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      year <= 0 ||
      month < 1 ||
      month > 12
    ) {
      return null;
    }
    return year * 12 + (month - 1);
  };

  const getYearOptions = (minIndex: number, maxIndex: number) => {
    const minYear = Math.floor(minIndex / 12);
    const maxYear = Math.floor(maxIndex / 12);
    return Array.from({ length: maxYear - minYear + 1 }, (_, idx) =>
      String(minYear + idx),
    );
  };

  const getTimeHorizonLimits = useCallback(() => {
    const client = getClientConfig(plannerStateCode);
    const maxYears =
      client?.constraints?.timeHorizonYearsHardMax ??
      75;
    return {
      minYears: client?.constraints?.timeHorizonYearsHardMin ?? 1,
      maxYears,
    };
  }, [plannerStateCode]);

  const getHorizonConfig = useCallback(() => {
    const limits = getTimeHorizonLimits();
    const parsed = parseIntegerInput(timeHorizonYears);
    const safeYears = clampNumber(parsed ?? limits.minYears, limits.minYears, limits.maxYears);
    const startIndex = getStartMonthIndex();
    const horizonEndIndex = startIndex + safeYears * 12 - 1;
    return {
      minYears: limits.minYears,
      maxYears: limits.maxYears,
      safeYears,
      startIndex,
      horizonEndIndex: Math.max(startIndex, horizonEndIndex),
    };
  }, [getTimeHorizonLimits, timeHorizonYears]);

  const {
    budgetMode,
    setBudgetMode,
    toggleBudgetMode,
    qualifiedWithdrawalBudget,
    qualifiedWithdrawalTotal,
    isBudgetApplied,
    applyBudgetToWithdrawal,
    handleBudgetFieldChange,
    handleManualWithdrawalOverride,
    resetQualifiedWithdrawalBudget,
  } = useQualifiedWithdrawalBudget({
    monthlyWithdrawal,
    setMonthlyWithdrawal,
    sanitizeAmountInput,
  });
  const budgetButtonActive = isBudgetApplied;
  const budgetButtonLabel = budgetButtonActive
    ? `Budgeted for ${formatCurrency(qualifiedWithdrawalTotal).replace(".00", "")} - Click to revise.`
    : (copy?.labels?.inputs?.qualifiedWithdrawalsBudgetButtonLabel ?? "");

  const contributionConstraintHorizon = getHorizonConfig();
  const { enforcedContributionStopIndex, enforcedWithdrawalStartIndex } = (() => {
    const startIndex = contributionConstraintHorizon.startIndex;
    const horizonEndIndex = contributionConstraintHorizon.horizonEndIndex;
    const totalMonths = contributionConstraintHorizon.safeYears * 12;
    if (totalMonths <= 0) {
      return {
        enforcedContributionStopIndex: null as number | null,
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
    const defaultWithdrawalStartIndex = Math.min(horizonEndIndex, startIndex + 1);

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
      contributionEndIndex: horizonEndIndex,
      withdrawalStartIndex: defaultWithdrawalStartIndex,
      annualReturnDecimal: parsePercentStringToDecimal(calcAnnualReturnInput) ?? 0,
      isSsiEligible,
      agi: agiIsValid ? agiValue : null,
      filingStatus: plannerFilingStatus,
      stateOfResidence: beneficiaryStateOfResidence || null,
      enabled: true,
      planMaxBalance,
    });

    let nextContributionStopIndex: number | null = null;
    let nextWithdrawalStartIndex: number | null = null;

    for (const yearRow of unconstrainedContributionRows) {
      for (const monthRow of yearRow.months) {
        const hitSsiStop = monthRow.ssiCodes?.includes("SSI_CONTRIBUTIONS_STOPPED") ?? false;
        const hitPlanStop = monthRow.planCodes?.includes("PLAN_MAX_CONTRIBUTIONS_STOPPED") ?? false;
        const hitSsiForcedWithdrawal =
          monthRow.ssiCodes?.includes("SSI_FORCED_WITHDRAWALS_APPLIED") ?? false;

        if (nextContributionStopIndex === null && (hitSsiStop || hitPlanStop)) {
          nextContributionStopIndex = monthRow.monthIndex;
        }
        if (nextWithdrawalStartIndex === null && hitSsiForcedWithdrawal) {
          nextWithdrawalStartIndex = monthRow.monthIndex;
        }
        if (nextContributionStopIndex !== null && nextWithdrawalStartIndex !== null) {
          break;
        }
      }
      if (nextContributionStopIndex !== null && nextWithdrawalStartIndex !== null) {
        break;
      }
    }

    return {
      enforcedContributionStopIndex: nextContributionStopIndex,
      enforcedWithdrawalStartIndex: nextWithdrawalStartIndex,
    };
  })();
  const contributionEndMaxIndex = (() => {
    const startIndex = contributionConstraintHorizon.startIndex;
    const horizonEndIndex = contributionConstraintHorizon.horizonEndIndex;
    const cappedMax =
      enforcedContributionStopIndex !== null
        ? enforcedContributionStopIndex
        : horizonEndIndex;
    return clampNumber(cappedMax, startIndex, horizonEndIndex);
  })();

  useEffect(() => {
    if (messagesMode !== "intro") {
      return;
    }
    const nextScreen1Messages = resolveDefaultMessages(
      rightCardPrimaryOverride,
      copy.flows?.screen1?.defaultMessages,
      INITIAL_MESSAGES,
    );
    const nextScreen2Messages = resolveDefaultMessages(
      rightCardSecondaryOverride,
      copy.flows?.screen2?.defaultMessages,
      SCREEN2_DEFAULT_MESSAGES,
    );
    setScreen1Messages(nextScreen1Messages);
    setScreen2Messages(nextScreen2Messages);
  }, [language, messagesMode, rightCardPrimaryOverride, rightCardSecondaryOverride, copy.flows?.screen1?.defaultMessages, copy.flows?.screen2?.defaultMessages]);

  useEffect(() => {
    if (inputStep !== 2) {
      setBudgetMode("default");
    }
  }, [inputStep, setBudgetMode]);

  useEffect(() => {
    const agiValue = Number(plannerAgi);
    if (!plannerAgi || Number.isNaN(agiValue) || agiValue < 0 || !plannerFilingStatus) {
      setAgiGateEligible(null);
      setFscStatus("idle");
      setMessagesMode("intro");
      setFscQ({ ...EMPTY_FSC });
      return;
    }

    const creditPercent = getFederalSaverCreditPercent(plannerFilingStatus, agiValue);
    if (creditPercent === 0) {
      setAgiGateEligible(false);
      setFscStatus("ineligible");
      setMessagesMode("intro");
      setFscQ({ ...EMPTY_FSC });
      return;
    }

    setAgiGateEligible(true);
    if (fscPassedRef.current) {
      setFscStatus("eligible");
    }
  }, [plannerAgi, plannerFilingStatus]);

  useEffect(() => {
    if (annualReturnEdited) return;

    const client = getClientConfig(plannerStateCode);
    const candidate = client?.defaults?.annualReturn;
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      const percent = formatDecimalToPercentString(candidate);
      setAnnualReturn(percent);
    setAnnualReturnWarningMax(null);
    }
  }, [plannerStateCode, annualReturnEdited]);

  const resetWtaFlow = useCallback(() => {
    setWtaMode("idle");
    setWtaHasEarnedIncome(null);
    setWtaEarnedIncome("");
    setWtaRetirementPlan(null);
    setWtaStatus("unknown");
    setWtaAdditionalAllowed(0);
    setWtaCombinedLimit(WTA_BASE_ANNUAL_LIMIT);
    setWtaAutoPromptedForIncrease(false);
    setWtaAutoApplied(false);
    setWtaDismissed(false);
  }, [setWtaAutoApplied, setWtaDismissed]);

  const applySetToMax = useCallback(
    (limit: number) => {
      const { startIndex } = getHorizonConfig();
      const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(startIndex);
      const currentYearMaxMonthly = Math.floor(limit / monthsRemaining);
      const futureYearMaxMonthly = Math.floor(limit / 12);
      setMonthlyContribution(String(currentYearMaxMonthly));
      setMonthlyContributionFuture(String(futureYearMaxMonthly));
    },
    [getHorizonConfig],
  );

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
      plannedCurrentYear > WTA_BASE_ANNUAL_LIMIT ||
      plannedNextCalendarYear > WTA_BASE_ANNUAL_LIMIT;

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
      // If the current annualized contribution exceeds the base limit, ALWAYS prompt WTA,
      // even if we previously auto-prompted due to a future-year projection.
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
      plannedCurrentYear > WTA_BASE_ANNUAL_LIMIT || plannedAnnual > WTA_BASE_ANNUAL_LIMIT
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
  ]);

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
    const breachNow = plannedCurrentYear > WTA_BASE_ANNUAL_LIMIT;
    const breachFuture = plannedAnnual > WTA_BASE_ANNUAL_LIMIT;
    const ineligibleBreach = wtaStatus === "ineligible" && (breachNow || breachFuture);
    const eligibleCombinedBreach =
      wtaStatus === "eligible" && plannedAnnual > wtaCombinedLimit;

    if (ineligibleBreach) {
      applySetToMax(WTA_BASE_ANNUAL_LIMIT);
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
    getHorizonConfig,
    applySetToMax,
    setWtaMode,
    setWtaAutoApplied,
  ]);

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

    const baseBreachYear = computeBreachYear(WTA_BASE_ANNUAL_LIMIT);
    const projectionBreachesBaseLimit = baseBreachYear !== null && baseBreachYear > 0;

    // If inputs change and we no longer breach the base limit, allow auto-prompting again later.
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
        copy?.labels?.inputs?.contributionIncreaseDisabledHelper ??
          "Base contributions already meet the annual limit; increases are disabled.",
      );
      return;
    }

    setContributionIncreaseHelperText(
      (copy?.labels?.inputs?.contributionIncreaseBreachHelper ??
        "At {{pct}}%, contributions exceed the annual limit in year {{breachYear}}. Contribution increases will stop after year {{stopYear}}.")
        .replace("{{pct}}", contributionIncreasePct)
        .replace("{{breachYear}}", String(limitBreachYear))
        .replace("{{stopYear}}", String(limitBreachYear - 1)),
    );
  }, [
    annualContributionLimit,
    copy?.labels?.inputs?.contributionIncreaseBreachHelper,
    copy?.labels?.inputs?.contributionIncreaseDisabledHelper,
    contributionIncreasePct,
    monthlyContributionNum,
    timeHorizonYears,
    wtaStatus,
    wtaAutoPromptedForIncrease,
  ]);

  useEffect(() => {
    const { startIndex, horizonEndIndex } = getHorizonConfig();
    const minIndex = startIndex;
    const contributionMaxIndex = Math.max(startIndex, contributionEndMaxIndex);
    const defaultWithdrawalStartIndex = Math.min(horizonEndIndex, startIndex + 1);
    const withdrawalEnforcedIndex =
      enforcedWithdrawalStartIndex != null
        ? clampNumber(enforcedWithdrawalStartIndex, startIndex, horizonEndIndex)
        : null;
    const withdrawalMaxIndex = withdrawalEnforcedIndex ?? Math.max(startIndex, horizonEndIndex);
    const withdrawalDefaultIndex = withdrawalEnforcedIndex ?? defaultWithdrawalStartIndex;

    const setContributionFromIndex = (index: number) => {
      const { year, month } = monthIndexToParts(index);
      setContributionEndYear(String(year));
      setContributionEndMonth(String(month).padStart(2, "0"));
    };

    const setWithdrawalFromIndex = (index: number) => {
      const { year, month } = monthIndexToParts(index);
      setWithdrawalStartYear(String(year));
      setWithdrawalStartMonth(String(month).padStart(2, "0"));
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
    if (!withdrawalStartTouched || withdrawalIndex === null) {
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
    enforcedWithdrawalStartIndex,
  ]);

  useEffect(() => {
    const client = getClientConfig(plannerStateCode);
    const brand = client.brand;
    const typography = client.typography;
    if (!brand && !typography) return;

    const root = document.documentElement.style;
    if (brand) {
      root.setProperty("--brand-primary", brand.primary);
      root.setProperty("--brand-primary-hover", brand.primaryHover);
      root.setProperty("--brand-on-primary", brand.onPrimary);
      root.setProperty("--brand-ring", brand.ring);
    }

    if (typography?.fontFamily) {
      root.setProperty("--app-font-family", typography.fontFamily);
    }
    const baseFontSize = typography?.baseFontSizePx;
    if (Number.isFinite(baseFontSize ?? NaN)) {
      root.setProperty("--app-font-size", `${baseFontSize}px`);
    }
    const lineHeight = typography?.lineHeight;
    if (Number.isFinite(lineHeight ?? NaN)) {
      root.setProperty("--app-line-height", `${lineHeight}`);
    }
  }, [plannerStateCode]);

  useEffect(() => {
    if (!beneficiaryStateOfResidence && plannerStateCode !== "default") {
      setBeneficiaryStateOfResidence(plannerStateCode);
    }
  }, [plannerStateCode, beneficiaryStateOfResidence]);

  useEffect(() => {
    if (timeHorizonEdited) return;
    const client = getClientConfig(plannerStateCode);
    const candidate =
      client?.defaults?.timeHorizonYears ??
      null;
    const fallback = typeof candidate === "number" && Number.isFinite(candidate)
      ? String(Math.round(candidate))
      : "40";
    setTimeHorizonYears(fallback);
  }, [plannerStateCode, timeHorizonEdited]);

  useEffect(() => {
  }, [
    timeHorizonYears,
    contributionIncreasePct,
    monthlyWithdrawal,
    withdrawalIncreasePct,
    contributionEndMonth,
    contributionEndYear,
    withdrawalStartMonth,
    withdrawalStartYear,
  ]);

  useEffect(() => {
    if (!beneficiaryStateOfResidence || beneficiaryStateOfResidence === planState) {
      setNonResidentProceedAck(false);
    }
  }, [beneficiaryStateOfResidence, planState]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [showWelcome, active, inputStep]);

  const scrollMobileElementWithOffset = useCallback(
    (element: HTMLElement | null, behavior: ScrollBehavior = "smooth") => {
      if (!element || typeof window === "undefined") return;
      const topNav = document.querySelector("header");
      const topNavHeight = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height : 0;
      const inputHeader = document.querySelector("[data-mobile-input-header='true']");
      const inputHeaderHeight =
        inputHeader instanceof HTMLElement ? inputHeader.getBoundingClientRect().height : 0;
      const offset = topNavHeight + inputHeaderHeight + 8;
      const targetTop = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior });
    },
    [],
  );

  usePlannerUiEffects({
    active,
    inputStep,
    reportView,
    language,
    showWelcome,
    showWelcomeTermsOfUse,
    residencyBlocking,
    showSsiIncomeEligibilityWarning,
    showFscQuestionnaire,
    annualReturnWarningText,
    budgetMode,
    wtaDismissed,
    wtaMode,
    wtaStatus,
    messagesMode,
    shellRef,
    consoleCardRef,
    fscQuestionnaireRef,
    welcomeTermsCardRef,
    lastMobileConsoleModeRef,
    lastMobileScreen2PanelRef,
    setSidebarDesktopTopOffset,
    scrollMobileElementWithOffset,
  });

  const handleWelcomeContinue = () => {
    if (!welcomeTermsAgreed) return;
    sessionStorage.setItem(WELCOME_KEY, "true");
    setShowWelcome(false);
    setActive("inputs");
  };

  const planSelector = (
    <select
      value={plannerStateCode}
      onChange={(event) => {
        const nextState = event.target.value as PlannerState;
        setPlannerStateCode(nextState);
      }}
      className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <option value="default">Default</option>
      <option value="UT">UT</option>
      <option value="IL">IL</option>
      <option value="TX">TX</option>
      </select>
  );

  const resetInputs = () =>
    resetPlannerInputs({
      plannerStateCode,
      formatDecimalToPercentString,
      resetQualifiedWithdrawalBudget,
      resetWtaFlow,
      fscPassedRef,
      screen1DefaultMessages,
      screen2DefaultMessages,
      setInputStep,
      setBeneficiaryName,
      setBeneficiaryStateOfResidence,
      setPlannerFilingStatus,
      setPlannerAgi,
      setAnnualReturn,
      setAnnualReturnEdited,
      setAnnualReturnWarningMax,
      setIsSsiEligible,
      setStartingBalance,
      setMonthlyContribution,
      setMonthlyContributionFuture,
      setContributionEndYear,
      setContributionEndMonth,
      setMonthlyWithdrawal,
      setWithdrawalStartYear,
      setWithdrawalStartMonth,
      setNonResidentProceedAck,
      setFscStatus,
      setFscQ,
      setSsiIncomeWarningDismissed,
      setMessagesMode,
      setAgiGateEligible,
      setScreen1Messages,
      setContributionIncreasePct,
      setHasUserEnteredContributionIncrease,
      setWithdrawalIncreasePct,
      setContributionIncreaseHelperText,
      setContributionBreachYear,
      setStopContributionIncreasesAfterYear,
      setWtaAutoPromptedForIncrease,
      setScreen2Messages,
      setTimeHorizonYears,
      setTimeHorizonEdited,
      setContributionEndTouched,
      setWithdrawalStartTouched,
      setWtaAutoApplied,
      setWtaDismissed,
      setReportWindowYears,
    });
  const refreshButton = (
    <button
      type="button"
      aria-label={copy?.buttons?.refresh ?? "Refresh"}
      title={copy?.buttons?.refresh ?? "Refresh"}
      className="rounded-full border border-zinc-200 p-2 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
      onClick={resetInputs}
    >
      <svg
        viewBox="0 -960 960 960"
        className="h-5 w-5"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
      </svg>
    </button>
  );
  const mobileInputsHeaderActions = (
    <div className="flex items-center gap-2 md:hidden">
      {refreshButton}
      {languageToggle}
    </div>
  );
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
    const limit = wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;
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
        copy?.labels?.inputs?.contributionIncreaseDisabledHelper ??
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
    copy?.labels?.inputs?.contributionIncreaseDisabledHelper,
    getHorizonConfig,
    monthlyContribution,
    wtaCombinedLimit,
    wtaStatus,
  ]);

  const horizonConfigForInputNav = getHorizonConfig();
  const {
    isInputNextDisabled: isInputNextDisabledForInputNav,
    reportViewIndex: reportViewIndexForInputNav,
    defaultLastReportView: defaultLastReportViewForInputNav,
    mobileBackDisabled,
    mobileNextDisabled,
  } = buildMobileNavModel({
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
    horizonStartIndex: horizonConfigForInputNav.startIndex,
    enabledReportViews,
    reportView,
    defaultReportView,
  });

  const goToPreviousInputStep = () => {
    if (inputStep === 2) {
      setInputStep(1);
    }
  };

  const goToMobileBack = () => {
    if (active === "inputs") {
      goToPreviousInputStep();
      return;
    }

    if (active === "reports") {
      if (reportViewIndexForInputNav <= 0) {
        setActive("inputs");
        setInputStep(2);
        return;
      }
      setReportView(enabledReportViews[reportViewIndexForInputNav - 1]);
      return;
    }

    if (active === "schedule") {
      if (amortizationView === "taxable") {
        setAmortizationView("able");
        return;
      }
      setActive("reports");
      setReportView(defaultLastReportViewForInputNav);
      return;
    }

    if (active === "resources") {
      setActive("schedule");
      return;
    }

    if (active === "disclosures") {
      setActive("resources");
    }
  };

  const goToMobileNext = () => {
    if (active === "inputs") {
      if (isInputNextDisabledForInputNav) return;
      if (inputStep === 1) {
        setInputStep(2);
        return;
      }
      const { minYears, maxYears } = getTimeHorizonLimits();
      if (timeHorizonYears !== "") {
        const parsed = parseIntegerInput(timeHorizonYears);
        if (parsed !== null) {
          let next = parsed;
          if (next < minYears) next = minYears;
          if (next > maxYears) next = maxYears;
          if (String(next) !== timeHorizonYears) {
            setTimeHorizonYears(String(next));
          }
        }
      }
      setActive("reports");
      setReportView(defaultReportView);
      return;
    }

    if (active === "reports") {
      if (reportViewIndexForInputNav < enabledReportViews.length - 1) {
        setReportView(enabledReportViews[reportViewIndexForInputNav + 1]);
        return;
      }
      setActive("schedule");
      setAmortizationView("able");
      return;
    }

    if (active === "schedule") {
      if (amortizationView === "able") {
        setAmortizationView("taxable");
        return;
      }
      setActive("resources");
      return;
    }

    if (active === "resources") {
      setActive("disclosures");
    }
  };

  const content = (() => {
    const agiValue = Number(plannerAgi);
    const calcAgiValue = Number(calcPlannerAgiInput);
    const calcAgiValid =
      calcPlannerAgiInput !== "" &&
      !Number.isNaN(calcAgiValue) &&
      (calcAgiValue > 0 || calcAgiValue === 0);
    const horizonConfig = getHorizonConfig();
    const {
      agiValid,
      contributionIncreaseDisabledNow,
      hasContributionIssue,
      hasDriverForProjection,
      residencyBlocking,
      residencyMismatch,
      isNextDisabled,
    } = buildInputsContentModel({
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
      horizonStartIndex: horizonConfig.startIndex,
    });
    const formatMonthlyLabel = (value: number) => formatCurrency(value).replace(".00", "");
    const horizonLimits = getTimeHorizonLimits();
    const monthOptions = buildMonthOptions(language);
    const enforceTimeHorizonLimits = () => {
      const next = clampTimeHorizonYears({
        timeHorizonYears,
        horizonLimits,
        parseIntegerInput,
      });
      if (next !== timeHorizonYears) {
        setTimeHorizonYears(next);
      }
    };

    const goToNextStep = () => {
      if (inputStep === 1) {
        if (!agiValid || residencyBlocking) return;
        setInputStep(2);
        return;
      }
      if (hasContributionIssue || !hasDriverForProjection) return;
      enforceTimeHorizonLimits();
      setActive("reports");
      setReportView(defaultReportView);
    };

    const questions = buildFscQuestions({
      taxLiability: copy.labels?.fsc?.taxLiability ?? "",
      age18: copy.labels?.fsc?.age18 ?? "",
      student: copy.labels?.fsc?.student ?? "",
      dependent: copy.labels?.fsc?.dependent ?? "",
    });

    const finalizeFscEvaluation = (eligible: boolean) => {
      setFscStatus(eligible ? "eligible" : "ineligible");
      fscPassedRef.current = eligible;
      setMessagesMode("intro");
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        window.setTimeout(() => {
          inputsColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    };

    const visibleQuestions = getVisibleFscQuestions(questions, fscQ);
    const answerFscQuestion = (key: keyof FscAnswers, value: boolean) => {
      setFscQ((prev) => ({ ...prev, [key]: value }));
      if (shouldDisqualifyFscAnswer(key, value)) {
        finalizeFscEvaluation(false);
        return;
      }
      if (isLastFscQuestion(key, questions)) {
        finalizeFscEvaluation(true);
      }
    };

    const showQuestionnaire = messagesMode === "fsc" && agiGateEligible === true;
    const desktopInputPageTitle =
      inputStep === 1
        ? copy?.ui?.inputs?.demographics?.title
          ?? copy?.labels?.inputs?.demographicsTitle
          ?? "Demographic Information"
        : copy?.ui?.inputs?.accountActivity?.title
          ?? copy?.labels?.inputs?.accountActivityTitle
          ?? "Account Activity";

    const fscButtonLabel = getFscButtonLabel({
      agiGateEligible,
      fscStatus,
      labels: {
        enterAgiToTestEligibility: copy?.buttons?.enterAgiToTestEligibility ?? "",
        notEligibleBasedOnAgi: copy?.buttons?.notEligibleBasedOnAgi ?? "",
        eligibleRetest: copy?.buttons?.eligibleRetest ?? "",
        notEligibleRetest: copy?.buttons?.notEligibleRetest ?? "",
        eligibleToEvaluate: copy?.buttons?.eligibleToEvaluate ?? "",
      },
    });

    const horizonYearOptions = getYearOptions(
      horizonConfig.startIndex,
      horizonConfig.horizonEndIndex,
    );
    const contributionYearOptions = getYearOptions(
      horizonConfig.startIndex,
      contributionEndMaxIndex,
    );
    const contributionMonthOptions = (() => {
      const selectedYear = Number(contributionEndYear);
      if (!Number.isFinite(selectedYear)) {
        return monthOptions;
      }

      const minYear = Math.floor(horizonConfig.startIndex / 12);
      const maxYear = Math.floor(contributionEndMaxIndex / 12);
      const minMonthForYear =
        selectedYear === minYear ? (horizonConfig.startIndex % 12) + 1 : 1;
      const maxMonthForYear =
        selectedYear === maxYear ? (contributionEndMaxIndex % 12) + 1 : 12;

      return monthOptions.filter((option) => {
        const month = Number(option.value);
        return Number.isFinite(month) && month >= minMonthForYear && month <= maxMonthForYear;
      });
    })();

    const promptlyStartWta = () => {
      setWtaMode("wtaQuestion");
      setWtaHasEarnedIncome(null);
      setWtaEarnedIncome("");
      setWtaRetirementPlan(null);
    };

    const handleOverLimitNo = () => {
      const { startIndex } = getHorizonConfig();
      const { breachNow, breachFuture } = getBaseLimitBreaches(monthlyContribution, startIndex);
      setWtaStatus("ineligible");
      setWtaAdditionalAllowed(0);
      setWtaCombinedLimit(WTA_BASE_ANNUAL_LIMIT);
      setWtaHasEarnedIncome(false);
      setWtaRetirementPlan(null);
      setWtaMode(breachNow || breachFuture ? "noPath" : "idle");
    };

    const handleEarnedIncomeAnswer = (hasIncome: boolean) => {
      if (!hasIncome) {
        handleOverLimitNo();
        return;
      }
      setWtaHasEarnedIncome(true);
      setWtaEarnedIncome("");
    };

    const evaluateWtaEligibility = (retirementAnswer: boolean) => {
      setWtaRetirementPlan(retirementAnswer);
      const outcome = getWtaEligibilityOutcome({
        hasEarnedIncome: wtaHasEarnedIncome,
        earnedIncome: wtaEarnedIncome,
        retirementAnswer,
        plannerStateCode,
        monthlyContribution,
      });
      if (outcome.delegateToOverLimitNo) {
        handleOverLimitNo();
        return;
      }
      setWtaAdditionalAllowed(outcome.additionalAllowed);
      setWtaCombinedLimit(outcome.combinedLimit);
      setWtaStatus(outcome.status);
      setWtaMode(outcome.mode);
    };

    const changeResidencyToPlan = () => {
      setBeneficiaryStateOfResidence(planState);
      setNonResidentProceedAck(false);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        window.setTimeout(() => {
          inputsColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    };

    const acknowledgeNonResident = () => {
      setNonResidentProceedAck(true);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        window.setTimeout(() => {
          inputsColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    };

    const showResidencyWarning =
      residencyMismatch && (planResidencyRequired || !nonResidentProceedAck);
    const residencyNotAllowedText = (copy?.labels?.residencyNotAllowed ?? "")
      .split("{{plan}}")
      .join(planLabel)
      .replace("{{state}}", planName);

    const renderResidencyWarning = () => {
      return (
        <ResidencyWarningCard
          planResidencyRequired={planResidencyRequired}
          residencyNotAllowedText={residencyNotAllowedText}
          residencyGeneralAdviceText={copy?.labels?.residencyGeneralAdvice ?? ""}
          changeResidencyLabel={copy?.buttons?.changeResidencyProceed ?? ""}
          understandProceedLabel={copy?.buttons?.understandProceed ?? ""}
          onChangeResidencyToPlan={changeResidencyToPlan}
          onAcknowledgeNonResident={acknowledgeNonResident}
        />
      );
    };

    const renderScreen2Messages = () => {
      const forcedMsg =
        ssiMessages.find((message) => message.code === "SSI_FORCED_WITHDRAWALS_APPLIED") ?? null;
      const contributionStopMsg =
        ssiMessages.find((message) => message.code === "SSI_CONTRIBUTIONS_STOPPED") ?? null;
      const ssiContributionStopIndex =
        contributionStopMsg?.data?.monthIndex ??
        (isSsiEligible ? contributionEndIndexValue : null);
      const showStandaloneWithdrawalLimitedMessage =
        shouldShowStandaloneWithdrawalLimitedMessage({
          hasConfiguredWithdrawals,
          hasWithdrawalLimitedMessage,
          endingValueInfo,
        });
      const firstPlanStopMessage = planMessages.find(
        (message) => message.data.monthIndex <= contributionEndIndexValue,
      );
      const planMaxNoticeText =
        firstPlanStopMessage
          ? (copy?.messages?.planMaxReached ?? "")
              .replace(
                "{{month}}",
                formatMonthYearLabel(firstPlanStopMessage.data.monthIndex),
              )
              .replace("{{cap}}", formatCurrency(firstPlanStopMessage.data.planMax).replace(".00", ""))
          : null;
      const ssiBalanceCapWarningText =
        ssiMessages.length > 0
          ? (copy?.messages?.balanceCapWarning ?? "")
              .split("{{cap}}").join("$100,000")
              .replace(
                "{{breach}}",
                contributionStopMsg?.data?.monthIndex != null
                  ? formatMonthYearLabel(contributionStopMsg.data.monthIndex)
                  : forcedMsg?.data?.monthIndex != null
                    ? formatMonthYearLabel(forcedMsg.data.monthIndex)
                    : "",
              )
              .replace(
                "{{stop}}",
                firstPlanStopMessage?.data?.monthIndex != null
                  ? formatMonthYearLabel(firstPlanStopMessage.data.monthIndex)
                  : ssiContributionStopIndex != null
                    ? formatMonthYearLabel(ssiContributionStopIndex)
                    : "",
              )
              .replace(
                "{{withdrawStart}}",
                forcedMsg?.data?.monthIndex != null
                  ? formatMonthYearLabel(forcedMsg.data.monthIndex)
                  : contributionStopMsg?.data?.monthIndex != null
                    ? formatMonthYearLabel(contributionStopMsg.data.monthIndex)
                    : "",
              )
          : null;
      return (
        <Screen2MessagesPanel
          accountEndingNode={null}
          depletionNoticeNode={renderAbleDepletionNotice()}
          showStandaloneWithdrawalLimitedMessage={showStandaloneWithdrawalLimitedMessage}
          withdrawalLimitedText={copy?.messages?.withdrawalLimitedToAvailable ?? ""}
          planMaxNoticeText={planMaxNoticeText}
          ssiBalanceCapWarningText={ssiBalanceCapWarningText}
          screen2Messages={screen2Messages}
        />
      );
    };

    const renderScreen2Panel = () => {
      if (budgetMode === "qualifiedWithdrawals") {
        return (
          <QualifiedWithdrawalsBudgetPanel
            accountEndingNode={null}
            depletionNoticeNode={renderAbleDepletionNotice()}
            values={qualifiedWithdrawalBudget}
            total={qualifiedWithdrawalTotal}
            onChange={handleBudgetFieldChange}
            onClose={() => {
              applyBudgetToWithdrawal();
              setBudgetMode("default");
              if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
                window.setTimeout(() => {
                  scrollMobileElementWithOffset(inputsColumnRef.current, "smooth");
                }, 0);
              }
            }}
            formatCurrency={formatCurrency}
            copy={{
              title: copy?.labels?.inputs?.qualifiedWithdrawalsBudgetTitle ?? "",
              housing: copy?.labels?.inputs?.qualifiedWithdrawalsHousing ?? "",
              healthcare: copy?.labels?.inputs?.qualifiedWithdrawalsHealthcare ?? "",
              transportation: copy?.labels?.inputs?.qualifiedWithdrawalsTransportation ?? "",
              education: copy?.labels?.inputs?.qualifiedWithdrawalsEducation ?? "",
              other: copy?.labels?.inputs?.qualifiedWithdrawalsOther ?? "",
              total: copy?.labels?.inputs?.qualifiedWithdrawalsTotal ?? "",
              closeButton: copy?.buttons?.done ?? "",
            }}
          />
        );
      }

      return (
        <Screen2WtaPanel
          wtaMode={wtaMode}
          wtaDismissed={wtaDismissed}
          wtaStatus={wtaStatus}
          wtaHasEarnedIncome={wtaHasEarnedIncome}
          wtaEarnedIncome={wtaEarnedIncome}
          wtaRetirementPlan={wtaRetirementPlan}
          wtaAdditionalAllowed={wtaAdditionalAllowed}
          wtaCombinedLimit={wtaCombinedLimit}
          baseAnnualLimit={WTA_BASE_ANNUAL_LIMIT}
          accountEndingNode={null}
          depletionNoticeNode={renderAbleDepletionNotice()}
          renderDefaultPanel={renderScreen2Messages}
          workToAblePromptText={(copy?.messages?.workToAblePrompt ?? "").replace("{{cap}}", "$20,000")}
          yesLabel={copy?.buttons?.yes ?? ""}
          noLabel={copy?.buttons?.no ?? ""}
          earnedIncomeQuestionLabel={copy?.labels?.inputs?.wtaEarnedIncomeQuestion ?? ""}
          earnedIncomeInputLabel={copy?.labels?.inputs?.wtaEarnedIncomeInput ?? ""}
          retirementPlanQuestionLabel={copy?.labels?.inputs?.wtaRetirementPlanQuestion ?? ""}
          wtaNotEligibleText={copy?.messages?.wtaNotEligible ?? ""}
          wtaAutoAppliedAdjustedLine={copy?.messages?.wtaAutoAppliedAdjustedLine ?? ""}
          wtaAutoAppliedMonthlyCapHint={copy?.messages?.wtaAutoAppliedMonthlyCapHint ?? ""}
          wtaEligibleOverCombinedLine1={copy?.messages?.wtaEligibleOverCombinedLine1 ?? ""}
          onStartWta={promptlyStartWta}
          onOverLimitNo={handleOverLimitNo}
          onEarnedIncomeAnswer={handleEarnedIncomeAnswer}
          onEarnedIncomeChange={(value) => setWtaEarnedIncome(sanitizeAmountInput(value))}
          onEvaluateWta={evaluateWtaEligibility}
          onDismiss={() => {
            setWtaDismissed(true);
            setWtaMode("idle");
            if (
              typeof window !== "undefined" &&
              window.matchMedia("(max-width: 767px)").matches
            ) {
              window.setTimeout(() => {
                scrollMobileElementWithOffset(inputsColumnRef.current, "smooth");
              }, 0);
            }
          }}
          deriveMonthlyCaps={(limit) => deriveMonthlyCaps(limit, horizonConfig.startIndex)}
          formatMonthlyLabel={formatMonthlyLabel}
          formatCurrency={formatCurrency}
        />
      );
    };

    const parsedTimeHorizon = parseIntegerInput(timeHorizonYears);
    const hasTimeHorizon = timeHorizonYears.trim() !== "" && parsedTimeHorizon !== null;

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
    const contributionEndRaw = parseMonthYearToIndex(
      calcContributionEndYearInput,
      calcContributionEndMonthInput,
    );
    const contributionEndIndexValue =
      contributionEndRaw !== null
        ? clampNumber(contributionEndRaw, startIndex, horizonEndIndex)
        : horizonEndIndex;
    const withdrawalStartRaw = parseMonthYearToIndex(
      calcWithdrawalStartYearInput,
      calcWithdrawalStartMonthInput,
    );
    const defaultWithdrawalStartIndex = Math.min(horizonEndIndex, startIndex + 1);
    const withdrawalStartIndexValue =
      withdrawalStartRaw !== null
        ? clampNumber(withdrawalStartRaw, startIndex, horizonEndIndex)
        : defaultWithdrawalStartIndex;
    const contributionIncreaseValue = Number(calcContributionIncreasePctInput);
    const withdrawalIncreaseValue = Number(calcWithdrawalIncreasePctInput);
    

    // Compute stop year synchronously so the schedule matches the helper message (no useEffect timing lag).
    const computedStopContributionIncreasesAfterYear = (() => {
      const pctRaw = Number(calcContributionIncreasePctInput);
      if (monthlyContributionNum <= 0 || !Number.isFinite(pctRaw) || pctRaw <= 0) return null;

      const horizonInput = Number(timeHorizonYears);
      if (!Number.isFinite(horizonInput) || horizonInput <= 0) return null;

      // Only enforce once WTA status is known (matches helper gating logic).
      const limit = annualContributionLimit;
      if (!Number.isFinite(limit) || limit <= 0) return null;

      const baseAnnual = monthlyContributionNum * 12;
      if (baseAnnual >= limit) return 0;

      const pctDecimal = pctRaw / 100;
      const maxYearsToCheck = Math.floor(horizonInput);

      for (let year = 1; year <= maxYearsToCheck; year += 1) {
        const projectedAnnual = baseAnnual * Math.pow(1 + pctDecimal, year - 1);
        if (projectedAnnual > limit) {
          return year - 1; // stop increases after the prior year
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
    const plannedAnnualContributionForWtaResolution =
      annualMonthlyBasisForWtaResolution * 12;
    const isWtaResolutionPendingForEndingValue = computeWtaResolutionPendingForEndingValue({
      wtaDismissed,
      wtaMode,
      plannedCurrentYearContribution: plannedCurrentYearContributionForWtaResolution,
      plannedAnnualContribution: plannedAnnualContributionForWtaResolution,
    });

    // While WTA is unresolved, clamp projection contributions to base-limit monthly caps
    // so reports/schedules do not reflect over-limit contributions prematurely.
    const projectionMonthlyContributionCurrent = isWtaResolutionPendingForEndingValue
      ? Math.min(
          monthlyContributionValue,
          Math.floor(WTA_BASE_ANNUAL_LIMIT / monthsRemainingForWtaResolution),
        )
      : monthlyContributionValue;
    const projectionMonthlyContributionFuture = isWtaResolutionPendingForEndingValue
      ? Math.min(monthlyContributionFutureValue, Math.floor(WTA_BASE_ANNUAL_LIMIT / 12))
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
    const renderAbleDepletionNotice = () => {
      if (!endingValueInfo.depletionEligible) return null;
      const depletionTemplate = endingValueInfo.withdrawalsStopAfterDepletion
        ? copy?.messages?.ableDepletionNotice
        : copy?.messages?.ableDepletionNoticeLimitedWithdrawals;
      return (
        <PlannerNoticeCard>
          <p className="text-sm leading-relaxed">
            {(depletionTemplate ?? "")
              .split("{{reachMonthYear}}").join(endingValueInfo.reachLabel || "")
              .split("{{stopMonthYear}}").join(endingValueInfo.stopLabel || "")}
          </p>
        </PlannerNoticeCard>
      );
    };

    const fscCreditPercent = getFederalSaverCreditPercent(
      plannerFilingStatus,
      agiValid ? agiValue : 0,
    );
    const fscContributionLimit =
      (federalSaversContributionLimits as Record<string, number>)[plannerFilingStatus] ?? 0;
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
    const reportAbleRows = buildReportAbleRows(
      scheduleRowsWithBenefits,
      reportWindowEndIndex,
    );
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
    const downloadAbleScheduleCsv = () => {
      exportAbleScheduleCsv(scheduleRowsWithBenefits, copy?.labels?.schedule, language);
    };
    const downloadTaxableScheduleCsv = () => {
      exportTaxableScheduleCsv(taxableRows, copy?.labels?.schedule, language);
    };

    if (active === "reports") {
      return (
        <ReportsSection
          labels={copy?.labels?.reports}
          placeholderText={copy?.labels?.ui?.placeholderComingSoon ?? ""}
          reportView={reportView}
          enabledReportViews={enabledReportViews}
          onReportViewChange={(nextView) => {
            if (enabledReportViews.includes(nextView)) {
              setReportView(nextView);
            }
          }}
          reportWindowYearsValue={reportWindowYearsValue}
          reportWindowMaxYears={reportWindowMaxYears}
          onReportWindowYearsChange={setReportWindowYears}
          language={language}
          languageToggle={languageToggle}
          accountGrowthNarrativeParagraphs={accountGrowthNarrativeParagraphs}
          ableRows={reportAbleRows}
          taxableRows={reportTaxableRows}
        />
      );
    }

    if (active === "schedule") {
      return (
        <ScheduleSection
          hasTimeHorizon={hasTimeHorizon}
          language={language}
          labels={copy?.labels?.schedule}
          view={amortizationView}
          onViewChange={setAmortizationView}
          onDownloadAble={downloadAbleScheduleCsv}
          onDownloadTaxable={downloadTaxableScheduleCsv}
          languageToggle={languageToggle}
          rows={scheduleRowsWithBenefits}
          taxableRows={taxableRows}
        />
      );
    }

    if (active === "disclosures") {
      const assumptionTitle =
        copy?.ui?.assumptions?.title ?? (copy?.ui?.sidebar?.disclosures ?? "");
      const assumptionItems = Array.isArray(copy?.ui?.assumptions?.items)
        ? copy.ui!.assumptions!.items
        : [];
      const disclosuresAssumptionsOverride = getClientBlock("disclosuresAssumptions");
      return (
        <DisclosuresSection
          assumptionTitle={assumptionTitle}
          assumptionItems={assumptionItems}
          disclosuresAssumptionsOverride={disclosuresAssumptionsOverride}
          languageToggle={languageToggle}
        />
      );
    }

    if (active === "resources") {
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {copy?.ui?.sidebar?.resources ?? (language === "es" ? "Recursos" : "Resources")}
              </h1>
              {languageToggle}
            </div>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {copy?.labels?.ui?.placeholderComingSoon ?? ""}
            </p>
          </div>
        </div>
      );
    }

    const handleDemographicsFormChange = (updates: {
      beneficiaryName?: string;
      stateOfResidence?: string;
      filingStatus?: string;
      agi?: string;
      annualReturn?: string;
      isSsiEligible?: boolean;
    }) => {
      if ("beneficiaryName" in updates) setBeneficiaryName(updates.beneficiaryName ?? "");
      if ("stateOfResidence" in updates)
        setBeneficiaryStateOfResidence(updates.stateOfResidence ?? "");
      if ("filingStatus" in updates)
        setPlannerFilingStatus((updates.filingStatus ?? "single") as FilingStatusOption);
      if ("agi" in updates) setPlannerAgi(sanitizeAgiInput(updates.agi ?? ""));
      if ("annualReturn" in updates) {
        setAnnualReturnEdited(true);

        const raw = (updates.annualReturn ?? "").toString();
        const dec = parsePercentStringToDecimal(raw);

        if (dec === null) {
          setAnnualReturn("");
          setAnnualReturnWarningMax(null);
        } else {
          const client = getClientConfig(plannerStateCode);
          const warningMax = client?.constraints?.annualReturnWarningMax;
          const hardMax = client?.constraints?.annualReturnHardMax;

          let nextDec = Math.max(0, dec);

          if (typeof hardMax === "number" && Number.isFinite(hardMax)) {
            if (nextDec > hardMax) nextDec = hardMax;
          }

          setAnnualReturn(formatDecimalToPercentString(nextDec));

          if (typeof warningMax === "number" && Number.isFinite(warningMax)) {
            if (nextDec > warningMax) {
              setAnnualReturnWarningMax(warningMax);
            } else {
              setAnnualReturnWarningMax(null);
            }
          } else {
            setAnnualReturnWarningMax(null);
          }
        }
      }
      if ("isSsiEligible" in updates) setIsSsiEligible(Boolean(updates.isSsiEligible));
    };

    const handleAccountActivityFormChange = (updates: {
      timeHorizonYears?: string;
      startingBalance?: string;
      monthlyContribution?: string;
      contributionEndYear?: string;
      contributionEndMonth?: string;
      monthlyWithdrawal?: string;
      withdrawalStartYear?: string;
      withdrawalStartMonth?: string;
      contributionIncreasePct?: string;
      withdrawalIncreasePct?: string;
    }) => {
      if ("timeHorizonYears" in updates) {
        const raw = (updates.timeHorizonYears ?? "").replace(".00", "");
        setTimeHorizonYears(raw);
        setTimeHorizonEdited(true);
      }
      if ("startingBalance" in updates)
        setStartingBalance(sanitizeAmountInput(updates.startingBalance ?? ""));
      if ("monthlyContribution" in updates) {
        const sanitized = sanitizeAmountInput(updates.monthlyContribution ?? "");
        setMonthlyContribution(sanitized);
        setMonthlyContributionFuture("");
      }
      if ("contributionEndYear" in updates) {
        setContributionEndTouched(true);
        setContributionEndYear(updates.contributionEndYear ?? "");
      }
      if ("contributionEndMonth" in updates) {
        setContributionEndTouched(true);
        setContributionEndMonth(updates.contributionEndMonth ?? "");
      }
      if ("monthlyWithdrawal" in updates) {
        handleManualWithdrawalOverride(updates.monthlyWithdrawal ?? "");
      }
      if ("withdrawalStartYear" in updates) {
        setWithdrawalStartTouched(true);
        setWithdrawalStartYear(updates.withdrawalStartYear ?? "");
      }
      if ("withdrawalStartMonth" in updates) {
        setWithdrawalStartTouched(true);
        setWithdrawalStartMonth(updates.withdrawalStartMonth ?? "");
      }
      if ("contributionIncreasePct" in updates) {
        const nextValue = updates.contributionIncreasePct ?? "";
        setContributionIncreasePct(nextValue);
        const nextNumeric = Number(nextValue);
        setHasUserEnteredContributionIncrease(
          Number.isFinite(nextNumeric) && nextNumeric > 0,
        );
      }
      if ("withdrawalIncreasePct" in updates) {
        setWithdrawalIncreasePct(updates.withdrawalIncreasePct ?? "");
      }
    };

    return (
      <div className="space-y-3">
        <InputsDesktopHeader
          title={desktopInputPageTitle}
          inputStep={inputStep}
          backLabel={copy?.buttons?.back ?? ""}
          nextLabel={copy?.buttons?.next ?? ""}
          isNextDisabled={isNextDisabled}
          onBack={goToPreviousInputStep}
          onNext={goToNextStep}
          refreshButton={refreshButton}
          languageToggle={languageToggle}
        />
        <InputsTwoColumnShell
          inputsColumnRef={inputsColumnRef}
          consoleCardRef={consoleCardRef}
          plannerConsoleTitle={copy?.labels?.inputs?.plannerConsoleTitle ?? ""}
          leftContent={
            <InputsLeftPane
              inputStep={inputStep}
              mobileInputsHeaderActions={mobileInputsHeaderActions}
              beneficiaryName={beneficiaryName}
              beneficiaryStateOfResidence={beneficiaryStateOfResidence}
              plannerFilingStatus={plannerFilingStatus}
              plannerAgi={plannerAgi}
              annualReturn={annualReturn}
              isSsiEligible={isSsiEligible}
              fscStatus={fscStatus}
              fscButtonLabel={fscButtonLabel}
              fscDisabled={agiGateEligible !== true}
              demographicsTitle={copy.ui?.inputs?.demographics?.title ?? ""}
              inputLabels={copy.labels?.inputs}
              onDemographicsChange={handleDemographicsFormChange}
              onDemographicsFscClick={() => {
                if (agiGateEligible) {
                  setMessagesMode("fsc");
                  setFscQ({ ...EMPTY_FSC });
                }
              }}
              timeHorizonYears={timeHorizonYears}
              startingBalance={startingBalance}
              monthlyContribution={monthlyContribution}
              contributionEndYear={contributionEndYear}
              contributionEndMonth={contributionEndMonth}
              monthlyWithdrawal={monthlyWithdrawal}
              withdrawalStartYear={withdrawalStartYear}
              withdrawalStartMonth={withdrawalStartMonth}
              contributionIncreaseDisabledNow={contributionIncreaseDisabledNow}
              contributionIncreaseHelperText={contributionIncreaseHelperText}
              hasUserEnteredContributionIncrease={hasUserEnteredContributionIncrease}
              contributionIncreasePct={contributionIncreasePct}
              withdrawalIncreasePct={withdrawalIncreasePct}
              stopContributionIncreasesAfterYear={stopContributionIncreasesAfterYear}
              monthOptions={monthOptions}
              contributionMonthOptions={contributionMonthOptions}
              contributionYearOptions={contributionYearOptions}
              horizonYearOptions={horizonYearOptions}
              onAccountActivityChange={handleAccountActivityFormChange}
              onAdvancedClick={toggleBudgetMode}
              advancedButtonLabel={budgetButtonLabel}
              advancedButtonActive={budgetButtonActive}
              onTimeHorizonBlur={enforceTimeHorizonLimits}
              timeHorizonLabel={
                language === "es"
                  ? `Horizonte temporal (MÁX ${horizonLimits.maxYears} AÑOS)`
                  : `Time Horizon (MAX ${horizonLimits.maxYears} YEARS)`
              }
              accountActivityTitle={copy?.ui?.inputs?.accountActivity?.title ?? ""}
            />
          }
          rightContent={
            <InputsRightPane
              inputStep={inputStep}
              showResidencyWarning={showResidencyWarning}
              renderResidencyWarning={renderResidencyWarning}
              ssiIncomeEligibilityWarningText={ssiIncomeEligibilityWarningText}
              ssiIncomeWarningDismissed={ssiIncomeWarningDismissed}
              onDismissSsiIncomeWarning={() => {
                setSsiIncomeWarningDismissed(true);
                if (
                  typeof window !== "undefined" &&
                  window.matchMedia("(max-width: 767px)").matches
                ) {
                  window.setTimeout(() => {
                    scrollMobileElementWithOffset(inputsColumnRef.current, "smooth");
                  }, 0);
                }
              }}
              annualReturnWarningText={annualReturnWarningText}
              ssiSelectionPlannerMessageText={ssiSelectionPlannerMessageText}
              showQuestionnaire={showQuestionnaire}
              fscQuestionnaireRef={fscQuestionnaireRef}
              fscEligibilityTitle={copy?.labels?.inputs?.fscEligibilityTitle ?? ""}
              fscIntro={copy?.labels?.fsc?.intro ?? ""}
              visibleQuestions={visibleQuestions}
              fscAnswers={fscQ}
              onAnswerFscQuestion={answerFscQuestion}
              yesLabel={copy?.buttons?.yes ?? ""}
              noLabel={copy?.buttons?.no ?? ""}
              screen1Messages={screen1Messages}
              renderScreen2Panel={renderScreen2Panel}
            />
          }
        />
        <div className="pointer-events-none fixed right-2 top-[calc(env(safe-area-inset-top)+11rem)] z-30 w-[202px] md:hidden">
          <div className="rounded-md border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] px-2 py-[0.6rem] shadow-sm backdrop-blur dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)]">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {copy?.messages?.accountEndingValueLabel ?? "Ending Value"}
            </div>
            <div className="mt-1 text-center text-[12px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {endingValueInfo.endingLabel}
            </div>
          </div>
        </div>
      </div>
    );
  })();

  if (showWelcome) {
    return (
      <WelcomeSection
        appTitle={copy.app?.title ?? ""}
        appTagline={copy.app?.tagline}
        planSelector={planSelector}
        languageToggle={languageToggle}
        landingCopy={landingCopy}
        useLegacyLandingWelcomeOverride={useLegacyLandingWelcomeOverride}
        welcomeTermsAgreed={welcomeTermsAgreed}
        showWelcomeTermsOfUse={showWelcomeTermsOfUse}
        onWelcomeTermsAgreedChange={setWelcomeTermsAgreed}
        onToggleWelcomeTerms={() => setShowWelcomeTermsOfUse((prev) => !prev)}
        onWelcomeContinue={handleWelcomeContinue}
        termsOfUseParagraphs={termsOfUseParagraphs}
        welcomeTermsCardRef={welcomeTermsCardRef}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <TopNav
        title={copy.app?.title ?? ""}
        tagline={copy.app?.tagline}
        rightSlot={
          <div className="flex items-center gap-2">
            {planSelector}
          </div>
        }
      />
      <div ref={shellRef} className="mx-auto flex w-full max-w-6xl">
        <Sidebar
          active={active}
          onChange={handleSidebarChange}
          language={language}
          labels={copy.ui?.sidebar}
          desktopTopOffsetPx={sidebarDesktopTopOffset}
          mobileBackAction={{
            label: copy?.buttons?.back ?? "Back",
            disabled: mobileBackDisabled,
            onClick: goToMobileBack,
          }}
          mobileNextAction={{
            label: language === "es" ? "Sig." : (copy?.buttons?.next ?? "Next"),
            disabled: mobileNextDisabled,
            onClick: goToMobileNext,
          }}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-6">{content}</main>
      </div>
      <footer className="px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] text-center text-xs text-zinc-500 dark:text-zinc-400 md:pb-4">
        © 2026 Spectra Professional Services, LLC. All rights reserved.
      </footer>
    </div>
  );
}
