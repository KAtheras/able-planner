"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { getCopy, type SupportedLanguage } from "@/copy";
import { getClientConfig } from "@/config/clients";
import AccountEndingValueCard from "@/components/inputs/AccountEndingValueCard";
import ResidencyWarningCard from "@/components/inputs/ResidencyWarningCard";
import Screen2MessagesPanel from "@/components/inputs/Screen2MessagesPanel";
import Screen2WtaPanel from "@/components/inputs/Screen2WtaPanel";
import QualifiedWithdrawalsBudgetPanel from "@/components/inputs/QualifiedWithdrawalsBudgetPanel";
import MobileFloatingEndingValue from "@/components/inputs/MobileFloatingEndingValue";
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
import {
  buildAccountActivityFormChangeHandler,
  buildDemographicsFormChangeHandler,
} from "@/features/planner/page/plannerFormHandlers";
import { usePlannerClientEffects } from "@/features/planner/page/usePlannerClientEffects";
import PlannerContentRouter from "@/features/planner/page/PlannerContentRouter";
import { usePlannerNavigation } from "@/features/planner/page/usePlannerNavigation";
import { buildPlannerProjection } from "@/features/planner/page/plannerProjectionAdapter";
import { usePlannerProjectionSource } from "@/features/planner/page/usePlannerProjectionSource";
import {
  useContributionIncreaseInputLock,
  useContributionIncreaseRules,
  useProjectionDateSync,
  useWtaModeRules,
  useWtaAutoAdjustRules,
} from "@/features/planner/page/usePlannerRules";
import {
  clampNumber,
  getStartMonthIndex,
  getYearOptions,
  monthIndexToParts,
  parseIntegerInput,
  parseMonthYearToIndex,
} from "@/features/planner/page/plannerTimeUtils";
import ResourcesSection from "@/features/planner/content/ResourcesSection";
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
  WTA_BASE_ANNUAL_LIMIT,
  type WtaMode,
  type WtaStatus,
} from "@/features/planner/inputs/wtaFlow";
import { useSsiEnforcement } from "@/features/planner/inputs/useSsiEnforcement";
import { buildMobileNavModel } from "@/features/planner/navigation/mobileNavModel";
import { getEnabledReportViews, type ReportWindowOption } from "@/features/planner/report/reportViewModel";
import federalSaversCreditBrackets from "@/config/rules/federalSaversCreditBrackets.json";
import federalSaversContributionLimits from "@/config/rules/federalSaversContributionLimits.json";
import planLevelInfo from "@/config/rules/planLevelInfo.json";
import ssiIncomeWarningThresholds from "@/config/rules/ssiIncomeWarningThresholds.json";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";
import {
  downloadAbleScheduleCsv as exportAbleScheduleCsv,
  downloadTaxableScheduleCsv as exportTaxableScheduleCsv,
} from "@/lib/report/exportScheduleCsv";
import { shouldShowStandaloneWithdrawalLimitedMessage } from "@/lib/planner/messages";
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
  const { projectionSource } = usePlannerProjectionSource();
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
  const [isTimeHorizonEditing, setIsTimeHorizonEditing] = useState(false);
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
  const [manualContributionEndYear, setManualContributionEndYear] = useState("");
  const [manualContributionEndMonth, setManualContributionEndMonth] = useState("");
  const [manualWithdrawalStartYear, setManualWithdrawalStartYear] = useState("");
  const [manualWithdrawalStartMonth, setManualWithdrawalStartMonth] = useState("");
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
  useEffect(() => {
    setWtaAutoApplied(false);
    setWtaDismissed(false);
  }, [monthlyContribution, monthlyContributionFuture]);

  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeTermsAgreed, setWelcomeTermsAgreed] = useState(false);
  const [showWelcomeTermsOfUse, setShowWelcomeTermsOfUse] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);
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
  const enrollmentPageUrlRaw = (currentClientConfig as { enrollmentPageUrl?: string } | undefined)
    ?.enrollmentPageUrl;
  const enrollmentPageUrl =
    typeof enrollmentPageUrlRaw === "string" && enrollmentPageUrlRaw.trim()
      ? enrollmentPageUrlRaw.trim()
      : "";
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
          "rounded-full h-8 px-2.5 text-[11px] font-semibold md:px-3 md:text-xs",
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
          "rounded-full h-8 px-2.5 text-[11px] font-semibold md:px-3 md:text-xs",
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
  const openExternalUrlWithWarning = useCallback((url: string) => {
    if (!url) return;
    setPendingExternalUrl(url);
  }, []);
  const cancelExternalNavigation = useCallback(() => {
    setPendingExternalUrl(null);
  }, []);
  const confirmExternalNavigation = useCallback(() => {
    if (!pendingExternalUrl || typeof window === "undefined") {
      setPendingExternalUrl(null);
      return;
    }
    window.open(pendingExternalUrl, "_blank", "noopener,noreferrer");
    setPendingExternalUrl(null);
  }, [pendingExternalUrl]);
  const handleOpenEnrollmentPage = () => {
    if (!enrollmentPageUrl) return;
    openExternalUrlWithWarning(enrollmentPageUrl);
  };
  const handlePrintReport = () => {
    // Interim behavior until custom PDF layout/export is implemented.
    window.print();
  };
  const reportActions = (
    <>
      <button
        type="button"
        onClick={handleOpenEnrollmentPage}
        disabled={!enrollmentPageUrl}
        className={[
          "inline-flex h-8 items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold md:px-3 md:text-xs",
          enrollmentPageUrl
            ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            : "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-500",
        ].join(" ")}
        title={enrollmentPageUrl ? (language === "es" ? "Abrir inscripción" : "Open enrollment") : (language === "es" ? "URL de inscripción no configurada" : "Enrollment URL not configured")}
        aria-label={language === "es" ? "Inscribirse" : "Enroll"}
      >
        <span>{language === "es" ? "Inscribirse" : "Enroll"}</span>
      </button>
      <button
        type="button"
        onClick={handlePrintReport}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        title={language === "es" ? "Imprimir / PDF" : "Print / PDF"}
        aria-label={language === "es" ? "Imprimir / PDF" : "Print / PDF"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M7 3a1 1 0 0 0-1 1v3h2V5h8v2h2V4a1 1 0 0 0-1-1H7Zm-2 6a3 3 0 0 0-3 3v5h4v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3h4v-5a3 3 0 0 0-3-3H5Zm3 8h8v2H8v-2Zm-2-2v-4h12v4H6Zm12-2h2v2h-2v-2Z" />
        </svg>
      </button>
    </>
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

  const formatMonthYearLabel = (index: number) => {
    return formatMonthYearFromIndex(index, language, { monthStyle: "long" });
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
  const {
    enforcedPlanContributionStopIndex,
    enforcedSsiContributionStopIndex,
    enforcedWithdrawalStartIndex,
  } = (() => {
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
  })();
  const {
    warningAcknowledged: ssiWarningAcknowledged,
    hasPendingAcknowledgement: hasPendingSsiAcknowledgement,
    acknowledgeWarning: acknowledgeSsiWarning,
    resetAcknowledgement: resetSsiAcknowledgement,
  } = useSsiEnforcement({
    isSsiEligible,
    ssiContributionStopIndex: enforcedSsiContributionStopIndex,
    ssiForcedWithdrawalStartIndex: enforcedWithdrawalStartIndex,
  });
  const effectiveEnforcedWithdrawalStartIndex = ssiWarningAcknowledged
    ? enforcedWithdrawalStartIndex
    : null;
  const contributionEndMaxIndex = (() => {
    const startIndex = contributionConstraintHorizon.startIndex;
    const horizonEndIndex = contributionConstraintHorizon.horizonEndIndex;
    const maxCandidates = [horizonEndIndex];
    if (enforcedPlanContributionStopIndex !== null) {
      maxCandidates.push(enforcedPlanContributionStopIndex);
    }
    if (enforcedSsiContributionStopIndex !== null && ssiWarningAcknowledged) {
      maxCandidates.push(enforcedSsiContributionStopIndex);
    }
    return clampNumber(Math.min(...maxCandidates), startIndex, horizonEndIndex);
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
    [getHorizonConfig, setMonthlyContribution, setMonthlyContributionFuture],
  );

  useWtaModeRules({
    monthlyContribution,
    getHorizonConfig,
    wtaCombinedLimit,
    wtaStatus,
    wtaAutoPromptedForIncrease,
    wtaMode,
    wtaDismissed,
    baseAnnualLimit: WTA_BASE_ANNUAL_LIMIT,
    getMonthsRemainingInCurrentCalendarYear,
    setWtaMode,
    setWtaAutoPromptedForIncrease,
  });

  useWtaAutoAdjustRules({
    monthlyContribution,
    monthlyContributionFuture,
    timeHorizonYears,
    contributionIncreasePct,
    wtaStatus,
    wtaCombinedLimit,
    wtaDismissed,
    wtaAutoApplied,
    baseAnnualLimit: WTA_BASE_ANNUAL_LIMIT,
    getHorizonConfig,
    getMonthsRemainingInCurrentCalendarYear,
    applySetToMax,
    setWtaAutoApplied,
    setWtaMode,
  });

  useContributionIncreaseRules({
    annualContributionLimit,
    contributionIncreaseBreachHelperText: copy?.labels?.inputs?.contributionIncreaseBreachHelper,
    contributionIncreaseDisabledHelperText: copy?.labels?.inputs?.contributionIncreaseDisabledHelper,
    contributionIncreasePct,
    monthlyContributionNum,
    timeHorizonYears,
    wtaStatus,
    wtaAutoPromptedForIncrease,
    baseAnnualLimit: WTA_BASE_ANNUAL_LIMIT,
    setContributionBreachYear,
    setContributionIncreaseHelperText,
    setStopContributionIncreasesAfterYear,
    setWtaAutoPromptedForIncrease,
    setWtaMode,
    setWtaHasEarnedIncome,
    setWtaEarnedIncome,
    setWtaRetirementPlan,
    setContributionIncreasePct,
  });

  useProjectionDateSync({
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
  });

  usePlannerClientEffects({
    plannerStateCode,
    beneficiaryStateOfResidence,
    planState,
    timeHorizonEdited,
    setBeneficiaryStateOfResidence,
    setTimeHorizonYears,
    setNonResidentProceedAck,
  });

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

  const resetInputs = () => {
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
    setManualContributionEndYear("");
    setManualContributionEndMonth("");
    setManualWithdrawalStartYear("");
    setManualWithdrawalStartMonth("");
    resetSsiAcknowledgement();
    setActive("inputs");
  };
  const refreshButton = (
    <button
      type="button"
      aria-label={copy?.buttons?.refresh ?? "Refresh"}
      title={copy?.buttons?.refresh ?? "Refresh"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
  const reportHeaderActions = (
    <>
      {reportActions}
      {refreshButton}
    </>
  );
  useContributionIncreaseInputLock({
    monthlyContribution,
    wtaStatus,
    wtaCombinedLimit,
    contributionBreachYear,
    contributionIncreaseDisabledHelperText: copy?.labels?.inputs?.contributionIncreaseDisabledHelper,
    baseAnnualLimit: WTA_BASE_ANNUAL_LIMIT,
    getHorizonConfig,
    getMonthsRemainingInCurrentCalendarYear,
    setContributionIncreasePct,
    setStopContributionIncreasesAfterYear,
    setContributionIncreaseHelperText,
  });

  const horizonConfigForInputNav = getHorizonConfig();
  const {
    isInputNextDisabled: isInputNextDisabledForInputNav,
    reportViewIndex: reportViewIndexForInputNav,
    defaultLastReportView: defaultLastReportViewForInputNav,
    mobileBackDisabled,
    mobileNextDisabled: mobileNextDisabledFromModel,
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
  const mobileNextDisabled =
    mobileNextDisabledFromModel ||
    (active === "inputs" && inputStep === 2 && hasPendingSsiAcknowledgement);

  const goToPreviousInputStep = () => {
    if (inputStep === 2) {
      setInputStep(1);
    }
  };

  const { goToMobileBack, goToMobileNext } = usePlannerNavigation({
    active,
    inputStep,
    reportViewIndex: reportViewIndexForInputNav,
    defaultLastReportView: defaultLastReportViewForInputNav,
    defaultReportView,
    enabledReportViews,
    amortizationView,
    hasPendingSsiAcknowledgement,
    isInputNextDisabled: isInputNextDisabledForInputNav,
    timeHorizonYears,
    parseIntegerInput,
    getTimeHorizonLimits,
    setActive,
    setInputStep,
    setReportView,
    setAmortizationView,
    setTimeHorizonYears,
  });

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
    const isNextDisabledWithSsiAck =
      isNextDisabled || (inputStep === 2 && hasPendingSsiAcknowledgement);
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
      if (hasContributionIssue || !hasDriverForProjection || hasPendingSsiAcknowledgement) {
        return;
      }
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
      const userWithdrawalStartRaw = parseMonthYearToIndex(
        withdrawalStartYear,
        withdrawalStartMonth,
      );
      const userWithdrawalStartIndex =
        userWithdrawalStartRaw !== null
          ? clampNumber(userWithdrawalStartRaw, horizonConfig.startIndex, horizonConfig.horizonEndIndex)
          : Math.min(horizonConfig.horizonEndIndex, horizonConfig.startIndex + 1);
      const forcedWithdrawalMonthIndex = forcedMsg?.data?.monthIndex ?? null;
      const shouldUseRevisedWithdrawalLanguage =
        forcedWithdrawalMonthIndex !== null &&
        hasConfiguredWithdrawals &&
        userWithdrawalStartIndex <= forcedWithdrawalMonthIndex;
      const ssiBalanceWarningTemplate =
        forcedWithdrawalMonthIndex === null
          ? (copy?.messages?.balanceCapWarningNoForcedWithdrawals ??
              copy?.messages?.balanceCapWarning ??
              "")
          : shouldUseRevisedWithdrawalLanguage
            ? (copy?.messages?.balanceCapWarningExistingWithdrawals ??
                copy?.messages?.balanceCapWarning ??
                "")
            : (copy?.messages?.balanceCapWarning ?? "");
      const ssiBalanceCapWarningText =
        ssiMessages.length > 0
          ? ssiBalanceWarningTemplate
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
      const ssiWarningDismissed = Boolean(ssiBalanceCapWarningText) && ssiWarningAcknowledged;
      return (
        <Screen2MessagesPanel
          accountEndingNode={desktopAccountEndingNode}
          depletionNoticeNode={renderAbleDepletionNotice()}
          showStandaloneWithdrawalLimitedMessage={showStandaloneWithdrawalLimitedMessage}
          withdrawalLimitedText={copy?.messages?.withdrawalLimitedToAvailable ?? ""}
          planMaxNoticeText={planMaxNoticeText}
          ssiBalanceCapWarningText={ssiBalanceCapWarningText}
          ssiWarningDismissed={ssiWarningDismissed}
          onDismissSsiWarning={acknowledgeSsiWarning}
          screen2Messages={screen2Messages}
        />
      );
    };

    const renderScreen2Panel = () => {
      if (budgetMode === "qualifiedWithdrawals") {
        return (
          <QualifiedWithdrawalsBudgetPanel
            accountEndingNode={desktopAccountEndingNode}
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
          accountEndingNode={desktopAccountEndingNode}
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

    const fscCreditPercent = getFederalSaverCreditPercent(
      plannerFilingStatus,
      agiValid ? agiValue : 0,
    );
    const fscContributionLimit =
      (federalSaversContributionLimits as Record<string, number>)[plannerFilingStatus] ?? 0;
    const {
      hasTimeHorizon,
      contributionEndIndexValue,
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
    } = buildPlannerProjection({
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
      baseAnnualLimit: WTA_BASE_ANNUAL_LIMIT,
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
    }, { source: projectionSource });
    const desktopAccountEndingNode = (
      <div className="hidden md:block">
        <AccountEndingValueCard
          label={copy?.messages?.accountEndingValueLabel ?? ""}
          value={endingValueInfo.endingLabel}
          freeze={isWtaResolutionPendingForEndingValue}
        />
      </div>
    );
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

    const downloadAbleScheduleCsv = () => {
      exportAbleScheduleCsv(scheduleRowsWithBenefits, copy?.labels?.schedule, language);
    };
    const downloadTaxableScheduleCsv = () => {
      exportTaxableScheduleCsv(taxableRows, copy?.labels?.schedule, language);
    };

    const reportsContent = (
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
        reportActions={reportHeaderActions}
        language={language}
        languageToggle={languageToggle}
        accountGrowthNarrativeParagraphs={accountGrowthNarrativeParagraphs}
        ableRows={reportAbleRows}
        taxableRows={reportTaxableRows}
      />
    );

    const scheduleContent = (
      <ScheduleSection
        hasTimeHorizon={hasTimeHorizon}
        language={language}
        labels={copy?.labels?.schedule}
        view={amortizationView}
        onViewChange={setAmortizationView}
        onDownloadAble={downloadAbleScheduleCsv}
        onDownloadTaxable={downloadTaxableScheduleCsv}
        refreshButton={refreshButton}
        languageToggle={languageToggle}
        rows={scheduleRowsWithBenefits}
        taxableRows={taxableRows}
      />
    );

    const assumptionTitle =
      copy?.ui?.assumptions?.title ?? (copy?.ui?.sidebar?.disclosures ?? "");
    const assumptionItems = Array.isArray(copy?.ui?.assumptions?.items)
      ? copy.ui!.assumptions!.items
      : [];
    const disclosuresAssumptionsOverride = getClientBlock("disclosuresAssumptions");
    const disclosuresContent = (
      <DisclosuresSection
        assumptionTitle={assumptionTitle}
        assumptionItems={assumptionItems}
        disclosuresAssumptionsOverride={disclosuresAssumptionsOverride}
        languageToggle={languageToggle}
      />
    );

    const resourcesTitle =
      copy?.ui?.resources?.title ??
      copy?.ui?.sidebar?.resources ??
      (language === "es" ? "Recursos" : "Resources");
    const resourcesIntro = copy?.ui?.resources?.intro ?? "";
    const resourcesSections = Array.isArray(copy?.ui?.resources?.sections)
      ? copy.ui.resources.sections
      : [];
    const resourcesContent = (
      <ResourcesSection
        resourcesTitle={resourcesTitle}
        resourcesIntro={resourcesIntro}
        resourcesSections={resourcesSections}
        placeholderText={copy?.labels?.ui?.placeholderComingSoon ?? ""}
        languageToggle={languageToggle}
        onOpenExternalUrl={openExternalUrlWithWarning}
      />
    );

    const handleDemographicsFormChange = buildDemographicsFormChangeHandler({
      plannerStateCode,
      sanitizeAgiInput,
      parsePercentStringToDecimal,
      formatDecimalToPercentString,
      setBeneficiaryName,
      setBeneficiaryStateOfResidence,
      setPlannerFilingStatus: (value) => setPlannerFilingStatus(value as FilingStatusOption),
      setPlannerAgi,
      setAnnualReturnEdited,
      setAnnualReturn,
      setAnnualReturnWarningMax,
      setIsSsiEligible,
    });

    const handleAccountActivityFormChange = buildAccountActivityFormChangeHandler({
      sanitizeAmountInput,
      handleManualWithdrawalOverride,
      setTimeHorizonYears,
      setTimeHorizonEdited,
      setStartingBalance,
      setMonthlyContribution,
      setMonthlyContributionFuture,
      setContributionEndTouched,
      setManualContributionEndYear,
      setContributionEndYear,
      setManualContributionEndMonth,
      setContributionEndMonth,
      setWithdrawalStartTouched,
      setManualWithdrawalStartYear,
      setWithdrawalStartYear,
      setManualWithdrawalStartMonth,
      setWithdrawalStartMonth,
      setContributionIncreasePct,
      setHasUserEnteredContributionIncrease,
      setWithdrawalIncreasePct,
    });

    const inputsContent = (
      <div className="space-y-3">
        <InputsDesktopHeader
          title={desktopInputPageTitle}
          inputStep={inputStep}
          backLabel={copy?.buttons?.back ?? ""}
          nextLabel={copy?.buttons?.next ?? ""}
          isNextDisabled={isNextDisabledWithSsiAck}
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
              onTimeHorizonFocus={() => setIsTimeHorizonEditing(true)}
              onTimeHorizonBlur={() => {
                setIsTimeHorizonEditing(false);
                enforceTimeHorizonLimits();
              }}
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
        <MobileFloatingEndingValue
          visible={inputStep === 2}
          label={copy?.messages?.accountEndingValueLabel ?? "Ending Value"}
          value={endingValueInfo.endingLabel}
        />
      </div>
    );

    return (
      <PlannerContentRouter
        active={active}
        reportsContent={reportsContent}
        scheduleContent={scheduleContent}
        disclosuresContent={disclosuresContent}
        resourcesContent={resourcesContent}
        inputsContent={inputsContent}
      />
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
      <div aria-hidden="true" className="h-20 md:hidden" />
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:px-4 md:pt-1.5 md:pb-6">{content}</main>
      </div>
      <footer className="px-2 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] text-center text-xs text-zinc-500 dark:text-zinc-400 md:px-4 md:pb-4">
        © 2026 Spectra Professional Services, LLC. All rights reserved.
      </footer>
      {pendingExternalUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={copy?.labels?.ui?.externalLinkWarningTitle ?? ""}
        >
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
              {copy?.messages?.externalLinkWarning ?? ""}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelExternalNavigation}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {copy?.buttons?.cancel ?? ""}
              </button>
              <button
                type="button"
                onClick={confirmExternalNavigation}
                className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-hover)]"
              >
                {copy?.buttons?.continue ?? ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
