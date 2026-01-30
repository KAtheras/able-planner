"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import SettingsMenu from "@/components/layout/SettingsMenu";
import TopNav from "@/components/layout/TopNav";
import { getCopy, type SupportedLanguage } from "@/copy";
import { getClientConfig } from "@/config/clients";
import AccountActivityForm from "@/components/inputs/AccountActivityForm";
import DemographicsForm from "@/components/inputs/DemographicsForm";
import federalSaversCreditBrackets from "@/config/rules/federalSaversCreditBrackets.json";

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
  const [timeHorizonEdited, setTimeHorizonEdited] = useState(false);
  const [screen1Messages, setScreen1Messages] = useState<string[]>(() => [...INITIAL_MESSAGES]);
  const [screen2Messages, setScreen2Messages] = useState<string[]>(() => [...SCREEN2_DEFAULT_MESSAGES]);
  const [isSsiEligible, setIsSsiEligible] = useState(false);
  const [startingBalance, setStartingBalance] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [contributionEndYear, setContributionEndYear] = useState("");
  const [contributionEndMonth, setContributionEndMonth] = useState("");
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState("");
  const [withdrawalStartYear, setWithdrawalStartYear] = useState("");
  const [withdrawalStartMonth, setWithdrawalStartMonth] = useState("");
  const [contributionEndTouched, setContributionEndTouched] = useState(false);
  const [withdrawalStartTouched, setWithdrawalStartTouched] = useState(false);
  const setContributionEndFromIndex = (index: number) => {
    const { year, month } = monthIndexToParts(index);
    setContributionEndYear(String(year));
    setContributionEndMonth(String(month));
  };
  const setWithdrawalStartFromIndex = (index: number) => {
    const { year, month } = monthIndexToParts(index);
    setWithdrawalStartYear(String(year));
    setWithdrawalStartMonth(String(month));
  };
  const [fscStatus, setFscStatus] = useState<"idle" | "eligible" | "ineligible">("idle");
  const [fscQ, setFscQ] = useState<FscAnswers>(() => ({ ...EMPTY_FSC }));
  const [messagesMode, setMessagesMode] = useState<"intro" | "fsc">("intro");
  const [agiGateEligible, setAgiGateEligible] = useState<boolean | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<unknown | null>(null);
  const [acknowledgedWelcome, setAcknowledgedWelcome] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const copy = getCopy(language);

  const sanitizeAgiInput = (value: string) => {
    if (value === "") return "";
    let next = value.replace(/-/g, "");
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

const MONTH_OPTIONS = [
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

  const getHorizonConfig = () => {
    const client = getClientConfig(plannerStateCode);
    const minYears = client?.constraints?.timeHorizonYearsHardMin ?? 1;
    const maxYears = client?.constraints?.timeHorizonYearsHardMax ?? 75;
    const parsed = parseIntegerInput(timeHorizonYears);
    const safeYears = clampNumber(parsed ?? minYears, minYears, maxYears);
    const startIndex = getStartMonthIndex();
    const horizonEndIndex = startIndex + safeYears * 12 - 1;
    return {
      minYears,
      maxYears,
      safeYears,
      startIndex,
      horizonEndIndex: Math.max(startIndex, horizonEndIndex),
    };
  };

  const getTimeHorizonLimits = () => {
    const client = getClientConfig(plannerStateCode);
    return {
      minYears: client?.constraints?.timeHorizonYearsHardMin ?? 1,
      maxYears: client?.constraints?.timeHorizonYearsHardMax ?? 75,
    };
  };

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

  useEffect(() => {
    const client = getClientConfig(plannerStateCode);
    const defaultYears = client?.defaults?.timeHorizonYears;
    const minYears = client?.constraints?.timeHorizonYearsHardMin ?? 1;
    const maxYears = client?.constraints?.timeHorizonYearsHardMax ?? 75;

    if (timeHorizonEdited) return;

    const base = typeof defaultYears === "number" && Number.isFinite(defaultYears)
      ? defaultYears
      : minYears;
    const clampedDefault = clampNumber(base, minYears, maxYears);
    setTimeHorizonYears(String(clampedDefault));
  }, [plannerStateCode, timeHorizonEdited]);

  useEffect(() => {
    const { startIndex, horizonEndIndex } = getHorizonConfig();
    const minIndex = startIndex;
    const maxIndex = Math.max(startIndex, horizonEndIndex);

    const contributionIndex = parseMonthYearToIndex(contributionEndYear, contributionEndMonth);
    if (!contributionEndTouched || contributionIndex === null) {
      setContributionEndFromIndex(maxIndex);
    } else {
      const clamped = clampNumber(contributionIndex, minIndex, maxIndex);
      if (clamped !== contributionIndex) {
        setContributionEndFromIndex(clamped);
      }
    }

    const withdrawalIndex = parseMonthYearToIndex(withdrawalStartYear, withdrawalStartMonth);
    if (!withdrawalStartTouched || withdrawalIndex === null) {
      setWithdrawalStartFromIndex(minIndex);
    } else {
      const clamped = clampNumber(withdrawalIndex, minIndex, maxIndex);
      if (clamped !== withdrawalIndex) {
        setWithdrawalStartFromIndex(clamped);
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
  ]);

  useEffect(() => {
  const client = getClientConfig(plannerStateCode);
  const brand = client.brand;
  if (!brand) return;

  const root = document.documentElement.style;
  root.setProperty("--brand-primary", brand.primary);
  root.setProperty("--brand-primary-hover", brand.primaryHover);
  root.setProperty("--brand-on-primary", brand.onPrimary);
    root.setProperty("--brand-ring", brand.ring);
  }, [plannerStateCode]);

  useEffect(() => {
    if (!beneficiaryStateOfResidence && plannerStateCode !== "default") {
      setBeneficiaryStateOfResidence(plannerStateCode);
    }
  }, [plannerStateCode, beneficiaryStateOfResidence]);

  const handleWelcomeContinue = () => {
    sessionStorage.setItem(WELCOME_KEY, "true");
    setShowWelcome(false);
    setActive("inputs");
  };

  const runCalculation = useCallback(async () => {
    setCalcLoading(true);
    setCalcError(null);
    setCalcResult(null);

    const payload = {
      stateCode: plannerStateCode === "default" ? undefined : plannerStateCode,
      agi: plannerAgi === "" ? undefined : Number(plannerAgi),
      filingStatus: plannerFilingStatus,
    };

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

      setCalcResult(await response.json());
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Unable to run calculation");
    } finally {
      setCalcLoading(false);
    }
  }, [plannerStateCode, plannerAgi, plannerFilingStatus]);

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
    setFscStatus("idle");
    setFscQ({ ...EMPTY_FSC });
    setMessagesMode("intro");
    setAgiGateEligible(null);
    setScreen1Messages([...INITIAL_MESSAGES]);
    setScreen2Messages([...SCREEN2_DEFAULT_MESSAGES]);
    setTimeHorizonYears("");
    setTimeHorizonEdited(false);
    setContributionEndTouched(false);
    setWithdrawalStartTouched(false);
  }, []);

  const content = useMemo(() => {
    const agiValue = Number(plannerAgi);
    const agiValid =
      plannerAgi !== "" && !Number.isNaN(agiValue) && (agiValue > 0 || agiValue === 0);
    const isNextDisabled = inputStep === 1 && !agiValid;

    const goToNextStep = () => {
      if (inputStep === 1 && !agiValid) {
        return;
      }
      if (inputStep === 1) {
        setInputStep(2);
        return;
      }
      setActive("reports");
    };

    const toggleLanguage = () => {
      setLanguage((prev) => (prev === "en" ? "es" : "en"));
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
              className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              onClick={resetInputs}
            >
              Refresh
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              onClick={toggleLanguage}
            >
              {language.toUpperCase()}
            </button>
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
              monthOptions={MONTH_OPTIONS}
              contributionYearOptions={horizonYearOptions}
              withdrawalYearOptions={horizonYearOptions}
              onChange={(updates) => {
                const limits = getTimeHorizonLimits();
                if ("timeHorizonYears" in updates) {
                  setTimeHorizonEdited(true);
                  const raw = (updates.timeHorizonYears ?? "").replace(/\D/g, "");
                  if (raw === "") {
                    setTimeHorizonYears("");
                  } else {
                    const numeric = Number(raw);
                    if (!Number.isNaN(numeric)) {
                      const clamped = clampNumber(Math.round(numeric), limits.minYears, limits.maxYears);
                      setTimeHorizonYears(String(clamped));
                    }
                  }
                }
                if ("startingBalance" in updates)
                  setStartingBalance(sanitizeAmountInput(updates.startingBalance ?? ""));
                if ("monthlyContribution" in updates)
                  setMonthlyContribution(sanitizeAmountInput(updates.monthlyContribution ?? ""));
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
              }}
              onAdvancedClick={() => {
                /* placeholder */
              }}
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
                    {showQuestionnaire ? (
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
                  <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
                    {screen2Messages.map((message, index) => (
                      <p
                        key={`${message}-${index}`}
                        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    active,
    agiGateEligible,
    annualReturn,
    annualReturnWarning,
    annualReturnEdited,
    beneficiaryName,
    beneficiaryStateOfResidence,
    calcError,
    calcLoading,
    calcResult,
    contributionEndMonth,
    contributionEndYear,
    fscQ,
    fscStatus,
    inputStep,
    isSsiEligible,
    language,
    messagesMode,
    monthlyContribution,
    monthlyWithdrawal,
    plannerAgi,
    plannerFilingStatus,
    plannerStateCode,
    resetInputs,
    runCalculation,
    startingBalance,
    timeHorizonEdited,
    timeHorizonYears,
    withdrawalStartMonth,
    withdrawalStartYear,
    contributionEndTouched,
    withdrawalStartTouched,
    screen1Messages,
    screen2Messages,
  ]);

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
