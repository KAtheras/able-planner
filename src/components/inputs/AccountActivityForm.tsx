"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type AccountActivityCopy = {
  title?: string;
  labels?: {
    accountActivityTitle?: string;
    timeHorizonYearsFallback?: string;
    timeHorizonCallout?: string;
    startingBalanceLabel?: string;
    startingBalanceCallout?: string;
    monthlyContributionLabel?: string;
    monthlyContributionCallout?: string;
    monthlyWithdrawalLabel?: string;
    monthlyWithdrawalCallout?: string;
    contributionEndLabel?: string;
    contributionEndCallout?: string;
    withdrawalStartLabel?: string;
    withdrawalStartCallout?: string;
    contributionIncreaseLabel?: string;
    contributionIncreaseCallout?: string;
    withdrawalIncreaseLabel?: string;
    withdrawalIncreaseCallout?: string;
    monthPlaceholder?: string;
    yearPlaceholder?: string;
  };
};

type AccountActivityFormProps = {
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
  monthOptions: Option[];
  contributionMonthOptions?: Option[];
  contributionYearOptions: string[];
  withdrawalYearOptions: string[];
  onChange?: (updates: Partial<AccountActivityFormProps>) => void;
  onAdvancedClick?: () => void;
  advancedButtonLabel?: string;
  onTimeHorizonBlur?: () => void;
  timeHorizonLabel?: string;
  contributionIncreaseDisabled?: boolean;
  contributionIncreaseHelperText?: string;
  contributionIncreaseStopYear?: number | null;
  copy?: AccountActivityCopy;
};

const sanitizePercentageInput = (value: string) => {
  if (value === "") return "";
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const normalized =
    parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return normalized;
  }
  const clamped = Math.min(100, Math.max(0, numeric));
  if (normalized.endsWith(".")) {
    return `${clamped}.`;
  }
  return String(clamped);
};

export default function AccountActivityForm({
  timeHorizonYears = "",
  startingBalance = "",
  monthlyContribution = "",
  contributionEndYear = "",
  contributionEndMonth = "",
  monthlyWithdrawal = "",
  withdrawalStartYear = "",
  withdrawalStartMonth = "",
  contributionIncreasePct = "",
  withdrawalIncreasePct = "",
  contributionIncreaseDisabled = false,
  contributionIncreaseHelperText,
  contributionIncreaseStopYear,
  monthOptions,
  contributionMonthOptions,
  contributionYearOptions,
  withdrawalYearOptions,
  onChange,
  onAdvancedClick,
  advancedButtonLabel,
  onTimeHorizonBlur,
  timeHorizonLabel,
  copy,
}: AccountActivityFormProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeCallout, setActiveCallout] = useState<
    | "timeHorizon"
    | "startingBalance"
    | "monthlyContribution"
    | "monthlyWithdrawal"
    | "contributionEnd"
    | "withdrawalStart"
    | "contributionIncrease"
    | "withdrawalIncrease"
    | null
  >(null);
  const timeHorizonAnchorRef = useRef<HTMLDivElement | null>(null);
  const startingBalanceAnchorRef = useRef<HTMLDivElement | null>(null);
  const monthlyContributionAnchorRef = useRef<HTMLDivElement | null>(null);
  const monthlyWithdrawalAnchorRef = useRef<HTMLDivElement | null>(null);
  const contributionEndAnchorRef = useRef<HTMLDivElement | null>(null);
  const withdrawalStartAnchorRef = useRef<HTMLDivElement | null>(null);
  const contributionIncreaseAnchorRef = useRef<HTMLDivElement | null>(null);
  const withdrawalIncreaseAnchorRef = useRef<HTMLDivElement | null>(null);

  const calloutButtonClass =
    "inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2";
  const calloutPanelClass =
    "absolute left-0 top-full z-20 mt-1 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--brand-primary)] px-3 py-2 text-xs leading-relaxed shadow-sm bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100";

  const closeCallout = useCallback(() => setActiveCallout(null), []);

  useEffect(() => {
    if (!activeCallout) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const anchors = [
        timeHorizonAnchorRef.current,
        startingBalanceAnchorRef.current,
        monthlyContributionAnchorRef.current,
        monthlyWithdrawalAnchorRef.current,
        contributionEndAnchorRef.current,
        withdrawalStartAnchorRef.current,
        contributionIncreaseAnchorRef.current,
        withdrawalIncreaseAnchorRef.current,
      ];
      if (anchors.some((anchor) => Boolean(anchor?.contains(target)))) return;
      closeCallout();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCallout();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCallout, closeCallout]);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const syncLabelRows = () => {
      const labels = Array.from(
        root.querySelectorAll<HTMLElement>("[data-paired-label-row]"),
      );
      for (const label of labels) {
        label.style.minHeight = "";
      }

      if (!window.matchMedia("(min-width: 768px)").matches) {
        return;
      }

      const rows = new Map<string, HTMLElement[]>();
      for (const label of labels) {
        const row = label.dataset.pairedLabelRow;
        if (!row) continue;
        const bucket = rows.get(row) ?? [];
        bucket.push(label);
        rows.set(row, bucket);
      }

      for (const rowLabels of rows.values()) {
        const maxHeight = Math.max(...rowLabels.map((label) => label.getBoundingClientRect().height));
        const appliedHeight = `${Math.ceil(maxHeight)}px`;
        for (const label of rowLabels) {
          label.style.minHeight = appliedHeight;
        }
      }
    };

    syncLabelRows();
    const observer = new ResizeObserver(syncLabelRows);
    observer.observe(root);
    window.addEventListener("resize", syncLabelRows);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncLabelRows);
    };
  }, [copy, timeHorizonLabel]);

  const contributionIncreaseHelperId = contributionIncreaseHelperText
    ? "activity-contribution-increase-helper"
    : undefined;
  const stopYearAttr =
    contributionIncreaseStopYear != null ? String(contributionIncreaseStopYear) : undefined;

  return (
    <section
      ref={sectionRef}
      className="space-y-6"
      data-contribution-stop-year={stopYearAttr}
    >
      <h1 className="text-2xl font-semibold">
        {copy?.title ?? copy?.labels?.accountActivityTitle ?? "Account Activity"}
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div
            ref={timeHorizonAnchorRef}
            data-paired-label-row="1"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-horizon"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {timeHorizonLabel ?? copy?.labels?.timeHorizonYearsFallback ?? "Time Horizon (years)"}
            </label>
            {copy?.labels?.timeHorizonCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Time horizon information"
                aria-controls="activity-time-horizon-callout"
                aria-describedby={activeCallout === "timeHorizon" ? "activity-time-horizon-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "timeHorizon"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "timeHorizon" ? null : "timeHorizon"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "timeHorizon" && copy?.labels?.timeHorizonCallout ? (
              <div id="activity-time-horizon-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.timeHorizonCallout}
              </div>
            ) : null}
          </div>
          <input
            id="activity-horizon"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={timeHorizonYears}
            onChange={(e) => onChange?.({ timeHorizonYears: e.target.value })}
            onBlur={() => onTimeHorizonBlur?.()}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
        </div>
        <div>
          <div
            ref={startingBalanceAnchorRef}
            data-paired-label-row="1"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-starting-balance"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.startingBalanceLabel ?? "Starting Balance"}
            </label>
            {copy?.labels?.startingBalanceCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Starting balance information"
                aria-controls="activity-starting-balance-callout"
                aria-describedby={activeCallout === "startingBalance" ? "activity-starting-balance-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "startingBalance"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "startingBalance" ? null : "startingBalance"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "startingBalance" && copy?.labels?.startingBalanceCallout ? (
              <div id="activity-starting-balance-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.startingBalanceCallout}
              </div>
            ) : null}
          </div>
          <input
            id="activity-starting-balance"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={startingBalance}
            onChange={(e) => onChange?.({ startingBalance: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
        </div>

        <div>
          <div
            ref={monthlyContributionAnchorRef}
            data-paired-label-row="2"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-monthly-contribution"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.monthlyContributionLabel ?? "Monthly Contribution"}
            </label>
            {copy?.labels?.monthlyContributionCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Monthly contribution information"
                aria-controls="activity-monthly-contribution-callout"
                aria-describedby={activeCallout === "monthlyContribution" ? "activity-monthly-contribution-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "monthlyContribution"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "monthlyContribution" ? null : "monthlyContribution"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "monthlyContribution" && copy?.labels?.monthlyContributionCallout ? (
              <div id="activity-monthly-contribution-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.monthlyContributionCallout}
              </div>
            ) : null}
          </div>
          <input
            id="activity-monthly-contribution"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={monthlyContribution}
            onChange={(e) => onChange?.({ monthlyContribution: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
        </div>

        <div>
          <div
            ref={monthlyWithdrawalAnchorRef}
            data-paired-label-row="2"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-monthly-withdrawal"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.monthlyWithdrawalLabel ?? "Monthly Withdrawal"}
            </label>
            {copy?.labels?.monthlyWithdrawalCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Monthly withdrawal information"
                aria-controls="activity-monthly-withdrawal-callout"
                aria-describedby={activeCallout === "monthlyWithdrawal" ? "activity-monthly-withdrawal-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "monthlyWithdrawal"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "monthlyWithdrawal" ? null : "monthlyWithdrawal"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "monthlyWithdrawal" && copy?.labels?.monthlyWithdrawalCallout ? (
              <div id="activity-monthly-withdrawal-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.monthlyWithdrawalCallout}
              </div>
            ) : null}
          </div>
          <input
            id="activity-monthly-withdrawal"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={monthlyWithdrawal}
            onChange={(e) => onChange?.({ monthlyWithdrawal: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
        </div>

        <div>
          <div
            ref={contributionEndAnchorRef}
            data-paired-label-row="3"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-contribution-end-month"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.contributionEndLabel ?? "Contribution End"}
            </label>
            {copy?.labels?.contributionEndCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Contribution end information"
                aria-controls="activity-contribution-end-callout"
                aria-describedby={activeCallout === "contributionEnd" ? "activity-contribution-end-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "contributionEnd"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "contributionEnd" ? null : "contributionEnd"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "contributionEnd" && copy?.labels?.contributionEndCallout ? (
              <div id="activity-contribution-end-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.contributionEndCallout}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-200 dark:bg-zinc-900">
            <div className="relative flex-1">
              <select
                id="activity-contribution-end-month"
                value={contributionEndMonth}
                onChange={(e) => onChange?.({ contributionEndMonth: e.target.value })}
                className="w-full appearance-none bg-transparent pr-6 text-zinc-900 focus:outline-none dark:text-zinc-100"
              >
                <option value="">
                  {copy?.labels?.monthPlaceholder ?? "Month"}
                </option>
                {(contributionMonthOptions ?? monthOptions).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
              >
                <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2.5 4.5 3.5 3 3.5-3" />
                </svg>
              </span>
            </div>
            <label htmlFor="activity-contribution-end-year" className="sr-only">
              Contribution End Year
            </label>
            <div className="relative flex-1">
              <select
                id="activity-contribution-end-year"
                value={contributionEndYear}
                onChange={(e) => onChange?.({ contributionEndYear: e.target.value })}
                className="w-full appearance-none bg-transparent pr-6 text-zinc-900 focus:outline-none dark:text-zinc-100"
              >
                <option value="">
                  {copy?.labels?.yearPlaceholder ?? "Year"}
                </option>
                {contributionYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
              >
                <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2.5 4.5 3.5 3 3.5-3" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div>
          <div
            ref={withdrawalStartAnchorRef}
            data-paired-label-row="3"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-withdrawal-start-month"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.withdrawalStartLabel ?? "Withdrawal Start"}
            </label>
            {copy?.labels?.withdrawalStartCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Withdrawal start information"
                aria-controls="activity-withdrawal-start-callout"
                aria-describedby={activeCallout === "withdrawalStart" ? "activity-withdrawal-start-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "withdrawalStart"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "withdrawalStart" ? null : "withdrawalStart"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "withdrawalStart" && copy?.labels?.withdrawalStartCallout ? (
              <div id="activity-withdrawal-start-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.withdrawalStartCallout}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-200 dark:bg-zinc-900">
            <div className="relative flex-1">
              <select
                id="activity-withdrawal-start-month"
                value={withdrawalStartMonth}
                onChange={(e) => onChange?.({ withdrawalStartMonth: e.target.value })}
                className="w-full appearance-none bg-transparent pr-6 text-zinc-900 focus:outline-none dark:text-zinc-100"
              >
                <option value="">
                  {copy?.labels?.monthPlaceholder ?? "Month"}
                </option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
              >
                <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2.5 4.5 3.5 3 3.5-3" />
                </svg>
              </span>
            </div>
            <label htmlFor="activity-withdrawal-start-year" className="sr-only">
              Withdrawal Start Year
            </label>
            <div className="relative flex-1">
              <select
                id="activity-withdrawal-start-year"
                value={withdrawalStartYear}
                onChange={(e) => onChange?.({ withdrawalStartYear: e.target.value })}
                className="w-full appearance-none bg-transparent pr-6 text-zinc-900 focus:outline-none dark:text-zinc-100"
              >
                <option value="">
                  {copy?.labels?.yearPlaceholder ?? "Year"}
                </option>
                {withdrawalYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
              >
                <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2.5 4.5 3.5 3 3.5-3" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div>
          <div
            ref={contributionIncreaseAnchorRef}
            data-paired-label-row="4"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-contribution-increase"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.contributionIncreaseLabel ?? "Annual contribution increase (%)"}
            </label>
            {copy?.labels?.contributionIncreaseCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Contribution increase information"
                aria-controls="activity-contribution-increase-callout"
                aria-describedby={activeCallout === "contributionIncrease" ? "activity-contribution-increase-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "contributionIncrease"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "contributionIncrease" ? null : "contributionIncrease"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "contributionIncrease" && copy?.labels?.contributionIncreaseCallout ? (
              <div id="activity-contribution-increase-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.contributionIncreaseCallout}
              </div>
            ) : null}
          </div>
          <input
            id="activity-contribution-increase"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={contributionIncreasePct}
            onChange={(e) =>
              onChange?.({
                contributionIncreasePct: sanitizePercentageInput(e.target.value),
              })
            }
            disabled={contributionIncreaseDisabled}
            aria-describedby={contributionIncreaseHelperId}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
          {contributionIncreaseHelperText ? (
            <p
              id={contributionIncreaseHelperId}
              className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
            >
              {contributionIncreaseHelperText}
            </p>
          ) : null}
        </div>

        <div>
          <div
            ref={withdrawalIncreaseAnchorRef}
            data-paired-label-row="4"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="activity-withdrawal-increase"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.withdrawalIncreaseLabel ?? "Annual withdrawal increase (%)"}
            </label>
            {copy?.labels?.withdrawalIncreaseCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Withdrawal increase information"
                aria-controls="activity-withdrawal-increase-callout"
                aria-describedby={activeCallout === "withdrawalIncrease" ? "activity-withdrawal-increase-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={activeCallout === "withdrawalIncrease"}
                onClick={() =>
                  setActiveCallout((prev) => (prev === "withdrawalIncrease" ? null : "withdrawalIncrease"))
                }
              >
                i
              </button>
            ) : null}
            {activeCallout === "withdrawalIncrease" && copy?.labels?.withdrawalIncreaseCallout ? (
              <div id="activity-withdrawal-increase-callout" role="tooltip" className={`${calloutPanelClass} w-80`}>
                {copy.labels.withdrawalIncreaseCallout}
              </div>
            ) : null}
          </div>
          <input
            id="activity-withdrawal-increase"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={withdrawalIncreasePct}
            onChange={(e) =>
              onChange?.({
                withdrawalIncreasePct: sanitizePercentageInput(e.target.value),
              })
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => onAdvancedClick?.()}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {advancedButtonLabel ?? "Budget for Qualified Withdrawals"}
          </button>
        </div>
      </div>
    </section>
  );
}
