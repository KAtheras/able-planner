"use client";

import planLevelInfo from "@/config/rules/planLevelInfo.json";

type DemographicsCopy = {
  title?: string;
  labels?: {
    selectState?: string;
    checkEligibility?: string;
    filing?: {
      single?: string;
      married_joint?: string;
      married_separate?: string;
      head_of_household?: string;
    };
    demographicsTitle?: string;
  };
};

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
  copy?: DemographicsCopy;
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
  copy,
}: DemographicsFormProps) {
  const defaultButtonLabel =
    fscStatus === "idle"
      ? copy?.labels?.checkEligibility ?? "Check eligibility"
      : fscStatus === "eligible"
      ? "Eligible — Retest"
      : "Not eligible — Retest";

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {copy?.title ?? copy?.labels?.demographicsTitle ?? "Demographic Information"}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="demographics-beneficiary-name"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.nameLabel ?? "Beneficiary Name"}
          </label>
          <input
            id="demographics-beneficiary-name"
            type="text"
            value={beneficiaryName}
            onChange={(e) => onChange?.({ beneficiaryName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="demographics-residence"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.stateOfResidenceLabel ?? "State of Residence"}
          </label>
          <select
            id="demographics-residence"
            value={stateOfResidence}
            onChange={(e) => onChange?.({ stateOfResidence: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">
              {copy?.labels?.selectState ?? "Select a state"}
            </option>
            {Object.entries(planLevelInfo).map(([code, info]) => (
              <option key={code} value={code}>
                {info.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="demographics-filing-status"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.filingStatusLabel ?? "Filing Status"}
          </label>
          <select
            id="demographics-filing-status"
            value={filingStatus}
            onChange={(e) => onChange?.({ filingStatus: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="single">
              {copy?.labels?.filing?.single ?? "Single"}
            </option>
            <option value="married_joint">
              {copy?.labels?.filing?.married_joint ?? "Married Filing Jointly"}
            </option>
            <option value="married_separate">
              {copy?.labels?.filing?.married_separate ?? "Married Filing Separately"}
            </option>
            <option value="head_of_household">
              {copy?.labels?.filing?.head_of_household ?? "Head of Household"}
            </option>
          </select>
        </div>
        <div>
          <label
            htmlFor="demographics-agi"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {copy?.labels?.agiLabel ?? "Adjusted Gross Income (AGI)"}
          </label>
          <input
            id="demographics-agi"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            autoComplete="off"
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
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor="demographics-annual-return"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >{copy?.labels?.annualReturnLabel ?? "Annual Investment Return Assumption (%)"}</label>
          <input
            id="demographics-annual-return"
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            autoComplete="off"
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
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor="demographics-ssi"
            className="flex items-center gap-3 text-sm"
          >
            <input
              id="demographics-ssi"
              type="checkbox"
              checked={isSsiEligible}
              onChange={(e) => onChange?.({ isSsiEligible: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300"
            />{copy?.labels?.ssiEligibilityLabel ?? "Beneficiary is eligible for SSI"}</label>
        </div>
        <div className="md:col-span-2">
          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{copy?.labels?.fscHeading ?? "Federal Saver’s Credit Eligibility"}</p>
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
