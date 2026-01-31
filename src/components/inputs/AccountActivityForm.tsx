"use client";

type Option = {
  value: string;
  label: string;
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
  monthOptions: Option[];
  contributionYearOptions: string[];
  withdrawalYearOptions: string[];
  onChange?: (updates: Partial<AccountActivityFormProps>) => void;
  onAdvancedClick?: () => void;
  onTimeHorizonBlur?: () => void;
  timeHorizonLabel?: string;
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
  monthOptions,
  contributionYearOptions,
  withdrawalYearOptions,
  onChange,
  onAdvancedClick,
  onTimeHorizonBlur,
  timeHorizonLabel,
}: AccountActivityFormProps) {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Account Activity</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {timeHorizonLabel ?? "Time Horizon (years)"}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={timeHorizonYears}
            onChange={(e) => onChange?.({ timeHorizonYears: e.target.value })}
            onBlur={() => onTimeHorizonBlur?.()}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Starting Balance
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={startingBalance}
            onChange={(e) => onChange?.({ startingBalance: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Monthly Contribution
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={monthlyContribution}
            onChange={(e) => onChange?.({ monthlyContribution: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Contribution End
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            <select
              value={contributionEndMonth}
              onChange={(e) => onChange?.({ contributionEndMonth: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
            >
              <option value="">Month</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={contributionEndYear}
              onChange={(e) => onChange?.({ contributionEndYear: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
            >
              <option value="">Year</option>
              {contributionYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Monthly Withdrawal
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={monthlyWithdrawal}
            onChange={(e) => onChange?.({ monthlyWithdrawal: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Withdrawal Start
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            <select
              value={withdrawalStartMonth}
              onChange={(e) => onChange?.({ withdrawalStartMonth: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
            >
              <option value="">Month</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={withdrawalStartYear}
              onChange={(e) => onChange?.({ withdrawalStartYear: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none"
            >
              <option value="">Year</option>
              {withdrawalYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
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
