"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import SettingsMenu from "@/components/layout/SettingsMenu";
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
import { usePlannerSchedule } from "@/lib/calc/usePlannerSchedule";

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

const INITIAL_MESSAGES: string[] = [
  "Welcome to our interactive ABLE planning tool. Start by providing basic demographic information on the left input screen. You will be able to navigate to any of the input screens to edit all this information.",
  "Your state of residence is used to determine plan eligibility as well as to calculate certain state tax benefits.",
  "Similarly, your tax filing status and Adjusted Gross Income (AGI) will help us determine and project federal and, where applicable, state tax benefits of investing in an ABLE account. Remember that your AGI is not the same as your salary. It may be more than your earned income due to other sources of income. Conversely, for most taxpayers, it often is less than your earned income due to deductions or exemptions. You can find your AGI in your most recent tax return if you filed one. If you are not sure what your current AGI is, simply put your salary and wages.",
  "Finally, we proposed a default investment return assumption. Feel free to change the investment return assumption to try out different scenarios.",
];

const SCREEN2_DEFAULT_MESSAGES: string[] = [
  "Please use the input fields on the left to plan for account activity.",
  "We would like to know the time-period you want to plan for, so that we can project and present information for a meaningful time horizon.",
  "The starting balance should either be an existing ABLE account balance or a qualified rollover from another plan.",
  "This tool allows you to plan for monthly recurring contributions and withdrawals. Recurring contributions are assumed to start on the 1st of the following month. You can also select an end month and year for contributions. Recurring withdrawals are assumed to continue until the end of the time horizon selected. You can choose the month and year in which those withdrawals will start.",
  "As you input your information, messages will appear in this window that will help you navigate certain contribution and account balance limits and make suggested changes to your contribution and withdrawal inputs.",
];

const WTA_BASE_ANNUAL_LIMIT = 20000;
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
  const [annualReturnWarning, setAnnualReturnWarning] = useState<string | null>(null);
  const [timeHorizonYears, setTimeHorizonYears] = useState("");
  const [screen1Messages, setScreen1Messages] = useState<string[]>(() => [...INITIAL_MESSAGES]);
  const [screen2Messages, setScreen2Messages] = useState<string[]>(() => [...SCREEN2_DEFAULT_MESSAGES]);
  const [nonResidentProceedAck, setNonResidentProceedAck] = useState(false);
  const [isSsiEligible, setIsSsiEligible] = useState(false);
  const [startingBalance, setStartingBalance] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
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
  const [showWelcome, setShowWelcome] = useState(true);
  const copy = getCopy(language);
  const currentClientConfig = getClientConfig(plannerStateCode);
  const planStateOverride = currentClientConfig.planStateCode?.toUpperCase();
  const planStateFallback = /^[A-Z]{2}$/.test(plannerStateCode) ? plannerStateCode.toUpperCase() : undefined;
  const planState = planStateOverride ?? planStateFallback ?? "UT";
  const planInfoEntry = (planLevelInfo as Record<string, { name?: string; residencyRequired?: boolean }>)[planState];
  const planName = planInfoEntry?.name ?? planState;
  const planLabel = `${planName} Able`;
  const planResidencyRequired = Boolean(planInfoEntry?.residencyRequired);
  const monthlyContributionNum =
    Number((monthlyContribution ?? "").replace(/[^0-9.]/g, "")) || 0;
  const annualContributionLimit =
    wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;

  const sanitizeAgiInput = (value: string) => {
    if (value === "") return "";
    const next = value.replace(/-/g, "");
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

  const formatDecimalToPercentString = (decimal: number): string => {
    const percent = Math.round(decimal * 10000) / 100;
  return String(percent);
};

  const clampNumber = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const sanitizeAmountInput = (value: string) => {
    if (value === "") return "";
    const clean = value.replace(/-/g, "");
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
  }, [getTimeHorizonLimits, timeHorizonYears]);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("language");
    if (storedLanguage === "en" || storedLanguage === "es") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    setShowWelcome(sessionStorage.getItem(WELCOME_KEY) !== "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("language", language);
  }, [language]);

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
    setAnnualReturnWarning(null);
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
  }, []);

  useEffect(() => {
    const numeric = monthlyContribution === "" ? 0 : Number(monthlyContribution);
    const plannedAnnual = Number.isFinite(numeric) ? numeric * 12 : 0;

    if (wtaStatus === "unknown") {
      if (wtaAutoPromptedForIncrease) {
        return;
      }
      setWtaMode(plannedAnnual > WTA_BASE_ANNUAL_LIMIT ? "initialPrompt" : "idle");
      return;
    }

    if (wtaStatus === "eligible") {
      setWtaMode(
        plannedAnnual > wtaCombinedLimit ? "combinedLimit" : "idle",
      );
      return;
    }

    setWtaMode(plannedAnnual > WTA_BASE_ANNUAL_LIMIT ? "noPath" : "idle");
  }, [monthlyContribution, wtaCombinedLimit, wtaStatus, wtaAutoPromptedForIncrease]);

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
    const maxYearsToCheck =
      Number.isFinite(horizonInput) && horizonInput > 0 ? Math.floor(horizonInput) : 75;

    const computeBreachYear = (limit: number): number | null => {
      if (baseAnnual >= limit) {
        return 0;
      }
      for (let year = 1; year <= maxYearsToCheck; year += 1) {
        const projectedAnnual = baseAnnual * Math.pow(1 + pctDecimal, year);
        if (projectedAnnual > limit) {
          return year;
        }
      }
      return null;
    };

    const baseBreachYear = computeBreachYear(WTA_BASE_ANNUAL_LIMIT);
    const projectionBreachesBaseLimit = baseBreachYear !== null && baseBreachYear > 0;

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
      setContributionEndMonth(String(month));
    };

    const setWithdrawalFromIndex = (index: number) => {
      const { year, month } = monthIndexToParts(index);
      setWithdrawalStartYear(String(year));
      setWithdrawalStartMonth(String(month));
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

  const resetInputs = useCallback(() => {
    setInputStep(1);
    setBeneficiaryName("");
    setBeneficiaryStateOfResidence("");
    setPlannerFilingStatus("single");
    setPlannerAgi("");
    setAnnualReturn("");
    setAnnualReturnEdited(false);
    setIsSsiEligible(false);
    setStartingBalance("");
    setMonthlyContribution("");
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
    setScreen1Messages([...INITIAL_MESSAGES]);
    setContributionIncreasePct("");
    setWithdrawalIncreasePct("");
    setContributionIncreaseHelperText(undefined);
    setContributionBreachYear(null);
    setStopContributionIncreasesAfterYear(null);
    setWtaAutoPromptedForIncrease(false);
    setScreen2Messages([...SCREEN2_DEFAULT_MESSAGES]);
    setTimeHorizonYears("");
    setContributionEndTouched(false);
    setWithdrawalStartTouched(false);
  }, [resetWtaFlow]);

  const contributionIncreaseDisabled = contributionBreachYear === 0;

  const content = (() => {
    const agiValue = Number(plannerAgi);
    const agiValid =
      plannerAgi !== "" && !Number.isNaN(agiValue) && (agiValue > 0 || agiValue === 0);

    const monthlyContributionNumber = monthlyContribution === "" ? 0 : Number(monthlyContribution);
    const plannedAnnualContribution = Number.isFinite(monthlyContributionNumber)
      ? monthlyContributionNumber * 12
      : 0;
    const allowedAnnualLimit =
      wtaStatus === "eligible" ? wtaCombinedLimit : WTA_BASE_ANNUAL_LIMIT;
    const hasContributionIssue =
      inputStep === 2 && plannedAnnualContribution > allowedAnnualLimit;
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

    const horizonLimits = getTimeHorizonLimits();
    const monthOptions = [
      { value: "1", label: "Jan" },
      { value: "2", label: "Feb" },
      { value: "3", label: "Mar" },
      { value: "4", label: "Apr" },
      { value: "5", label: "May" },
      { value: "6", label: "Jun" },
      { value: "7", label: "Jul" },
      { value: "8", label: "Aug" },
      { value: "9", label: "Sep" },
      { value: "10", label: "Oct" },
      { value: "11", label: "Nov" },
      { value: "12", label: "Dec" },
    ];
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
      { key: "hasTaxLiability", label: "Do you have federal income tax liability?" },
      { key: "isOver18", label: "Are you age 18 or older?" },
      { key: "isStudent", label: "Are you a full-time student?" },
      { key: "isDependent", label: "Can someone claim you as a dependent?" },
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
      if (agiGateEligible === null) return "Enter AGI to test eligibility";
      if (agiGateEligible === false) return "Not eligible based on AGI";
      if (fscStatus === "eligible") return "Eligible — Retest";
      if (fscStatus === "ineligible") return "Not eligible — Retest";
      return "Eligible to evaluate";
    };

    const horizonConfig = getHorizonConfig();

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

    const resolveBaseLimitWithAutoContribution = () => {
      const monthly = Math.floor(WTA_BASE_ANNUAL_LIMIT / 12);
      setMonthlyContribution(String(monthly));
    };

    const resolveCombinedLimitWithAutoContribution = () => {
      const monthly = Math.floor(wtaCombinedLimit / 12);
      setMonthlyContribution(String(monthly));
    };

    const handleOverLimitNo = () => {
      setWtaMode("noPath");
      setWtaHasEarnedIncome(false);
      setWtaRetirementPlan(null);
      setWtaAdditionalAllowed(0);
      setWtaCombinedLimit(WTA_BASE_ANNUAL_LIMIT);
      setWtaStatus("ineligible");
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
              The beneficiary is not eligible to open a {planLabel} account because the {planLabel} plan requires the beneficiary
              to be a resident of {planName}. You should check to see if your home state offers an Able plan,
              which may provide certain state tax benefits.
            </p>
            <div className={buttonContainerClass}>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={changeResidencyToPlan}
              >
                CHANGE MY RESIDENCY AND PROCEED TO THE CALCULATOR
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            You should check to see if your home state offers an Able plan, which may provide certain state tax benefits.
          </p>
          <div className={buttonContainerClass}>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={acknowledgeNonResident}
            >
              I UNDERSTAND AND WOULD LIKE TO PROCEED
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={changeResidencyToPlan}
            >
              CHANGE MY RESIDENCY AND PROCEED TO THE CALCULATOR
            </button>
          </div>
        </div>
      );
    };

    const renderScreen2Messages = () => {
      const stopMsg =
        ssiMessages.find((message) => message.code === "SSI_CONTRIBUTIONS_STOPPED") ?? null;
      const forcedMsg =
        ssiMessages.find((message) => message.code === "SSI_FORCED_WITHDRAWALS_APPLIED") ?? null;
      const exceedLabel =
        forcedMsg?.data?.monthLabel ||
        stopMsg?.data?.monthLabel ||
        "Month Unknown";
      const stopLabel =
        stopMsg?.data?.monthLabel ||
        forcedMsg?.data?.monthLabel ||
        exceedLabel;

      return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
          {ssiMessages.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/60 dark:text-amber-50">
              <p className="mb-2 text-sm leading-relaxed">
                Based on your planned contributions, withdrawals and earnings assumptions the account is projected
                to exceed $100,000.00 in {exceedLabel}.
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                This may result in suspension of SSI benefits and have an adverse financial impact.
              </p>
              <p className="text-sm leading-relaxed">
                Accordingly, in this planning tool, contributions are stopped in {stopLabel}. Recurring withdrawals
                are also initiated to keep the balance at $100,000.00 by withdrawing the projected monthly earnings.
              </p>
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
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Your planned contributions exceed the annual ABLE limit of $20,000.00. If you are working, you may qualify to contribute more (the “work to ABLE” provision). Would you like to find out if you qualify?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={[
                  buttonBase,
                  "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black",
                ].join(" ")}
                onClick={promptlyStartWta}
              >
                Yes
              </button>
              <button
                type="button"
                className={[
                  buttonBase,
                  "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                ].join(" ")}
                onClick={handleOverLimitNo}
              >
                No
              </button>
            </div>
          </div>
        );
      }

      if (wtaMode === "wtaQuestion") {
        const earnedIncomeValue = Number(wtaEarnedIncome);
        const showStep3 = earnedIncomeValue > 0;
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Does the Beneficiary have Earned Income?
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
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={[
                      buttonBase,
                      wtaHasEarnedIncome === false
                        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                    ].join(" ")}
                    onClick={() => handleEarnedIncomeAnswer(false)}
                  >
                    No
                  </button>
                </div>
              </div>
              {wtaHasEarnedIncome === true && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Please input estimated earned income:
                  </label>
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
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Is the beneficiary covered by a retirement plan?
                  </label>
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
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={[
                        buttonBase,
                        wtaRetirementPlan === false
                          ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                          : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                      ].join(" ")}
                      onClick={() => evaluateWtaEligibility(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (plannedAnnualContribution <= WTA_BASE_ANNUAL_LIMIT) {
        return renderScreen2Messages();
      }

      const baseLimitOverage = Math.max(0, plannedAnnualContribution - WTA_BASE_ANNUAL_LIMIT);
      if (wtaStatus === "ineligible") {
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              You are not eligible for additional ABLE contributions under the Work-to-ABLE provision. Please revise your contribution amounts to stay within the annual limit of $20,000.00.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              AMOUNT OVER THE ANNUAL LIMIT:
            </p>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(baseLimitOverage)}
            </p>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Would you like to set contributions to the maximum allowed amount?
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              We&apos;ll reduce the recurring contribution to keep a rolling 12-month total within the limit.
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
              onClick={resolveBaseLimitWithAutoContribution}
            >
              Yes
            </button>
          </div>
        );
      }

      if (wtaStatus === "eligible") {
        const combinedLimitOverage = Math.max(0, plannedAnnualContribution - wtaCombinedLimit);
        if (combinedLimitOverage <= 0) {
          return renderScreen2Messages();
        }
        return (
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              You qualify for additional contributions of {formatCurrency(wtaAdditionalAllowed)}, but your total contributions exceed the combined limit of {formatCurrency(
                wtaCombinedLimit,
              )}.
            </p>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Please revise your contribution amounts to bring total contributions below the combined limit.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              AMOUNT OVER THE COMBINED LIMIT:
            </p>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(combinedLimitOverage)}
            </p>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Would you like to set contributions to the maximum allowed amount?
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              We&apos;ll reduce the recurring contribution to keep a rolling 12-month total within the limit.
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
              onClick={resolveCombinedLimitWithAutoContribution}
            >
              Yes
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

    const { scheduleRows, ssiMessages } = usePlannerSchedule({
      startMonthIndex: startIndex,
      totalMonths,
      horizonEndIndex,
      startingBalance: startingBalanceValue,
      monthlyContribution: monthlyContributionValue,
      monthlyWithdrawal: monthlyWithdrawalValue,
      contributionIncreasePct: Number.isFinite(contributionIncreaseValue)
        ? Math.max(0, contributionIncreaseValue)
        : 0,
      withdrawalIncreasePct: Number.isFinite(withdrawalIncreaseValue)
        ? Math.max(0, withdrawalIncreaseValue)
        : 0,
      contributionEndIndex: contributionEndIndexValue,
      withdrawalStartIndex: withdrawalStartIndexValue,
      annualReturnDecimal: parsePercentStringToDecimal(annualReturn) ?? 0,
      isSsiEligible,
      enabled: hasTimeHorizon,
    });

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
      const stateBenefitConfig = getStateTaxBenefitConfig(planState, plannerFilingStatus);
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
                  className="rounded-full bg-[var(--brand-primary)] px-4 py-1 text-xs font-semibold text-[var(--brand-on-primary)] shadow-sm"
                >
                  ABLE Account
                </button>
                <button
                  type="button"
                  aria-disabled="true"
                  disabled
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-4 py-1 text-xs font-semibold text-zinc-500 opacity-50 cursor-not-allowed pointer-events-none"
                >
                  <span>Taxable Account</span>
                  <span className="text-[10px] font-normal uppercase tracking-wide text-zinc-400">
                    Coming soon
                  </span>
                </button>
              </div>
            </div>
              <div className="mt-4">
                <AmortizationScheduleTable rows={scheduleRowsWithBenefits} />
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
                ? "Disclosures"
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
                Back
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
              Next
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              onClick={resetInputs}
            >
              Refresh
            </button>
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
                      setAnnualReturnWarning(null);
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
                          setAnnualReturnWarning(
                            `That return assumption is unusually high. Consider ≤ ${formatDecimalToPercentString(
                              warningMax,
                            )}%.`,
                          );
                        } else {
                          setAnnualReturnWarning(null);
                        }
                      } else {
                        setAnnualReturnWarning(null);
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
              contributionIncreaseDisabled={contributionIncreaseDisabled}
              contributionIncreaseHelperText={contributionIncreaseHelperText}
              contributionIncreasePct={contributionIncreasePct}
              withdrawalIncreasePct={withdrawalIncreasePct}
              contributionIncreaseStopYear={stopContributionIncreasesAfterYear}
              monthOptions={monthOptions}
              contributionYearOptions={horizonYearOptions}
              withdrawalYearOptions={horizonYearOptions}
              onChange={(updates) => {
                if ("timeHorizonYears" in updates) {
                  const raw = (updates.timeHorizonYears ?? "").replace(/\D/g, "");
                  setTimeHorizonYears(raw);
                }
                if ("startingBalance" in updates)
                  setStartingBalance(sanitizeAmountInput(updates.startingBalance ?? ""));
                if ("monthlyContribution" in updates) {
                  setMonthlyContribution(sanitizeAmountInput(updates.monthlyContribution ?? ""));
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
              timeHorizonLabel={`Time Horizon (MAX ${horizonLimits.maxYears} YEARS)`}
            />
            )}
          </div>
          <div className="flex-1">
            <div className="h-full">
              <div className="h-full rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
                {inputStep === 1 ? (
                  <>
                    {annualReturnWarning ? (
                      <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                        {annualReturnWarning}
                      </div>
                    ) : null}
                    {showResidencyWarning ? (
                      renderResidencyWarning()
                    ) : showQuestionnaire ? (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                            Federal Saver’s Credit Eligibility
                          </h2>
                          <p className="text-xs text-zinc-500">
                            Answer these questions to estimate eligibility.
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
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    className={[
                                      "flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition",
                                      answer === false
                                        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-black"
                                        : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200",
                                    ].join(" ")}
                                    onClick={() => updateAnswer(question.key, false)}
                                  >
                                    No
                                  </button>
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
                          >
                            Evaluate
                          </button>
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
          title={copy.app?.title ?? "ABLE Planner"}
          tagline={copy.app?.tagline}
          rightSlot={
            <div className="flex items-center gap-2">
              {planSelector}
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                WELCOME
              </span>
            </div>
          }
          settingsSlot={<SettingsMenu language={language} setLanguage={setLanguage} />}
        />

        <main className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-6xl items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Welcome to ABLE Planner</h1>

            <p className="mt-4 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              Please review the disclaimer before entering the planner. This tool
              is for planning purposes only and is not investment, tax, or legal
              advice.
            </p>

            <button
              type="button"
              onClick={handleWelcomeContinue}
              className="mt-6 rounded-full bg-[var(--brand-primary)] px-6 py-2 text-xs font-semibold text-white"
            >
              I Understand — Continue
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <TopNav
        title={copy.app?.title ?? "ABLE Planner"}
        tagline={copy.app?.tagline}
        rightSlot={
          <div className="flex items-center gap-2">
            {planSelector}
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
              {active.toUpperCase()}
            </span>
          </div>
        }
        settingsSlot={<SettingsMenu language={language} setLanguage={setLanguage} />}
      />
      <div className="mx-auto flex w-full max-w-6xl">
        <Sidebar active={active} onChange={setActive} />
        <main className="w-full px-6 py-8">{content}</main>
      </div>
    </div>
  );
}
