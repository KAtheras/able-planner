"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import SettingsMenu from "@/components/layout/SettingsMenu";
import TopNav from "@/components/layout/TopNav";
import { getCopy, type SupportedLanguage } from "@/copy";
import defaultClient from "@/config/clients/default.json";
import utClient from "@/config/clients/ut.json";
import ilClient from "@/config/clients/il.json";
import txClient from "@/config/clients/tx.json";

const WELCOME_KEY = "ablePlannerWelcomeAcknowledged";
type PlannerState = "default" | "UT" | "IL" | "TX";
const CLIENTS: Record<PlannerState, { brand?: Record<string, string> }> = {
  default: defaultClient,
  UT: utClient,
  IL: ilClient,
  TX: txClient,
};

export default function Home() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [active, setActive] = useState<NavKey>("inputs");
  const [plannerStateCode, setPlannerStateCode] = useState<PlannerState>("default");
  const [plannerAgi, setPlannerAgi] = useState("");
  const [plannerFilingStatus, setPlannerFilingStatus] = useState<
    "single" | "married_joint" | "married_separate" | "head_of_household"
  >("single");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<unknown | null>(null);
  const [acknowledgedWelcome, setAcknowledgedWelcome] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(WELCOME_KEY) !== "true";
  });
  const copy = getCopy(language);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("language");
    if (storedLanguage === "en" || storedLanguage === "es") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    const client = CLIENTS[plannerStateCode] ?? defaultClient;
    const brand = client.brand;
    if (!brand) return;

    const root = document.documentElement.style;
    root.setProperty("--brand-primary", brand.primary);
    root.setProperty("--brand-primary-hover", brand.primaryHover);
    root.setProperty("--brand-on-primary", brand.onPrimary);
    root.setProperty("--brand-ring", brand.ring);
  }, [plannerStateCode]);

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
      onChange={(event) =>
        setPlannerStateCode(event.target.value as PlannerState)
      }
      className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <option value="default">Default</option>
      <option value="UT">UT</option>
      <option value="IL">IL</option>
      <option value="TX">TX</option>
    </select>
  );

  const content = useMemo(() => {
    if (active !== "inputs") {
      return (
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {active.toUpperCase()} (Shell)
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">Coming soon.</p>
        </section>
      );
    }

    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Inputs (Shell)
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Next: Step inputs live in <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">src/components/inputs/</code>
        </p>
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            This area will become the main input flow. (We’re only doing Layout A now.)
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                AGI
              </label>
              <input
                type="number"
                value={plannerAgi}
                onChange={(event) => setPlannerAgi(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Filing status
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={plannerFilingStatus}
                onChange={(event) =>
                  setPlannerFilingStatus(
                    event.target.value as
                      | "single"
                      | "married_joint"
                      | "married_separate"
                      | "head_of_household",
                  )
                }
              >
                <option value="single">single</option>
                <option value="married_joint">married_joint</option>
                <option value="married_separate">married_separate</option>
                <option value="head_of_household">head_of_household</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={runCalculation}
                className="rounded-full bg-[var(--brand-primary)] px-4 py-1 text-xs font-semibold text-white"
              >
                Run
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {active.toUpperCase()} active
              </span>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
              {calcLoading ? (
                <p>Loading calculation…</p>
              ) : calcError ? (
                <p className="text-rose-500">{calcError}</p>
              ) : calcResult ? (
                <pre className="text-[11px]">{JSON.stringify(calcResult, null, 2)}</pre>
              ) : (
                <p>No results yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }, [active, calcError, calcLoading, calcResult, plannerAgi, plannerFilingStatus, plannerStateCode, runCalculation]);

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