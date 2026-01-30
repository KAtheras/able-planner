"use client";

import planLevelInfo from "@/config/rules/planLevelInfo.json";

type DemographicsFormProps = {
  beneficiaryName?: string;
  stateOfResidence?: string;
  filingStatus?: string;
  agi?: string;
  annualReturn?: string;
  isSsiEligible?: boolean;
  fscStatus?: "idle" | "eligible" | "ineligible";
  fscButtonLabel?: string;
  fscDisabled?: boolean;
  onChange?: (updates: Partial<DemographicsFormProps>) => void;
  onFscClick?: () => void;
};

export default function DemographicsForm({
  beneficiaryName = "",
  stateOfResidence = "",
  filingStatus = "single",
  agi = "",
  annualReturn = "",
  isSsiEligible = false,
  fscStatus = "idle",
  fscButtonLabel,
  fscDisabled = false,
  onChange,
  onFscClick,
}: DemographicsFormProps) {
  const defaultButtonLabel =
    fscStatus === "idle"
      ? "Check eligibility"
      : fscStatus === "eligible"
      ? "Eligible — Retest"
      : "Not eligible — Retest";

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Demographic Information</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Beneficiary Name
            </label>
          <input
            type="text"
            value={beneficiaryName}
            onChange={(e) => onChange?.({ beneficiaryName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            State of Residence
          </label>
          <select
            value={stateOfResidence}
            onChange={(e) => onChange?.({ stateOfResidence: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">Select a state</option>
            {Object.entries(planLevelInfo).map(([code, info]) => (
              <option key={code} value={code}>
                {info.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Filing Status
          </label>
          <select
            value={filingStatus}
            onChange={(e) => onChange?.({ filingStatus: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="single">Single</option>
            <option value="married_joint">Married Filing Jointly</option>
            <option value="married_separate">Married Filing Separately</option>
            <option value="head_of_household">Head of Household</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Adjusted Gross Income (AGI)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={agi}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange?.({ agi: "" });
                return;
              }
              const parsed = Number(raw);
              if (Number.isNaN(parsed)) {
                onChange?.({ agi: raw });
                return;
              }
              onChange?.({ agi: String(Math.max(0, parsed)) });
            }}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Annual Investment Return Assumption (%)
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            value={annualReturn}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange?.({ annualReturn: "" });
                return;
              }
              const parsed = Number(raw);
              if (Number.isNaN(parsed)) {
                onChange?.({ annualReturn: raw });
                return;
              }
              onChange?.({ annualReturn: String(Math.max(0, parsed)) });
            }}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSsiEligible}
              onChange={(e) => onChange?.({ isSsiEligible: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm">Beneficiary is eligible for SSI</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Federal Saver’s Credit Eligibility
            </p>
            <button
              type="button"
              disabled={fscDisabled}
              className={[
                "w-full rounded-2xl px-4 py-2 text-sm font-semibold transition",
                fscStatus === "idle"
                  ? "border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  : fscStatus === "eligible"
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white",
                fscDisabled ? "cursor-not-allowed opacity-80" : "",
              ].join(" ")}
              onClick={onFscClick}
            >
              {fscButtonLabel ?? defaultButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
