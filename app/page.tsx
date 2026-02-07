"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
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
import stateTaxDeductions from "@/config/rules/stateTaxDeductions.json";
import wtaPovertyLevel from "@/config/rules/wtaPovertyLevel.json";
import { buildPlannerSchedule } from "@/lib/calc/usePlannerSchedule";

const WELCOME_KEY = "ablePlannerWelcomeAcknowledged";

type FilingStatusOption = "single" | "married_joint" | "married_separate" | "head_of_household";

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

const INITIAL_MESSAGES: string[] = ["", "", "", ""];

const SCREEN2_DEFAULT_MESSAGES: string[] = [
  "Please use the input fields on the left to plan for account activity.",
  "We would like to know the time-period you want to plan for, so that we can project and present information for a meaningful time horizon.",
  "The starting balance should either be an existing ABLE account balance or a qualified rollover from another plan.",
  "This tool allows you to plan for monthly recurring contributions and withdrawals. Recurring contributions are assumed to start on the 1st of the following month. You can also select an end month and year for contributions. Recurring withdrawals are assumed to continue until the end of the time horizon selected. You can choose the month and year in which those withdrawals will start.",
  "As you input your information, messages will appear in this window that will help you navigate certain contribution and account balance limits and make suggested changes to your contribution and withdrawal inputs.",
];

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

const computeStateTaxBenefitAmount = (
  benefit: StateTaxBenefitConfig | null,
  contributions: number,
): number => {
  if (!benefit || contributions <= 0) return 0;
  const percent = Math.max(0, benefit.creditPercent ?? 0);
  const cap = Math.max(0, benefit.amount ?? 0);
  const contributionValue = Math.max(0, contributions);

  if (benefit.type === "credit" || (benefit.type === "none" && percent > 0)) {
    const fromPercent = percent > 0 ? contributionValue * percent : 0;
    if (cap > 0 && percent > 0) {
      return Math.min(fromPercent, cap);
    }
    if (percent > 0) {
      return fromPercent;
    }
    if (cap > 0) {
      return cap;
    }
    return 0;
  }

  if (benefit.type === "deduction") {
    if (percent > 0) {
      const fromPercent = contributionValue * percent;
      return cap > 0 ? Math.min(fromPercent, cap) : fromPercent;
    }
    return cap > 0 ? Math.min(contributionValue, cap) : 0;
  }

  return 0;
};


export default function Home() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
const [active, setActive] = useState<NavKey>("inputs");
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

  const screen1DefaultMessages = copy.flows?.screen1?.defaultMessages ?? INITIAL_MESSAGES;
  const screen2DefaultMessages = copy.flows?.screen2?.defaultMessages ?? SCREEN2_DEFAULT_MESSAGES;
  const [screen1Messages, setScreen1Messages] = useState<string[]>(() => [...screen1DefaultMessages]);
  const [screen2Messages, setScreen2Messages] = useState<string[]>(() => [...screen2DefaultMessages]);
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
  const currentClientConfig = getClientConfig(plannerStateCode);
  const planStateOverride = currentClientConfig.planStateCode?.toUpperCase();
  const planStateFallback = /^[A-Z]{2}$/.test(plannerStateCode) ? plannerStateCode.toUpperCase() : undefined;
  const planState = planStateOverride ?? planStateFallback ?? "";
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
  const planInfoMap = planLevelInfo as Record<
    string,
    { name?: string; residencyRequired?: boolean; maxAccountBalance?: number }
  >;
  const planInfoEntry = planInfoMap[planState];
  const planName = planInfoEntry?.name ?? planState;
  const planLabel = `${planName} Able`;
  const planResidencyRequired = Boolean(planInfoEntry?.residencyRequired);
  const planMaxBalance = planInfoMap[planState]?.maxAccountBalance ?? planInfoMap.default?.maxAccountBalance ?? null;
  const monthlyContributionNum =
    Number((monthlyContribution ?? "").replace(".00","")) || 0;
  const annualContributionLimit =
    wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;

  const landingCopy = {
    heroTitle: copy.landing?.heroTitle ?? "",
    heroBody: copy.landing?.heroBody ?? "",
    heroBullets: copy.landing?.heroBullets ?? [],
    disclosuresTitle: copy.landing?.disclosuresTitle ?? "",
    disclosuresIntro: copy.landing?.disclosuresIntro ?? "",
    disclosuresBody: copy.landing?.disclosuresBody ?? "",
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
      client?.constraints?.timeHorizonMax ??
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
  }, [getTimeHorizonLimits, timeHorizonYears]);useEffect(() => {
    if (messagesMode !== "intro") {
      return;
    }
    setScreen1Messages([...screen1DefaultMessages]);
    setScreen2Messages([...screen2DefaultMessages]);
  }, [language, messagesMode, screen1DefaultMessages, screen2DefaultMessages]);useEffect(() => {
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
    setFscStatus("idle");
    setMessagesMode("intro");
    setFscQ({ ...EMPTY_FSC });
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
    if (!wtaDismissed && (wtaMode === "noPath" || wtaMode === "combinedLimit")) {
      return;
    }
    if (
      !wtaDismissed &&
      (wtaMode === "initialPrompt" || wtaMode === "wtaQuestion")
    ) {
      return;
    }
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

    if (wtaStatus === "unknown") {
      // If the current annualized contribution exceeds the base limit, ALWAYS prompt WTA,
      // even if we previously auto-prompted due to a future-year projection.
      if (
        plannedCurrentYear > WTA_BASE_ANNUAL_LIMIT ||
        plannedNextCalendarYear > WTA_BASE_ANNUAL_LIMIT
      ) {
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
        "Base contributions already meet the annual limit; increases are disabled.",
      );
      return;
    }

    setContributionIncreaseHelperText(
      `At ${contributionIncreasePct}%, contributions exceed the annual limit in year ${limitBreachYear}. Contribution increases will stop after year ${
        limitBreachYear - 1
      }.`,
    );
  }, [
    annualContributionLimit,
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
      client?.defaults?.timeHorizon ??
      client?.defaults?.defaultTimeHorizonYears ??
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
      className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
    setTimeHorizonYears("");
    setTimeHorizonEdited(false);
    setContributionEndTouched(false);
    setWithdrawalStartTouched(false);
    setWtaAutoApplied(false);
    setWtaDismissed(false);
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
  }, [monthlyContribution, wtaStatus, wtaCombinedLimit, getHorizonConfig, contributionBreachYear]);

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
    const applySetToMax = (limit: number) => {
      const { currentYearMaxMonthly, futureYearMaxMonthly } = deriveMonthlyCaps(limit);
      setMonthlyContribution(String(currentYearMaxMonthly));
      setMonthlyContributionFuture(String(futureYearMaxMonthly));
    };

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
      setActive("account_growth");
    };

    const questions: Array<{ key: keyof FscAnswers; label: string }> = [
      { key: "hasTaxLiability", label: (copy.labels?.fsc?.taxLiability ?? "")},
      { key: "isOver18", label: (copy.labels?.fsc?.age18 ?? "")},
      { key: "isStudent", label: (copy.labels?.fsc?.student ?? "")},
      { key: "isDependent", label: (copy.labels?.fsc?.dependent ?? "")},
    ];

    const allAnswered = Object.values(fscQ).every((value) => value !== null);

    const evaluateFsc = () => {
      if (!allAnswered) return;
      const eligible =
        fscQ.hasTaxLiability === true &&
        fscQ.isOver18 === true &&
        fscQ.isStudent === false &&
        fscQ.isDependent === false;
      setFscStatus(eligible ? "eligible" : "ineligible");
      setMessagesMode("intro");
    };

    const updateAnswer = (key: keyof FscAnswers, value: boolean) => {
      setFscQ((prev) => ({ ...prev, [key]: value }));
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

    const resolveCombinedLimitWithAutoContribution = () => {
      applySetToMax(wtaCombinedLimit);
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
    };

    const acknowledgeNonResident = () => {
      setNonResidentProceedAck(true);
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
          {planMessages.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/60 dark:text-amber-50">
              <p className="text-sm leading-relaxed">
                
{(copy?.messages?.planMaxReached ?? "")
  .replace("{{month}}", planMessages[0].data.monthLabel)
  
.replace("{{cap}}", formatCurrency(planMessages[0].data.planMax).replace(".00", ""))}

              </p>
            </div>
          )}
          {ssiMessages.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/60 dark:text-amber-50">
              <div className="mb-2 whitespace-pre-line text-sm leading-relaxed">{
              (copy?.messages?.balanceCapWarning ?? "")
  .split("{{cap}}").join("$100,000")
  
.replace("{{breach}}", (ssiMessages[0]?.data?.breachLabel ?? ssiMessages[0]?.data?.monthLabel ?? ""))
  
.replace("{{stop}}", (ssiMessages[0]?.data?.stopLabel ?? planMessages[0]?.data?.monthLabel ?? ""))
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
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              
              {(copy?.messages?.workToAblePrompt ?? "")
  .replace("{{cap}}", "$20,000")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={[
                  buttonBase,
                  "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black",
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
                        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                    ].join(" ")}
                    onClick={() => handleEarnedIncomeAnswer(true)}
                  >{copy?.buttons?.yes ?? ""}</button>
                  <button
                    type="button"
                    className={[
                      buttonBase,
                      wtaHasEarnedIncome === false
                        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
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
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
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
                          ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                          : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                      ].join(" ")}
                      onClick={() => evaluateWtaEligibility(true)}
                    >{copy?.buttons?.yes ?? ""}</button>
                    <button
                      type="button"
                      className={[
                        buttonBase,
                        wtaRetirementPlan === false
                          ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
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

      const overageReference = breachNow ? plannedCurrentYearContribution : plannedAnnualContribution;
      const baseLimitOverage = Math.max(0, overageReference - WTA_BASE_ANNUAL_LIMIT);
      if (wtaStatus === "ineligible" && !wtaDismissed) {
        const baseLimitCaps = deriveMonthlyCaps(WTA_BASE_ANNUAL_LIMIT);
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            {renderAccountEndingBlock()}
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
      if (endingValueInfo.depletionEligible) {
        return (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <p className="text-xs leading-relaxed">
              {(copy?.messages?.ableDepletionNotice ??
                "Based on your assumptions, the ABLE account balance reaches zero in {{reachMonthYear}}. Accordingly, withdrawals are stopped in this planner after {{stopMonthYear}}.")
                .replace("{{reachMonthYear}}", endingValueInfo.reachLabel || "")
                .replace("{{stopMonthYear}}", endingValueInfo.stopLabel || "")}
            </p>
          </div>
        );
      }

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

    if (active === "schedule") {
      if (!hasTimeHorizon) {
        return (
          <div className="space-y-6">
            <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Amortization schedule
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Enter a time horizon to view the schedule.
              </p>
            </div>
          </div>
        );
      }

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
        const federalCredit = showFederalSaverCredit
          ? Math.min(contributionsForYear, fscContributionLimit) * fscCreditPercent
          : 0;
        const stateBenefitAmount = computeStateTaxBenefitAmount(
          stateBenefitConfig,
          contributionsForYear,
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

      return (
        <div className="space-y-6">
          <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Amortization schedule
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={amortizationView === "able"}
                  className={[
                    "rounded-full px-4 py-1 text-xs font-semibold transition",
                    amortizationView === "able"
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "border border-zinc-200 bg-white/50 text-zinc-500 hover:border-slate-400",
                  ].join(" ")}
                  onClick={() => setAmortizationView("able")}
                >
                  ABLE Account
                </button>
                <button
                  type="button"
                  aria-pressed={amortizationView === "taxable"}
                  className={[
                    "flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition",
                    amortizationView === "taxable"
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "border border-zinc-200 bg-white/50 text-zinc-500 hover:border-slate-400",
                  ].join(" ")}
                  onClick={() => setAmortizationView("taxable")}
                >
                  <span>Taxable Account</span>
                </button>
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

    if (active !== "inputs") {
      const screenLabel =
        active === "account_growth"
          ? "Account Growth"
          : active === "tax_benefits"
            ? "Tax Benefits"
            : active === "schedule"
              ? "Schedule"
              : active === "disclosures"
                ? (copy?.labels?.disclosures ?? "")
                : active.toUpperCase();
      return (
        <div className="space-y-6">
          <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
            <h1 className="text-lg font-semibold uppercase text-zinc-900 dark:text-zinc-50">
              {screenLabel} (Shell)
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Placeholder content is coming soon.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="mb-6 flex items-center justify-between text-xs font-semibold">
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
          <div className="flex-1">
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
              <div className="h-full rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
                {inputStep === 1 ? (
                  <>
                    {annualReturnWarningText ? (
                      <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                        {annualReturnWarningText}
                      </div>
                    ) : null}
                    {showResidencyWarning ? (
                      renderResidencyWarning()
                    ) : showQuestionnaire ? (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{copy?.labels?.inputs?.fscEligibilityTitle ?? ""}</h2>
                          <p className="text-xs text-zinc-500">
                            {copy?.labels?.fscIntro ?? ""}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {questions.map((question) => {
                            const answer = fscQ[question.key];
                            return (
                              <div key={question.key} className="space-y-2">
                                <p className="text-xs font-semibold text-zinc-500">{question.label}</p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className={[
                                      "flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition",
                                      answer === true
                                        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                                    ].join(" ")}
                                    onClick={() => updateAnswer(question.key, true)}
                                  >{copy?.buttons?.yes ?? ""}</button>
                                  <button
                                    type="button"
                                    className={[
                                      "flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition",
                                      answer === false
                                        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                                    ].join(" ")}
                                    onClick={() => updateAnswer(question.key, false)}
                                  >{copy?.buttons?.no ?? ""}</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div>
                          <button
                            type="button"
                            disabled={!allAnswered}
                            className={[
                              "w-full rounded-full px-4 py-2 text-xs font-semibold transition",
                              allAnswered
                                ? "bg-[var(--brand-primary)] text-white"
                                : "border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed",
                            ].join(" ")}
                            onClick={evaluateFsc}
                          >{copy?.buttons?.evaluate ?? ""}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
                        {screen1Messages.map((message, index) => (
                          <p
                            key={`${message}-${index}`}
                            className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                          >
                            {message}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
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
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
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

        <main className="mx-auto w-full max-w-6xl px-4 pt-6">
          <div className="flex justify-center">{languageToggle}</div>
          <div className="mt-6" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold">
              {landingCopy.heroTitle}
            </h1>

            <p className="mt-4 max-w-6xl mx-auto text-left text-base text-zinc-600 dark:text-zinc-400">
              {landingCopy.heroBody}
            </p>

            {landingCopy.heroBullets.length > 0 && (
              <ul className="mt-4 flex flex-col items-center gap-2 text-base text-zinc-600 dark:text-zinc-400">
                {landingCopy.heroBullets.map((bullet, index) => (
                  <li
                    key={`hero-bullet-${index}`}
                    className="w-full max-w-xl list-disc pl-5 text-left"
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <TopNav
        title={copy.app?.title ?? ""}
        tagline={copy.app?.tagline}
        rightSlot={
          <div className="flex items-center gap-2">
            {planSelector}
          </div>
        }
      />
      <div className="mx-auto flex w-full max-w-6xl">
        <Sidebar active={active} onChange={setActive} labels={copy.ui?.sidebar} />
        <main className="mx-auto w-full max-w-6xl px-4 pt-6">{content}</main>
      </div>
    </div>
  );
}
