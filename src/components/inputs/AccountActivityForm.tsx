"use client";

type Option = {
  value: string;
  label: string;
};

type AccountActivityCopy = {
  title?: string;
  labels?: {
    accountActivityTitle?: string;
    timeHorizonYearsFallback?: string;
    startingBalanceLabel?: string;
    monthlyContributionLabel?: string;
    monthlyWithdrawalLabel?: string;
    contributionEndLabel?: string;
    withdrawalStartLabel?: string;
    contributionIncreaseLabel?: string;
    withdrawalIncreaseLabel?: string;
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
  contributionYearOptions: string[];
  withdrawalYearOptions: string[];
  onChange?: (updates: Partial<AccountActivityFormProps>) => void;
  onAdvancedClick?: () => void;
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
  contributionYearOptions,
  withdrawalYearOptions,
  onChange,
  onAdvancedClick,
  onTimeHorizonBlur,
  timeHorizonLabel,
  copy,
}: AccountActivityFormProps) {
  const contributionIncreaseHelperId = contributionIncreaseHelperText
    ? "activity-contribution-increase-helper"
    : undefined;
  const stopYearAttr =
    contributionIncreaseStopYear != null ? String(contributionIncreaseStopYear) : undefined;

  return (
    <section
      className="space-y-6"
      data-contribution-stop-year={stopYearAttr}
    >
      <h1 className="text-2xl font-semibold">
        {copy?.title ?? copy?.labels?.accountActivityTitle ?? "Account Activity"}
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="activity-horizon"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {timeHorizonLabel ?? copy?.labels?.timeHorizonYearsFallback ?? "Time Horizon (years)"}
          </label>
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
          <label
            htmlFor="activity-starting-balance"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.startingBalanceLabel ?? "Starting Balance"}
          </label>
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
          <label
            htmlFor="activity-monthly-contribution"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.monthlyContributionLabel ?? "Monthly Contribution"}
          </label>
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
          <label
            htmlFor="activity-monthly-withdrawal"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.monthlyWithdrawalLabel ?? "Monthly Withdrawal"}
          </label>
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
          <label
            htmlFor="activity-contribution-end-month"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.contributionEndLabel ?? "Contribution End"}
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            <select
              id="activity-contribution-end-month"
              value={contributionEndMonth}
              onChange={(e) => onChange?.({ contributionEndMonth: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
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
            <label htmlFor="activity-contribution-end-year" className="sr-only">
              Contribution End Year
            </label>
            <select
              id="activity-contribution-end-year"
              value={contributionEndYear}
              onChange={(e) => onChange?.({ contributionEndYear: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
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
          </div>
        </div>

        <div>
          <label
            htmlFor="activity-withdrawal-start-month"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.withdrawalStartLabel ?? "Withdrawal Start"}
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            <select
              id="activity-withdrawal-start-month"
              value={withdrawalStartMonth}
              onChange={(e) => onChange?.({ withdrawalStartMonth: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
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
            <label htmlFor="activity-withdrawal-start-year" className="sr-only">
              Withdrawal Start Year
            </label>
            <select
              id="activity-withdrawal-start-year"
              value={withdrawalStartYear}
              onChange={(e) => onChange?.({ withdrawalStartYear: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
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
          </div>
        </div>

        <div>
          <label
            htmlFor="activity-contribution-increase"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.contributionIncreaseLabel ?? "Annual contribution increase (%)"}
          </label>
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
          <label
            htmlFor="activity-withdrawal-increase"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.withdrawalIncreaseLabel ?? "Annual withdrawal increase (%)"}
          </label>
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
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-200"
          >
            Advanced Controls
          </button>
        </div>
      </div>
    </section>
  );
}
