"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { getCopy, type SupportedLanguage } from "@/copy";
import { getClientConfig } from "@/config/clients";
import AccountActivityForm from "@/components/inputs/AccountActivityForm";
import AmortizationScheduleTable from "@/components/schedule/AmortizationScheduleTable";
import DemographicsForm from "@/components/inputs/DemographicsForm";
import federalSaversCreditBrackets from "@/config/rules/federalSaversCreditBrackets.json";
import federalSaversContributionLimits from "@/config/rules/federalSaversContributionLimits.json";
import planLevelInfo from "@/config/rules/planLevelInfo.json";
import ssiIncomeWarningThresholds from "@/config/rules/ssiIncomeWarningThresholds.json";
import stateTaxDeductions from "@/config/rules/stateTaxDeductions.json";
import stateTaxRates from "@/config/rules/stateTaxRates.json";
import { buildAccountGrowthNarrative } from "@/lib/report/buildAccountGrowthNarrative";

// TAX LIABILITY HELPERS (PROGRESSIVE BRACKETS)
type TaxBracket = { min: number; max?: number; rate: number };
type TaxBracketInput = { min?: number; max?: number; rate?: number };
type TaxBracketMap = Record<string, TaxBracketInput[]>;
type StateTaxBracketMap = Record<string, TaxBracketMap>;
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
}>;
type ClientLandingOverrides = Partial<Record<SupportedLanguage, ClientLandingContent>>;
type ReportWindowOption = 3 | 5 | 10 | 20 | 40 | "max";
const REPORT_WINDOW_OPTIONS: ReportWindowOption[] = [3, 5, 10, 20, 40, "max"];

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

function clampMoney(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

function computeProgressiveTax(income: number, brackets: TaxBracket[]): number {
  const y = clampMoney(income);
  if (y <= 0) return 0;

  const sorted = (Array.isArray(brackets) ? brackets : [])
    .filter((b) => b && Number.isFinite(b.min) && Number.isFinite(b.rate))
    .map((b) => ({
      min: Number(b.min),
      max: typeof b.max === "number" && Number.isFinite(b.max) ? Number(b.max) : undefined,
      rate: Number(b.rate),
    }))
    .sort((a, b) => a.min - b.min);

  let tax = 0;

  for (const b of sorted) {
    const minEff = b.min > 0 ? b.min - 1 : 0; // handles JSON that uses 0..X then X+1..Y
    const upper = b.max === undefined ? y : Math.min(y, b.max);
    const taxable = Math.max(0, upper - minEff);
    if (taxable <= 0) continue;
    tax += taxable * Math.max(0, b.rate);
    if (b.max !== undefined && y <= b.max) break;
  }

  return clampMoney(tax);
}

function getFederalIncomeTaxLiability(filingStatus: FilingStatusOption, agi: number): number {
  const key = filingStatus as keyof typeof federalTaxBrackets;
  const rows = (federalTaxBrackets as TaxBracketMap)[key] ?? [];
  const brackets: TaxBracket[] = rows.map((r) => ({
    min: Number(r.min ?? 0),
    max: typeof r.max === "number" && Number.isFinite(r.max) ? Number(r.max) : undefined,
    rate: Number(r.rate ?? 0),
  }));
  return computeProgressiveTax(agi, brackets);
}

function getStateIncomeTaxLiability(stateCode: string, filingStatus: FilingStatusOption, agi: number): number {
  const st = (stateCode || "").toUpperCase();
  const byState = (stateTaxRates as StateTaxBracketMap)[st];
  const rows = byState?.[filingStatus] ?? [];
  const brackets: TaxBracket[] = rows.map((r) => ({
    min: Number(r.min ?? 0),
    max: typeof r.max === "number" && Number.isFinite(r.max) ? Number(r.max) : undefined,
    rate: Number(r.rate ?? 0),
  }));
  return computeProgressiveTax(agi, brackets);
}

function computeStateBenefitCapped(
  benefit: ReturnType<typeof getStateTaxBenefitConfig> | null,
  contributionsForYear: number,
  agi: number,
  filingStatus: FilingStatusOption,
  stateCode: string,
): number {
  const contrib = clampMoney(contributionsForYear);
  const income = clampMoney(agi);
  const st = (stateCode || "").toUpperCase();

  if (!benefit) return 0;

  const type = benefit.type;
  const amount = clampMoney(benefit.amount ?? 0);
  const creditPercent = clampMoney(benefit.creditPercent ?? 0);

  if (type === "none") return 0;

  // State tax liability used to cap NON-refundable credits (and is also the ceiling for tax savings).
  const taxBefore = getStateIncomeTaxLiability(st, filingStatus, income);
  if (taxBefore <= 0) return 0;

  if (type === "credit") {
    const qualifying = amount > 0 ? Math.min(contrib, amount) : 0;
    const rawCredit = qualifying * creditPercent;
    return Math.max(0, Math.min(taxBefore, rawCredit));
  }

  // type === "deduction"
  // Deduction base cannot exceed income (AGI-as-taxable-income model).
  const deductibleBase = amount > 0 ? Math.min(contrib, amount, income) : 0;
  if (deductibleBase <= 0) return 0;

  const taxAfter = getStateIncomeTaxLiability(st, filingStatus, Math.max(0, income - deductibleBase));
  const savings = Math.max(0, taxBefore - taxAfter);
  return Math.max(0, Math.min(taxBefore, savings));
}

import wtaPovertyLevel from "@/config/rules/wtaPovertyLevel.json";
import federalTaxBrackets from "@/config/rules/federalTaxBrackets.json";
import { buildPlannerSchedule } from "@/lib/calc/usePlannerSchedule";

const WELCOME_KEY = "ablePlannerWelcomeAcknowledged";

type FilingStatusOption = "single" | "married_joint" | "married_separate" | "head_of_household";
type PlannerState = string;

type FscAnswers = {
  hasTaxLiability: boolean | null;
  isOver18: boolean | null;
  isStudent: boolean | null;
  isDependent: boolean | null;
};

const EMPTY_FSC: FscAnswers = {
  hasTaxLiability: null,
  isOver18: null,
  isStudent: null,
  isDependent: null,
};
const FSC_REQUIRED_ANSWERS: Record<keyof FscAnswers, boolean> = {
  hasTaxLiability: true,
  isOver18: true,
  isStudent: false,
  isDependent: false,
};

const INITIAL_MESSAGES: string[] = ["", "", "", ""];

const SCREEN2_DEFAULT_MESSAGES: string[] = ["", "", "", "", ""];

const WTA_BASE_ANNUAL_LIMIT = 20000;
const getMonthsRemainingInCurrentCalendarYear = (startIndex: number) => {
  if (!Number.isFinite(startIndex)) {
    return 12;
  }
  const monthOfYearIndex = ((startIndex % 12) + 12) % 12;
  const remaining = 12 - monthOfYearIndex;
  return remaining > 0 ? remaining : 12;
};
type WtaMode = "idle" | "initialPrompt" | "wtaQuestion" | "noPath" | "combinedLimit";
type WtaStatus = "unknown" | "ineligible" | "eligible";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getPovertyLevel = (state: PlannerState) => {
  const entry = (wtaPovertyLevel as Record<string, { onePerson: number }>)[state];
  if (entry?.onePerson) return entry.onePerson;
  return wtaPovertyLevel.default.onePerson;
};

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

type StateTaxBenefitType = "none" | "deduction" | "credit";

type StateTaxBenefitConfig = {
  type: StateTaxBenefitType;
  amount: number;
  creditPercent: number;
};

type StateTaxDeductionEntry = {
  name: string;
  benefits: Record<string, StateTaxBenefitConfig>;
};

const getStateTaxBenefitConfig = (
  stateCode: string,
  filingStatus: FilingStatusOption,
): StateTaxBenefitConfig | null => {
  const entries = stateTaxDeductions as Record<string, StateTaxDeductionEntry>;
  const entry = entries[stateCode];
  if (!entry) return null;
  return entry.benefits[filingStatus] ?? entry.benefits.single ?? null;
};

export default function Home() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [active, setActive] = useState<NavKey>("inputs");
  const [reportView, setReportView] = useState<"account_growth" | "tax_benefits">("account_growth");
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
  useEffect(() => {
    setWtaAutoApplied(false);
    setWtaDismissed(false);
  }, [monthlyContribution, monthlyContributionFuture]);

  const [showWelcome, setShowWelcome] = useState(true);
  const [amortizationView, setAmortizationView] = useState<"able" | "taxable">("able");
  const [sidebarDesktopTopOffset, setSidebarDesktopTopOffset] = useState(0);
  const fscPassedRef = useRef(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const inputsColumnRef = useRef<HTMLDivElement | null>(null);
  const consoleCardRef = useRef<HTMLDivElement | null>(null);
  const fscQuestionnaireRef = useRef<HTMLDivElement | null>(null);
  const lastMobileConsoleModeRef = useRef<"annual" | "residency" | "fsc" | "ssi" | null>(null);
  const currentClientConfig = getClientConfig(plannerStateCode);
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
  const languageToggle = (
    <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-black">
      <button
        type="button"
        aria-pressed={language === "en"}
        className={[
          "rounded-full px-3 py-1 text-xs font-semibold",
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
          "rounded-full px-3 py-1 text-xs font-semibold",
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
  const monthlyContributionNum =
    Number((monthlyContribution ?? "").replace(".00","")) || 0;
  const annualContributionLimit =
    wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;
  const agiValueForSsiWarning = Number(plannerAgi);
  const agiValidForSsiWarning =
    plannerAgi !== "" &&
    !Number.isNaN(agiValueForSsiWarning) &&
    (agiValueForSsiWarning > 0 || agiValueForSsiWarning === 0);
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
  };

  const disclosuresBodyParagraphs = (landingCopy.disclosuresBody || "").split("\n\n").filter(Boolean);

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
    const clean = value.replace(".00","");
    const parts = clean.split(".");
    if (parts.length <= 2) {
      return clean;
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
    const { year, month } = monthIndexToParts(index);
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(language === "es" ? "es" : "en", {
      month: "short",
      year: "numeric",
    }).format(date);
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
    const maxIndex = Math.max(startIndex, horizonEndIndex);

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
      setContributionFromIndex(maxIndex);
    } else {
      const clamped = clampNumber(contributionIndex, minIndex, maxIndex);
      if (clamped !== contributionIndex) {
        setContributionFromIndex(clamped);
      }
    }

    const withdrawalIndex = parseMonthYearToIndex(withdrawalStartYear, withdrawalStartMonth);
    if (!withdrawalStartTouched || withdrawalIndex === null) {
      setWithdrawalFromIndex(minIndex);
    } else {
      const clamped = clampNumber(withdrawalIndex, minIndex, maxIndex);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile || showWelcome || active !== "inputs" || inputStep !== 1) {
      lastMobileConsoleModeRef.current = null;
      return;
    }

    const mode: "annual" | "residency" | "fsc" | "ssi" | null = residencyBlocking
      ? "residency"
      : showSsiIncomeEligibilityWarning
        ? "ssi"
      : showFscQuestionnaire
        ? "fsc"
        : annualReturnWarningText
          ? "annual"
          : null;

    if (!mode || lastMobileConsoleModeRef.current === mode) {
      if (!mode) {
        lastMobileConsoleModeRef.current = null;
      }
      return;
    }

    lastMobileConsoleModeRef.current = mode;
    consoleCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (mode === "annual") {
      window.setTimeout(() => {
        const annualReturnInput = document.getElementById("demographics-annual-return") as HTMLInputElement | null;
        annualReturnInput?.focus({ preventScroll: true });
        annualReturnInput?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [
    active,
    annualReturnWarningText,
    inputStep,
    residencyBlocking,
    showSsiIncomeEligibilityWarning,
    showFscQuestionnaire,
    showWelcome,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile || showWelcome || active !== "inputs" || inputStep !== 1 || !showFscQuestionnaire) {
      return;
    }
    window.setTimeout(() => {
      fscQuestionnaireRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [active, inputStep, showFscQuestionnaire, showWelcome]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const measureSidebarOffset = () => {
      if (window.innerWidth < 768) return;
      const shellTop = shellRef.current?.getBoundingClientRect().top;
      const cardTop = consoleCardRef.current?.getBoundingClientRect().top;
      if (!Number.isFinite(shellTop) || !Number.isFinite(cardTop)) return;
      const next = Math.max(0, Math.round((cardTop as number) - (shellTop as number)));
      setSidebarDesktopTopOffset((prev) => (prev === next ? prev : next));
    };

    const rafId = window.requestAnimationFrame(measureSidebarOffset);
    window.addEventListener("resize", measureSidebarOffset);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => measureSidebarOffset());
      if (shellRef.current) observer.observe(shellRef.current);
      if (consoleCardRef.current) observer.observe(consoleCardRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureSidebarOffset);
      observer?.disconnect();
    };
  }, [
    active,
    inputStep,
    reportView,
    showWelcome,
    language,
    messagesMode,
    annualReturnWarningText,
    residencyBlocking,
    showFscQuestionnaire,
  ]);

  const handleWelcomeContinue = () => {
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
    setInputStep(1);
    setBeneficiaryName("");
    setBeneficiaryStateOfResidence("");
    setPlannerFilingStatus("single");
    setPlannerAgi("");
    const client = getClientConfig(plannerStateCode);
    const candidateAnnualReturn = client?.defaults?.annualReturn;
    const defaultAnnualReturn =
      typeof candidateAnnualReturn === "number" && Number.isFinite(candidateAnnualReturn)
        ? formatDecimalToPercentString(candidateAnnualReturn)
        : "";
    const candidateTimeHorizon = client?.defaults?.timeHorizonYears ?? null;
    const defaultTimeHorizon =
      typeof candidateTimeHorizon === "number" && Number.isFinite(candidateTimeHorizon)
        ? String(Math.round(candidateTimeHorizon))
        : "40";
    setAnnualReturn(defaultAnnualReturn);
    setAnnualReturnEdited(false);
    setAnnualReturnWarningMax(null);
    setIsSsiEligible(false);
    setStartingBalance("");
    setMonthlyContribution("");
    setMonthlyContributionFuture("");
    setContributionEndYear("");
    setContributionEndMonth("");
    setMonthlyWithdrawal("");
    setWithdrawalStartYear("");
    setWithdrawalStartMonth("");
    setNonResidentProceedAck(false);
    resetWtaFlow();
    setFscStatus("idle");
    setFscQ({ ...EMPTY_FSC });
    setMessagesMode("intro");
    setAgiGateEligible(null);
    setScreen1Messages([...screen1DefaultMessages]);
    setContributionIncreasePct("");
    setWithdrawalIncreasePct("");
    setContributionIncreaseHelperText(undefined);
    setContributionBreachYear(null);
    setStopContributionIncreasesAfterYear(null);
    setWtaAutoPromptedForIncrease(false);
    setScreen2Messages([...screen2DefaultMessages]);
    setTimeHorizonYears(defaultTimeHorizon);
    setTimeHorizonEdited(false);
    setContributionEndTouched(false);
    setWithdrawalStartTouched(false);
    setWtaAutoApplied(false);
    setWtaDismissed(false);
    setReportWindowYears("max");
  };
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

  const content = (() => {
    const agiValue = Number(plannerAgi);
    const agiValid =
      plannerAgi !== "" && !Number.isNaN(agiValue) && (agiValue > 0 || agiValue === 0);

    const monthlyContributionNumber = monthlyContribution === "" ? 0 : Number(monthlyContribution);

    // If we have a future-monthly override (used for full future calendar years),
    // use that for 12-month annual calculations and breach logic.
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
    const horizonConfig = getHorizonConfig();
    const monthsRemainingInCurrentCalendarYear = getMonthsRemainingInCurrentCalendarYear(
      horizonConfig.startIndex,
    );
    const plannedCurrentYearContribution = monthlyContributionNumber * monthsRemainingInCurrentCalendarYear;
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
    const hasContributionIssue =
      inputStep === 2 && (breachNow || breachFuture);
    const residencyMismatch =
      beneficiaryStateOfResidence &&
      planState &&
      beneficiaryStateOfResidence !== planState;
    const residencyBlocking =
      residencyMismatch &&
      (planResidencyRequired || !nonResidentProceedAck);
    const isNextDisabled =
      (inputStep === 1 && (!agiValid || residencyBlocking)) ||
      (inputStep === 2 && hasContributionIssue);

    const deriveMonthlyCaps = (limit: number) => {
      const monthsRemaining = getMonthsRemainingInCurrentCalendarYear(horizonConfig.startIndex);
      const currentYearMaxMonthly = Math.floor(limit / monthsRemaining);
      const futureYearMaxMonthly = Math.floor(limit / 12);
      return { currentYearMaxMonthly, futureYearMaxMonthly };
    };
    const formatMonthlyLabel = (value: number) => formatCurrency(value).replace(".00", "");
    const horizonLimits = getTimeHorizonLimits();
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(2020, i, 1);
  return {
    value: String(i + 1).padStart(2, "0"),
    label: new Intl.DateTimeFormat(language === "es" ? "es" : "en", { month: "long" }).format(date),
  };
});
    const enforceTimeHorizonLimits = () => {
      const { minYears, maxYears } = horizonLimits;
      if (timeHorizonYears === "") {
        return;
      }
      const parsed = parseIntegerInput(timeHorizonYears);
      if (parsed === null) {
        return;
      }
      let next = parsed;
      if (next < minYears) next = minYears;
      if (next > maxYears) next = maxYears;
      if (String(next) !== timeHorizonYears) {
        setTimeHorizonYears(String(next));
      }
    };

    const goToNextStep = () => {
      if (inputStep === 1) {
        if (!agiValid || residencyBlocking) return;
        setInputStep(2);
        return;
      }
      if (hasContributionIssue) return;
      enforceTimeHorizonLimits();
      setActive("reports");
      setReportView("account_growth");
    };

    const questions: Array<{ key: keyof FscAnswers; label: string }> = [
      { key: "hasTaxLiability", label: (copy.labels?.fsc?.taxLiability ?? "")},
      { key: "isOver18", label: (copy.labels?.fsc?.age18 ?? "")},
      { key: "isStudent", label: (copy.labels?.fsc?.student ?? "")},
      { key: "isDependent", label: (copy.labels?.fsc?.dependent ?? "")},
    ];

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

    const currentQuestionIndexRaw = questions.findIndex((question) => fscQ[question.key] === null);
    const visibleQuestionCount = currentQuestionIndexRaw === -1 ? questions.length : currentQuestionIndexRaw + 1;
    const visibleQuestions = questions.slice(0, visibleQuestionCount);
    const answerFscQuestion = (key: keyof FscAnswers, value: boolean) => {
      setFscQ((prev) => ({ ...prev, [key]: value }));
      const required = FSC_REQUIRED_ANSWERS[key];
      if (value !== required) {
        finalizeFscEvaluation(false);
        return;
      }
      const answeredQuestionIndex = questions.findIndex((question) => question.key === key);
      if (answeredQuestionIndex >= questions.length - 1) {
        finalizeFscEvaluation(true);
      }
    };

    const showQuestionnaire = messagesMode === "fsc" && agiGateEligible === true;

    const getFscButtonLabel = () => {
      if (agiGateEligible === null) return copy?.buttons?.enterAgiToTestEligibility ?? "";
      if (agiGateEligible === false) return copy?.buttons?.notEligibleBasedOnAgi ?? "";
      if (fscStatus === "eligible") return copy?.buttons?.eligibleRetest ?? "";
      if (fscStatus === "ineligible") return copy?.buttons?.notEligibleRetest ?? "";
      return copy?.buttons?.eligibleToEvaluate ?? "";
    };

    const horizonYearOptions = getYearOptions(
      horizonConfig.startIndex,
      horizonConfig.horizonEndIndex,
    );

    const promptlyStartWta = () => {
      setWtaMode("wtaQuestion");
      setWtaHasEarnedIncome(null);
      setWtaEarnedIncome("");
      setWtaRetirementPlan(null);
    };

    const handleOverLimitNo = () => {
      const numeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
      const { startIndex } = getHorizonConfig();
      const monthsRemainingInCurrentCalendarYear = getMonthsRemainingInCurrentCalendarYear(startIndex);
      const plannedCurrentYear = Number.isFinite(numeric)
        ? numeric * monthsRemainingInCurrentCalendarYear
        : 0;
      const plannedAnnual = Number.isFinite(numeric) ? numeric * 12 : 0;
      const breachNow = plannedCurrentYear > WTA_BASE_ANNUAL_LIMIT;
      const breachFuture = plannedAnnual > WTA_BASE_ANNUAL_LIMIT;
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
      const earnedIncomeValue = Number(wtaEarnedIncome);
      if (!wtaHasEarnedIncome || Number.isNaN(earnedIncomeValue) || earnedIncomeValue <= 0) {
        setWtaStatus("ineligible");
        setWtaAdditionalAllowed(0);
        setWtaCombinedLimit(WTA_BASE_ANNUAL_LIMIT);
        setWtaMode("noPath");
        return;
      }
      if (retirementAnswer) {
        handleOverLimitNo();
        return;
      }
      const povertyLevel = getPovertyLevel(plannerStateCode);
      const additionalAllowed = Math.min(earnedIncomeValue, povertyLevel);
      const combinedLimitValue = WTA_BASE_ANNUAL_LIMIT + additionalAllowed;
      setWtaAdditionalAllowed(additionalAllowed);
      setWtaCombinedLimit(combinedLimitValue);
      setWtaStatus("eligible");
      const monthlyNumeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
      const plannedAnnual = Number.isFinite(monthlyNumeric) ? monthlyNumeric * 12 : 0;
      setWtaMode(plannedAnnual > combinedLimitValue ? "combinedLimit" : "idle");
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

    const renderResidencyWarning = () => {
      const primaryButtonClass =
        "w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap";
      const secondaryButtonClass =
        "w-full rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 whitespace-nowrap hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900";
      const buttonContainerClass = "flex flex-col gap-3 mt-4";

      if (planResidencyRequired) {
        return (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {(copy?.labels?.residencyNotAllowed ?? "").split("{{plan}}").join(planLabel).replace("{{state}}", planName) + " " + (copy?.labels?.residencyGeneralAdvice ?? "")}
            </p>
            <div className={buttonContainerClass}>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={changeResidencyToPlan}
              >{copy?.buttons?.changeResidencyProceed ?? ""}</button>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {copy?.labels?.residencyGeneralAdvice ?? ""}
          </p>
          <div className={buttonContainerClass}>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={acknowledgeNonResident}
            >{copy?.buttons?.understandProceed ?? ""}</button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={changeResidencyToPlan}
            >{copy?.buttons?.changeResidencyProceed ?? ""}</button>
          </div>
        </div>
      );
    };

    const renderScreen2Messages = () => {
      const forcedMsg =
        ssiMessages.find((message) => message.code === "SSI_FORCED_WITHDRAWALS_APPLIED") ?? null;
      return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
          {renderAccountEndingBlock()}
          {renderAbleDepletionNotice()}
          {planMessages.length > 0 && (
            <div className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100">
              <p className="text-sm leading-relaxed">
                
{(copy?.messages?.planMaxReached ?? "")
  .replace("{{month}}", planMessages[0].data.monthLabel)
  
.replace("{{cap}}", formatCurrency(planMessages[0].data.planMax).replace(".00", ""))}

              </p>
            </div>
          )}
          {ssiMessages.length > 0 && (
            <div className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100">
              <div className="mb-2 whitespace-pre-line text-sm leading-relaxed">{
              (copy?.messages?.balanceCapWarning ?? "")
  .split("{{cap}}").join("$100,000")
  
.replace("{{breach}}", (ssiMessages[0]?.data?.monthLabel ?? ""))
  
.replace("{{stop}}", (planMessages[0]?.data?.monthLabel ?? ssiMessages[0]?.data?.monthLabel ?? ""))
  .replace("{{withdrawStart}}", (forcedMsg?.data?.monthLabel ?? ""))
}</div>
            </div>
          )}
          {screen2Messages.map((message, index) => (
            <p
              key={`${message}-${index}`}
              className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              {message}
            </p>
          ))}
        </div>
      );
    };

    const renderScreen2Panel = () => {
      const buttonBase =
        "flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition";

      if (wtaMode === "initialPrompt") {
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            {renderAccountEndingBlock()}
            {renderAbleDepletionNotice()}
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              
              {(copy?.messages?.workToAblePrompt ?? "")
  .replace("{{cap}}", "$20,000")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={[
                  buttonBase,
                  "border-transparent bg-[var(--brand-primary)] text-white",
                ].join(" ")}
                onClick={promptlyStartWta}
              >{copy?.buttons?.yes ?? ""}</button>
              <button
                type="button"
                className={[
                  buttonBase,
                  "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                ].join(" ")}
                onClick={handleOverLimitNo}
              >{copy?.buttons?.no ?? ""}</button>
            </div>
          </div>
        );
      }

      if (wtaMode === "wtaQuestion") {
        const earnedIncomeValue = Number(wtaEarnedIncome);
        const showStep3 = earnedIncomeValue > 0;
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            {renderAccountEndingBlock()}
            {renderAbleDepletionNotice()}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {copy?.labels?.inputs?.wtaEarnedIncomeQuestion ?? ""}
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    className={[
                      buttonBase,
                      wtaHasEarnedIncome === true
                        ? "border-transparent bg-[var(--brand-primary)] text-white"
                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                    ].join(" ")}
                    onClick={() => handleEarnedIncomeAnswer(true)}
                  >{copy?.buttons?.yes ?? ""}</button>
                  <button
                    type="button"
                    className={[
                      buttonBase,
                      wtaHasEarnedIncome === false
                        ? "border-transparent bg-[var(--brand-primary)] text-white"
                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                    ].join(" ")}
                    onClick={() => handleEarnedIncomeAnswer(false)}
                  >{copy?.buttons?.no ?? ""}</button>
                </div>
              </div>
              {wtaHasEarnedIncome === true && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{copy?.labels?.inputs?.wtaEarnedIncomeInput ?? ""}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wtaEarnedIncome}
                    onChange={(e) => setWtaEarnedIncome(sanitizeAmountInput(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] focus-visible:ring-inset md:text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              )}
              {showStep3 && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{copy?.labels?.inputs?.wtaRetirementPlanQuestion ?? ""}</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      className={[
                        buttonBase,
                        wtaRetirementPlan === true
                          ? "border-transparent bg-[var(--brand-primary)] text-white"
                          : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                      ].join(" ")}
                      onClick={() => evaluateWtaEligibility(true)}
                    >{copy?.buttons?.yes ?? ""}</button>
                    <button
                      type="button"
                      className={[
                        buttonBase,
                        wtaRetirementPlan === false
                          ? "border-transparent bg-[var(--brand-primary)] text-white"
                          : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                      ].join(" ")}
                      onClick={() => evaluateWtaEligibility(false)}
                    >{copy?.buttons?.no ?? ""}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      const showWtaPanel =
        !wtaDismissed && (wtaMode === "noPath" || wtaMode === "combinedLimit");

      if (!showWtaPanel) {
        return renderScreen2Messages();
      }

      if (wtaStatus === "ineligible" && !wtaDismissed) {
        const baseLimitCaps = deriveMonthlyCaps(WTA_BASE_ANNUAL_LIMIT);
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            {renderAccountEndingBlock()}
            {renderAbleDepletionNotice()}
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
              {(() => {
                const part1 = (copy?.messages?.wtaNotEligible ?? "").trim();
                const part2 = copy?.messages?.wtaAutoAppliedAdjustedLine ?? "";
                const template = copy?.messages?.wtaAutoAppliedMonthlyCapHint ?? "";
                const current = formatMonthlyLabel(baseLimitCaps.currentYearMaxMonthly);
                const future = formatMonthlyLabel(baseLimitCaps.futureYearMaxMonthly);
                const part3 = template
                  ? template.replace("{{current}}", current).replace("{{future}}", future)
                  : "";
                return [part1, part2, part3].filter(Boolean).join("\n\n");
              })()}
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
              onClick={() => {
                setWtaDismissed(true);
                setWtaMode("idle");
              }}
            >
              OK
            </button>
          </div>
        );
      }

      if (wtaStatus === "eligible" && !wtaDismissed) {
        const combinedLimitCaps = deriveMonthlyCaps(wtaCombinedLimit);
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            {renderAccountEndingBlock()}
            {renderAbleDepletionNotice()}
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
              {(() => {
                const firstPart = (copy?.messages?.wtaEligibleOverCombinedLine1 ?? "")
                  .replace("{{additional}}", formatCurrency(wtaAdditionalAllowed).replace(".00",""))
                  .replace("{{combined}}", formatCurrency(wtaCombinedLimit).replace(".00",""));
                const secondPart = copy?.messages?.wtaAutoAppliedAdjustedLine ?? "";
                const template = copy?.messages?.wtaAutoAppliedMonthlyCapHint ?? "";
                const current = formatMonthlyLabel(combinedLimitCaps.currentYearMaxMonthly);
                const future = formatMonthlyLabel(combinedLimitCaps.futureYearMaxMonthly);
                const thirdPart = template
                  ? template.replace("{{current}}", current).replace("{{future}}", future)
                  : "";
                return [firstPart, secondPart, thirdPart].filter(Boolean).join("\n\n");
              })()}
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
              onClick={() => {
                setWtaDismissed(true);
                setWtaMode("idle");
              }}
            >
              OK
            </button>
          </div>
        );
      }

      return renderScreen2Messages();
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
    const startingBalanceValue = parseAmount(startingBalance);
    const monthlyContributionValue = parseAmount(monthlyContribution);
    const monthlyContributionFutureValue =
      monthlyContributionFuture !== ""
        ? parseAmount(monthlyContributionFuture)
        : monthlyContributionValue;
    const monthlyWithdrawalValue = parseAmount(monthlyWithdrawal);
    const contributionEndRaw = parseMonthYearToIndex(contributionEndYear, contributionEndMonth);
    const contributionEndIndexValue =
      contributionEndRaw !== null
        ? clampNumber(contributionEndRaw, startIndex, horizonEndIndex)
        : horizonEndIndex;
    const withdrawalStartRaw = parseMonthYearToIndex(withdrawalStartYear, withdrawalStartMonth);
    const withdrawalStartIndexValue =
      withdrawalStartRaw !== null
        ? clampNumber(withdrawalStartRaw, startIndex, horizonEndIndex)
        : startIndex;
    const contributionIncreaseValue = Number(contributionIncreasePct);
    const withdrawalIncreaseValue = Number(withdrawalIncreasePct);
    

    // Compute stop year synchronously so the schedule matches the helper message (no useEffect timing lag).
    const computedStopContributionIncreasesAfterYear = (() => {
      const pctRaw = Number(contributionIncreasePct);
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

const { scheduleRows, ssiMessages, planMessages, taxableRows } = buildPlannerSchedule({
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
        contributionEndIndex: contributionEndIndexValue,
        withdrawalStartIndex: withdrawalStartIndexValue,
        annualReturnDecimal: parsePercentStringToDecimal(annualReturn) ?? 0,
        isSsiEligible,
        agi: agiValid ? agiValue : null,
        filingStatus: plannerFilingStatus,
        stateOfResidence: beneficiaryStateOfResidence || null,
        enabled: hasTimeHorizon,
      planMaxBalance,
      });     

    const endingValueInfo = (() => {
      if (!scheduleRows.length) {
        return {
          endingLabel: "—",
          depletionEligible: false,
          reachLabel: "",
          stopLabel: "",
        };
      }
      const lastRow = scheduleRows[scheduleRows.length - 1];
      const endingValue = Number.isFinite(lastRow?.endingBalance) ? lastRow.endingBalance : NaN;
      const endingLabel = Number.isFinite(endingValue)
        ? formatCurrency(endingValue).replace(".00", "")
        : "—";
      const scheduleHasWithdrawals = scheduleRows.some((row) =>
        row.months.some(
          (monthRow) =>
            Number.isFinite(monthRow.withdrawal) && monthRow.withdrawal > 0,
        ),
      );
      let depletionMonthIndex: number | null = null;
      for (const row of scheduleRows) {
        for (const monthRow of row.months) {
          if (!Number.isFinite(monthRow.endingBalance)) continue;
          if (monthRow.endingBalance <= 0.01) {
            depletionMonthIndex = monthRow.monthIndex;
            break;
          }
        }
        if (depletionMonthIndex !== null) break;
      }
      const depletionEligible =
        scheduleHasWithdrawals &&
        depletionMonthIndex !== null &&
        depletionMonthIndex < horizonEndIndex;
      const reachLabel =
        depletionMonthIndex !== null ? formatMonthYearLabel(depletionMonthIndex) : "";
      const stopLabel = reachLabel;
      return {
        endingLabel,
        depletionEligible,
        reachLabel,
        stopLabel,
      };
    })();
    const renderAccountEndingBlock = () => {
      return (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {copy?.messages?.accountEndingValueLabel ?? ""}
            </div>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {endingValueInfo.endingLabel}
            </div>
          </div>
        </div>
      );
    };
    const renderAbleDepletionNotice = () => {
      if (!endingValueInfo.depletionEligible) return null;
      return (
        <div className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100">
          <p className="text-sm leading-relaxed">
            {(copy?.messages?.ableDepletionNotice ??
              "Based on your assumptions, the ABLE account balance reaches zero in {{reachMonthYear}}. Accordingly, withdrawals are stopped in this planner after {{stopMonthYear}}.")
              .replace("{{reachMonthYear}}", endingValueInfo.reachLabel || "")
              .replace("{{stopMonthYear}}", endingValueInfo.stopLabel || "")}
          </p>
        </div>
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
    const scheduleRowsWithBenefits = scheduleRows.map((yearRow) => {
      const contributionsForYear = Math.max(0, yearRow.contribution);
      const federalTaxLiability = showFederalSaverCredit
        ? getFederalIncomeTaxLiability(plannerFilingStatus, agiValid ? agiValue : 0)
        : 0;
      const federalCreditRaw = showFederalSaverCredit
        ? Math.min(contributionsForYear, fscContributionLimit) * fscCreditPercent
        : 0;
      const federalCredit = showFederalSaverCredit
        ? Math.min(federalCreditRaw, federalTaxLiability)
        : 0;
      const stateBenefitAmount = computeStateBenefitCapped(
        stateBenefitConfig,
        contributionsForYear,
        agiValid ? agiValue : 0,
        plannerFilingStatus,
        benefitStateCode,
      );
      const months = yearRow.months.map((monthRow) => {
        const monthNumber = (monthRow.monthIndex % 12) + 1;
        const isDecember = monthNumber === 12;
        return {
          ...monthRow,
          saversCredit: isDecember ? federalCredit : 0,
          stateBenefit: isDecember ? stateBenefitAmount : 0,
        };
      });
      return {
        ...yearRow,
        saversCredit: federalCredit,
        stateBenefit: stateBenefitAmount,
        months,
      };
    });
    const reportWindowYearsValue =
      reportWindowYears === "max"
        ? horizonConfig.safeYears
        : Math.min(reportWindowYears, horizonConfig.safeYears);
    const reportWindowEndIndex =
      reportWindowYearsValue > 0 ? startIndex + reportWindowYearsValue * 12 - 1 : startIndex - 1;
    const reportAbleRows = scheduleRowsWithBenefits
      .filter((row) => row.year >= 0)
      .map((row) => {
        const months = row.months.filter((month) => month.monthIndex <= reportWindowEndIndex);
        if (!months.length) return null;
        let contribution = 0;
        let withdrawal = 0;
        let earnings = 0;
        let fedTax = 0;
        let stateTax = 0;
        let saversCredit = 0;
        let stateBenefit = 0;
        for (const month of months) {
          contribution += Number.isFinite(month.contribution) ? month.contribution : 0;
          withdrawal += Number.isFinite(month.withdrawal) ? month.withdrawal : 0;
          earnings += Number.isFinite(month.earnings) ? month.earnings : 0;
          fedTax += Number.isFinite(month.fedTax) ? month.fedTax : 0;
          stateTax += Number.isFinite(month.stateTax) ? month.stateTax : 0;
          saversCredit += Number.isFinite(month.saversCredit) ? month.saversCredit : 0;
          stateBenefit += Number.isFinite(month.stateBenefit) ? month.stateBenefit : 0;
        }
        return {
          ...row,
          months,
          contribution,
          withdrawal,
          earnings,
          fedTax,
          stateTax,
          saversCredit,
          stateBenefit,
          endingBalance: months[months.length - 1]?.endingBalance ?? row.endingBalance,
        };
      })
      .filter(Boolean) as typeof scheduleRowsWithBenefits;
    const reportTaxableRows = taxableRows
      .filter((row) => row.year >= 0)
      .map((row) => {
        const months = row.months.filter((month) => month.monthIndex <= reportWindowEndIndex);
        if (!months.length) return null;
        let contribution = 0;
        let withdrawal = 0;
        let investmentReturn = 0;
        let federalTaxOnEarnings = 0;
        let stateTaxOnEarnings = 0;
        for (const month of months) {
          contribution += Number.isFinite(month.contribution) ? month.contribution : 0;
          withdrawal += Number.isFinite(month.withdrawal) ? month.withdrawal : 0;
          investmentReturn += Number.isFinite(month.investmentReturn) ? month.investmentReturn : 0;
          federalTaxOnEarnings += Number.isFinite(month.federalTaxOnEarnings) ? month.federalTaxOnEarnings : 0;
          stateTaxOnEarnings += Number.isFinite(month.stateTaxOnEarnings) ? month.stateTaxOnEarnings : 0;
        }
        return {
          ...row,
          months,
          contribution,
          withdrawal,
          investmentReturn,
          federalTaxOnEarnings,
          stateTaxOnEarnings,
          endingBalance: months[months.length - 1]?.endingBalance ?? row.endingBalance,
        };
      })
      .filter(Boolean) as typeof taxableRows;
    const accountGrowthNarrative = buildAccountGrowthNarrative({
      language,
      ableRows: reportAbleRows,
      taxableRows: reportTaxableRows,
    });
    const accountGrowthNarrativeParagraphs = accountGrowthNarrative
      .split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (active === "reports") {
      const reportTitle = copy?.ui?.sidebar?.reports ?? "Reports";
      const accountGrowthTabLabel = copy?.labels?.reports?.accountGrowthTab ?? "Account Growth";
      const taxBenefitsTabLabel = copy?.labels?.reports?.taxBenefitsTab ?? "Tax Benefits";
      const reportWindowLabel =
        language === "es" ? "Ventana de reporte" : "Report Window";
      return (
        <div className="space-y-6">
          <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-3">
            <div className="flex items-center justify-between gap-3 md:justify-start">
              <div
                role="tablist"
                aria-label={reportTitle}
                className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportView === "account_growth"}
                  className={[
                    "rounded-full px-4 py-1 text-xs font-semibold transition",
                    reportView === "account_growth"
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                  ].join(" ")}
                  onClick={() => setReportView("account_growth")}
                >
                  {accountGrowthTabLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportView === "tax_benefits"}
                  className={[
                    "rounded-full px-4 py-1 text-xs font-semibold transition",
                    reportView === "tax_benefits"
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                  ].join(" ")}
                  onClick={() => setReportView("tax_benefits")}
                >
                  {taxBenefitsTabLabel}
                </button>
              </div>
              <div className="md:hidden">{languageToggle}</div>
            </div>
            <div className="inline-flex flex-nowrap items-center gap-1.5 overflow-x-auto">
              <span className="hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 md:inline">
                {reportWindowLabel}
              </span>
              <div className="inline-flex flex-nowrap rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                {(() => {
                  const hasPresetMatchingHorizon = REPORT_WINDOW_OPTIONS.some(
                    (option) => option !== "max" && option === horizonConfig.safeYears,
                  );
                  const showMaxOption = !hasPresetMatchingHorizon;
                  const optionsToRender = REPORT_WINDOW_OPTIONS.filter(
                    (option) => option !== "max" || showMaxOption,
                  );
                  return optionsToRender.map((option) => {
                  const isMax = option === "max";
                  const optionYears = isMax ? horizonLimits.maxYears : option;
                  const disabled = !isMax && horizonConfig.safeYears > 0 && option > horizonConfig.safeYears;
                  const isActive =
                    reportWindowYears === option ||
                    (!showMaxOption &&
                      reportWindowYears === "max" &&
                      option !== "max" &&
                      option === horizonConfig.safeYears);
                  const label = isMax
                    ? language === "es"
                      ? `${horizonConfig.safeYears}A`
                      : `${horizonConfig.safeYears}Y`
                    : language === "es"
                      ? `${optionYears}A`
                      : `${optionYears}Y`;
                  return (
                    <button
                      key={`report-window-${option}`}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isActive}
                      className={[
                        "rounded-full px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap transition md:px-3 md:text-xs",
                        isActive
                          ? "bg-[var(--brand-primary)] text-white shadow-sm"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                        disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : "",
                      ].join(" ")}
                      onClick={() => setReportWindowYears(option)}
                    >
                      {label}
                    </button>
                  );
                  });
                })()}
              </div>
            </div>
            <div className="hidden md:block">{languageToggle}</div>
          </div>
          <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {reportTitle}
            </h1>
            {reportView === "account_growth" ? (
              <div className="mt-4 space-y-4">
                {accountGrowthNarrativeParagraphs.map((paragraph, index) => (
                  <p
                    key={`account-growth-narrative-${index}`}
                    className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {copy?.labels?.ui?.placeholderComingSoon ?? ""}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (active === "schedule") {
      if (!hasTimeHorizon) {
        return (
          <div className="space-y-6">
            <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {copy?.labels?.schedule?.amortizationTitle ?? ""}
                </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {copy?.labels?.schedule?.enterTimeHorizonPrompt ?? ""}
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="h-full text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4">
              <h1 className="order-1 w-full text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50 md:order-2 md:flex-1">
                {copy?.labels?.schedule?.amortizationTitle ?? ""}
              </h1>
              <div className="order-2 flex w-full items-center justify-between md:order-1 md:w-auto md:justify-start">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={amortizationView === "able"}
                    className={[
                      "rounded-full px-4 py-1 text-xs font-semibold transition",
                      amortizationView === "able"
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "border border-zinc-200 bg-white/50 text-zinc-500 hover:border-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
                    ].join(" ")}
                    onClick={() => setAmortizationView("able")}
                  >
                    {copy?.labels?.schedule?.ableAccountToggle ?? ""}
                  </button>
                  <button
                    type="button"
                    aria-pressed={amortizationView === "taxable"}
                    className={[
                      "flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition",
                      amortizationView === "taxable"
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "border border-zinc-200 bg-white/50 text-zinc-500 hover:border-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
                    ].join(" ")}
                    onClick={() => setAmortizationView("taxable")}
                  >
                    <span>{copy?.labels?.schedule?.taxableAccountToggle ?? ""}</span>
                  </button>
                </div>
                <div className="md:hidden">
                  {languageToggle}
                </div>
              </div>
              <div className="order-3 hidden items-center justify-center md:ml-auto md:flex md:justify-end">
                {languageToggle}
              </div>
            </div>
              <div className="mt-4">
                <AmortizationScheduleTable
                  rows={scheduleRowsWithBenefits}
                  taxableRows={taxableRows}
                  view={amortizationView}
                  labels={copy?.labels?.schedule}
                />
              </div>
          </div>
        </div>
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
        <div className="space-y-6">
          <div className="flex justify-end">{languageToggle}</div>
          <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
            <h1 className="text-lg font-semibold uppercase text-zinc-900 dark:text-zinc-50">
              {assumptionTitle}
            </h1>
            {disclosuresAssumptionsOverride && (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                {disclosuresAssumptionsOverride}
              </p>
            )}
            {!disclosuresAssumptionsOverride && assumptionItems.length > 0 && (
              <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                {assumptionItems.map((item, index) => (
                  <li
                    key={`assumption-${index}`}
                    className="list-disc pl-5 text-left text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
      </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="sticky top-[calc(env(safe-area-inset-top)+6rem)] z-30 -mx-4 mb-6 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 text-xs font-semibold backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
          <div className="flex items-center gap-3">
            {inputStep === 2 && (
              <button
                type="button"
                className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                onClick={() => setInputStep(1)}
              >
                {copy?.buttons?.back ?? ""}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isNextDisabled}
              className={[
                "rounded-full px-4 py-1 text-xs font-semibold transition",
                isNextDisabled
                  ? "border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                  : "bg-[var(--brand-primary)] text-white",
              ].join(" ")}
              onClick={goToNextStep}
            >
              {copy?.buttons?.next ?? ""}
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              onClick={resetInputs}
            >
              {copy?.buttons?.refresh ?? ""}
            </button>
            {languageToggle}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 items-stretch md:grid-cols-2">
          <div ref={inputsColumnRef} className="flex-1">
            {inputStep === 1 ? (
              <DemographicsForm
                beneficiaryName={beneficiaryName}
                stateOfResidence={beneficiaryStateOfResidence}
                filingStatus={plannerFilingStatus}
                agi={plannerAgi}
                annualReturn={annualReturn}
                isSsiEligible={isSsiEligible}
                fscStatus={fscStatus}
                fscButtonLabel={getFscButtonLabel()}
                fscDisabled={agiGateEligible !== true}
                copy={{
                  title: copy.ui?.inputs?.demographics?.title,
                  labels: copy.labels?.inputs,
                }}
                onChange={(updates) => {
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
                }}
                onFscClick={() => {
                  if (agiGateEligible) {
                    setMessagesMode("fsc");
                    setFscQ({ ...EMPTY_FSC });
                  }
                }}
              />
            ) : (
            <AccountActivityForm
              timeHorizonYears={timeHorizonYears}
              startingBalance={startingBalance}
              monthlyContribution={monthlyContribution}
              contributionEndYear={contributionEndYear}
              contributionEndMonth={contributionEndMonth}
              monthlyWithdrawal={monthlyWithdrawal}
              withdrawalStartYear={withdrawalStartYear}
              withdrawalStartMonth={withdrawalStartMonth}
              contributionIncreaseDisabled={contributionIncreaseDisabledNow}
              contributionIncreaseHelperText={contributionIncreaseHelperText}
              contributionIncreasePct={contributionIncreasePct}
              withdrawalIncreasePct={withdrawalIncreasePct}
              contributionIncreaseStopYear={stopContributionIncreasesAfterYear}
              monthOptions={monthOptions}
              contributionYearOptions={horizonYearOptions}
              withdrawalYearOptions={horizonYearOptions}
              onChange={(updates) => {
                if ("timeHorizonYears" in updates) {
                  const raw = (updates.timeHorizonYears ?? "").replace(".00","");
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
                if ("monthlyWithdrawal" in updates)
                  setMonthlyWithdrawal(sanitizeAmountInput(updates.monthlyWithdrawal ?? ""));
                if ("withdrawalStartYear" in updates) {
                  setWithdrawalStartTouched(true);
                  setWithdrawalStartYear(updates.withdrawalStartYear ?? "");
                }
                if ("withdrawalStartMonth" in updates) {
                  setWithdrawalStartTouched(true);
                  setWithdrawalStartMonth(updates.withdrawalStartMonth ?? "");
                }
                if ("contributionIncreasePct" in updates) {
                  setContributionIncreasePct(updates.contributionIncreasePct ?? "");
                }
                if ("withdrawalIncreasePct" in updates) {
                  setWithdrawalIncreasePct(updates.withdrawalIncreasePct ?? "");
                }
              }}
              onAdvancedClick={() => {
                /* placeholder */
              }}
              onTimeHorizonBlur={enforceTimeHorizonLimits}
              timeHorizonLabel={
                language === "es"
                  ? `Horizonte temporal (MÁX ${horizonLimits.maxYears} AÑOS)`
                  : `Time Horizon (MAX ${horizonLimits.maxYears} YEARS)`
              }
              copy={{
                title: copy?.ui?.inputs?.accountActivity?.title,
                labels: copy.labels?.inputs,
              }}
            />
            )}
          </div>
          <div className="flex-1">
            <div className="h-full">
              <div ref={consoleCardRef} className="h-full rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
                <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                  {copy?.labels?.inputs?.plannerConsoleTitle ?? ""}
                </h2>
                <div className="mb-4 mt-2 border-b border-zinc-200 dark:border-zinc-800" />
                {inputStep === 1 ? (
                  <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
                    {showResidencyWarning && (
                      <div role="status" aria-live="polite">
                        {renderResidencyWarning()}
                      </div>
                    )}
                    {!showResidencyWarning && ssiIncomeEligibilityWarningText && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm leading-relaxed text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100"
                      >
                        {ssiIncomeEligibilityWarningText}
                      </div>
                    )}
                    {annualReturnWarningText && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm leading-relaxed text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100"
                      >
                        {annualReturnWarningText}
                      </div>
                    )}
                    {ssiSelectionPlannerMessageText && (
                      <div className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm leading-relaxed text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100">
                        {ssiSelectionPlannerMessageText}
                      </div>
                    )}
                    {showQuestionnaire && !showResidencyWarning && (
                      <div ref={fscQuestionnaireRef} className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{copy?.labels?.inputs?.fscEligibilityTitle ?? ""}</h2>
                          <p className="text-xs text-zinc-500">
                            {copy?.labels?.fsc?.intro ?? ""}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {visibleQuestions.map((question) => {
                            const selectedAnswer = fscQ[question.key];
                            const isAnswered = selectedAnswer !== null;
                            return (
                              <fieldset key={question.key} className="space-y-2">
                                <legend className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                  {question.label}
                                </legend>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className={[
                                      "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition",
                                      selectedAnswer === true
                                        ? "border-transparent bg-[var(--brand-primary)] text-white"
                                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
                                    ].join(" ")}
                                    onClick={() => answerFscQuestion(question.key, true)}
                                    disabled={isAnswered}
                                  >
                                    {copy?.buttons?.yes ?? ""}
                                  </button>
                                  <button
                                    type="button"
                                    className={[
                                      "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition",
                                      selectedAnswer === false
                                        ? "border-transparent bg-[var(--brand-primary)] text-white"
                                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
                                    ].join(" ")}
                                    onClick={() => answerFscQuestion(question.key, false)}
                                    disabled={isAnswered}
                                  >
                                    {copy?.buttons?.no ?? ""}
                                  </button>
                                </div>
                              </fieldset>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {screen1Messages.map((message, index) => (
                      <p
                        key={`${message}-${index}`}
                        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                ) : (
                  renderScreen2Panel()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })();

  if (showWelcome) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <TopNav
          title={copy.app?.title ?? ""}
          tagline={copy.app?.tagline}
          rightSlot={
            <div className="flex items-center gap-2">
              {planSelector}
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                WELCOME
              </span>
            </div>
          }
        />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6">
          <div className="flex justify-center">{languageToggle}</div>
          <div className="mt-6" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold">
              {landingCopy.heroTitle}
            </h1>

            <p className="mt-4 max-w-6xl mx-auto text-left text-base text-zinc-600 dark:text-zinc-400">
              {landingCopy.heroBody}
            </p>

            {!useLegacyLandingWelcomeOverride && (
              <>
                {landingCopy.heroBullets.length > 0 && (
                  <ul className="mt-4 flex flex-col items-center gap-2 text-base text-zinc-600 dark:text-zinc-400">
                    {landingCopy.heroBullets.map((bullet, index) => (
                      <li
                        key={`hero-bullet-${index}`}
                        className="w-full max-w-xl list-inside list-disc text-left"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}

                <section className="mt-6 space-y-2 text-left text-sm text-zinc-600 dark:text-zinc-400">
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    {landingCopy.disclosuresTitle}
                  </p>
                  {landingCopy.disclosuresIntro && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {landingCopy.disclosuresIntro}
                    </p>
                  )}
                  {disclosuresBodyParagraphs.map((paragraph, index) => {
                    const [leadIn, ...restParts] = paragraph.split("\n");
                    const rest = restParts.join("\n").trim();
                    return (
                      <p key={`disclosure-${index}`} className="text-sm text-zinc-600 dark:text-zinc-400">
                        {restParts.length > 0 ? (
                          <>
                            <strong>{leadIn.trim()}</strong>
                            {rest ? ` ${rest}` : null}
                          </>
                        ) : (
                          paragraph
                        )}
                      </p>
                    );
                  })}
                </section>
              </>
            )}

            <button
              type="button"
              onClick={handleWelcomeContinue}
              className="mt-6 mb-6 rounded-full bg-[var(--brand-primary)] px-6 py-2 text-xs font-semibold text-white"
            >
              {copy?.buttons?.welcomeContinue}
            </button>
            <div className="mt-4" />
          </div>
        </main>
        <footer className="px-4 pb-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          © 2026 Spectra Professional Services, LLC. All rights reserved.
        </footer>
      </div>
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
          onChange={setActive}
          labels={copy.ui?.sidebar}
          desktopTopOffsetPx={sidebarDesktopTopOffset}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-6">{content}</main>
      </div>
      <footer className="px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] text-center text-xs text-zinc-500 dark:text-zinc-400 md:pb-4">
        © 2026 Spectra Professional Services, LLC. All rights reserved.
      </footer>
    </div>
  );
}
