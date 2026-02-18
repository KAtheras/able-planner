"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import planLevelInfo from "@/config/rules/planLevelInfo.json";

type DemographicsCopy = {
  title?: string;
  labels?: {
    nameLabel?: string;
    nameCallout?: string;
    stateOfResidenceLabel?: string;
    stateOfResidenceCallout?: string;
    filingStatusLabel?: string;
    filingStatusCallout?: string;
    agiLabel?: string;
    agiCallout?: string;
    agiRequiredInlineLabel?: string;
    agiRequiredFootnote?: string;
    agiRequiredFieldPlaceholder?: string;
    requiredFieldPlaceholder?: string;
    annualReturnLabel?: string;
    annualReturnCallout?: string;
    ssiEligibilityLabel?: string;
    ssiEligibilityCallout?: string;
    fscHeading?: string;
    fscHeadingCallout?: string;
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
  buttons?: {
    eligibleRetest?: string;
    notEligibleRetest?: string;
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
  headerRightSlot?: ReactNode;
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
  headerRightSlot,
  onChange,
  onFscClick,
  copy,
}: DemographicsFormProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [showStateCallout, setShowStateCallout] = useState(false);
  const [showFilingCallout, setShowFilingCallout] = useState(false);
  const [showAgiCallout, setShowAgiCallout] = useState(false);
  const [showAnnualReturnCallout, setShowAnnualReturnCallout] = useState(false);
  const [showSsiCallout, setShowSsiCallout] = useState(false);
  const [showFscCallout, setShowFscCallout] = useState(false);
  const [showNameCallout, setShowNameCallout] = useState(false);
  const nameCalloutAnchorRef = useRef<HTMLDivElement | null>(null);
  const stateCalloutAnchorRef = useRef<HTMLDivElement | null>(null);
  const filingCalloutAnchorRef = useRef<HTMLDivElement | null>(null);
  const agiCalloutAnchorRef = useRef<HTMLDivElement | null>(null);
  const annualReturnCalloutAnchorRef = useRef<HTMLDivElement | null>(null);
  const ssiCalloutAnchorRef = useRef<HTMLDivElement | null>(null);
  const fscCalloutAnchorRef = useRef<HTMLDivElement | null>(null);

  const calloutButtonClass =
    "inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2";
  const calloutPanelClass =
    "absolute left-0 top-full z-20 mt-1 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--brand-primary)] px-3 py-2 text-xs leading-relaxed shadow-sm bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100";

  const closeAllCallouts = useCallback(() => {
    setShowNameCallout(false);
    setShowStateCallout(false);
    setShowFilingCallout(false);
    setShowAgiCallout(false);
    setShowAnnualReturnCallout(false);
    setShowSsiCallout(false);
    setShowFscCallout(false);
  }, []);

  useEffect(() => {
    if (!showNameCallout && !showStateCallout && !showFilingCallout && !showAgiCallout && !showAnnualReturnCallout && !showSsiCallout && !showFscCallout) {
      return;
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const clickedNameAnchor = Boolean(nameCalloutAnchorRef.current?.contains(target));
      const clickedStateAnchor = Boolean(stateCalloutAnchorRef.current?.contains(target));
      const clickedFilingAnchor = Boolean(filingCalloutAnchorRef.current?.contains(target));
      const clickedAgiAnchor = Boolean(agiCalloutAnchorRef.current?.contains(target));
      const clickedAnnualReturnAnchor = Boolean(annualReturnCalloutAnchorRef.current?.contains(target));
      const clickedSsiAnchor = Boolean(ssiCalloutAnchorRef.current?.contains(target));
      const clickedFscAnchor = Boolean(fscCalloutAnchorRef.current?.contains(target));
      if (clickedNameAnchor || clickedStateAnchor || clickedFilingAnchor || clickedAgiAnchor || clickedAnnualReturnAnchor || clickedSsiAnchor || clickedFscAnchor) {
        return;
      }
      closeAllCallouts();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAllCallouts();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeAllCallouts, showNameCallout, showStateCallout, showFilingCallout, showAgiCallout, showAnnualReturnCallout, showSsiCallout, showFscCallout]);

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
  }, [copy]);

  const defaultButtonLabel =
    fscStatus === "idle"
      ? copy?.labels?.checkEligibility ?? "Check eligibility"
      : fscStatus === "eligible"
      ? copy?.buttons?.eligibleRetest ?? ""
      : copy?.buttons?.notEligibleRetest ?? "";

  return (
    <section ref={sectionRef} className="space-y-6">
      <div data-mobile-input-header="true" className="sticky top-[calc(env(safe-area-inset-top)+6rem)] z-20 -mx-4 mb-3 flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:hidden">
        <h1 className="text-base font-semibold md:text-2xl">
          {copy?.title ?? copy?.labels?.demographicsTitle ?? "Demographic Information"}
        </h1>
        {headerRightSlot}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div
            ref={nameCalloutAnchorRef}
            data-paired-label-row="1"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="demographics-beneficiary-name"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.nameLabel ?? "Beneficiary Name"}
            </label>
            {copy?.labels?.nameCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Beneficiary information"
                aria-controls="demographics-name-callout"
                aria-describedby={showNameCallout ? "demographics-name-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={showNameCallout}
                onClick={() => {
                  const next = !showNameCallout;
                  closeAllCallouts();
                  setShowNameCallout(next);
                }}
              >
                i
              </button>
            ) : null}
            {showNameCallout && copy?.labels?.nameCallout ? (
              <div
                id="demographics-name-callout"
                role="tooltip"
                className={`${calloutPanelClass} w-80`}
              >
                {copy.labels.nameCallout}
              </div>
            ) : null}
          </div>
          <input
            id="demographics-beneficiary-name"
            type="text"
            value={beneficiaryName}
            onChange={(e) => onChange?.({ beneficiaryName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm"
          />
        </div>
        <div>
          <div
            ref={stateCalloutAnchorRef}
            data-paired-label-row="1"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="demographics-residence"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.stateOfResidenceLabel ?? "State of Residence"}
            </label>
            {copy?.labels?.stateOfResidenceCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="State of residence information"
                aria-controls="demographics-state-callout"
                aria-describedby={showStateCallout ? "demographics-state-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={showStateCallout}
                onClick={() => {
                  const next = !showStateCallout;
                  closeAllCallouts();
                  setShowStateCallout(next);
                }}
              >
                i
              </button>
            ) : null}
            {showStateCallout && copy?.labels?.stateOfResidenceCallout ? (
              <div
                id="demographics-state-callout"
                role="tooltip"
                className={`${calloutPanelClass} w-72`}
              >
                {copy.labels.stateOfResidenceCallout}
              </div>
            ) : null}
          </div>
          <div className="relative mt-1">
            <select
              id="demographics-residence"
              value={stateOfResidence}
              onChange={(e) => onChange?.({ stateOfResidence: e.target.value })}
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-8 text-sm leading-normal text-zinc-900 dark:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100"
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
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
            >
              <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2.5 4.5 3.5 3 3.5-3" />
              </svg>
            </span>
          </div>
        </div>
        <div>
          <div
            ref={filingCalloutAnchorRef}
            data-paired-label-row="2"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="demographics-filing-status"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.filingStatusLabel ?? "Filing Status"}
            </label>
            {copy?.labels?.filingStatusCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Filing status information"
                aria-controls="demographics-filing-callout"
                aria-describedby={showFilingCallout ? "demographics-filing-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={showFilingCallout}
                onClick={() => {
                  const next = !showFilingCallout;
                  closeAllCallouts();
                  setShowFilingCallout(next);
                }}
              >
                i
              </button>
            ) : null}
            {showFilingCallout && copy?.labels?.filingStatusCallout ? (
              <div
                id="demographics-filing-callout"
                role="tooltip"
                className={`${calloutPanelClass} w-72`}
              >
                {copy.labels.filingStatusCallout}
              </div>
            ) : null}
          </div>
          <div className="relative mt-1">
            <select
              id="demographics-filing-status"
              value={filingStatus}
              onChange={(e) => onChange?.({ filingStatus: e.target.value })}
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-8 text-sm leading-normal text-zinc-900 dark:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100"
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
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
            >
              <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2.5 4.5 3.5 3 3.5-3" />
              </svg>
            </span>
          </div>
        </div>
        <div>
          <div
            ref={agiCalloutAnchorRef}
            data-paired-label-row="2"
            className="relative flex items-center gap-1"
          >
            <label
              htmlFor="demographics-agi"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {copy?.labels?.agiLabel ?? "Adjusted Gross Income (AGI)"}
            </label>
            {copy?.labels?.agiCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Taxable income information"
                aria-controls="demographics-agi-callout"
                aria-describedby={showAgiCallout ? "demographics-agi-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={showAgiCallout}
                onClick={() => {
                  const next = !showAgiCallout;
                  closeAllCallouts();
                  setShowAgiCallout(next);
                }}
              >
                i
              </button>
            ) : null}
            {showAgiCallout && copy?.labels?.agiCallout ? (
              <div
                id="demographics-agi-callout"
                role="tooltip"
                className={`${calloutPanelClass} w-72`}
              >
                {copy.labels.agiCallout}
              </div>
            ) : null}
          </div>
          <div className="relative mt-1">
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
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {agi === "" ? (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[var(--brand-primary)] md:text-sm">
                {copy?.labels?.agiRequiredInlineLabel ?? "Required field"}
                <sup className="ml-px text-[11px] leading-none align-[0.15em] md:text-[12px]">*</sup>
              </span>
            ) : null}
          </div>
        </div>
        <div className="md:col-span-2">
          <div ref={annualReturnCalloutAnchorRef} className="relative flex items-center gap-1">
            <label
              htmlFor="demographics-annual-return"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >{copy?.labels?.annualReturnLabel ?? "Annual Investment Return Assumption (%)"}</label>
            {copy?.labels?.annualReturnCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="Annual return assumption information"
                aria-controls="demographics-annual-return-callout"
                aria-describedby={showAnnualReturnCallout ? "demographics-annual-return-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={showAnnualReturnCallout}
                onClick={() => {
                  const next = !showAnnualReturnCallout;
                  closeAllCallouts();
                  setShowAnnualReturnCallout(next);
                }}
              >
                i
              </button>
            ) : null}
            {showAnnualReturnCallout && copy?.labels?.annualReturnCallout ? (
              <div
                id="demographics-annual-return-callout"
                role="tooltip"
                className={`${calloutPanelClass} w-72`}
              >
                {copy.labels.annualReturnCallout}
              </div>
            ) : null}
          </div>
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
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base md:text-sm appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div className="md:col-span-2">
          <div ref={ssiCalloutAnchorRef} className="relative inline-flex items-center gap-1">
            <label
              htmlFor="demographics-ssi"
              className="flex items-center gap-3 text-sm uppercase tracking-wide"
            >
              <input
                id="demographics-ssi"
                type="checkbox"
                checked={isSsiEligible}
                onChange={(e) => onChange?.({ isSsiEligible: e.target.checked })}
                className="h-5 w-5 rounded border-zinc-300 accent-[var(--brand-primary)]"
              />
              {copy?.labels?.ssiEligibilityLabel ?? "Beneficiary is eligible for SSI"}
            </label>
            {copy?.labels?.ssiEligibilityCallout ? (
              <button
                type="button"
                className={calloutButtonClass}
                aria-label="SSI eligibility information"
                aria-controls="demographics-ssi-callout"
                aria-describedby={showSsiCallout ? "demographics-ssi-callout" : undefined}
                aria-haspopup="true"
                aria-expanded={showSsiCallout}
                onClick={() => {
                  const next = !showSsiCallout;
                  closeAllCallouts();
                  setShowSsiCallout(next);
                }}
              >
                i
              </button>
            ) : null}
            {showSsiCallout && copy?.labels?.ssiEligibilityCallout ? (
              <div
                id="demographics-ssi-callout"
                role="tooltip"
                className={`${calloutPanelClass} w-80`}
              >
                {copy.labels.ssiEligibilityCallout}
              </div>
            ) : null}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div ref={fscCalloutAnchorRef} className="relative inline-flex items-center gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{copy?.labels?.fscHeading ?? "Federal Saver’s Credit Eligibility"}</p>
              {copy?.labels?.fscHeadingCallout ? (
                <button
                  type="button"
                  className={calloutButtonClass}
                  aria-label="Federal Saver's Credit information"
                  aria-controls="demographics-fsc-callout"
                  aria-describedby={showFscCallout ? "demographics-fsc-callout" : undefined}
                  aria-haspopup="true"
                  aria-expanded={showFscCallout}
                  onClick={() => {
                    const next = !showFscCallout;
                    closeAllCallouts();
                    setShowFscCallout(next);
                  }}
                >
                  i
                </button>
              ) : null}
              {showFscCallout && copy?.labels?.fscHeadingCallout ? (
                <div
                  id="demographics-fsc-callout"
                  role="tooltip"
                  className={`${calloutPanelClass} w-80`}
                >
                  {copy.labels.fscHeadingCallout}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={fscDisabled}
              className={[
                "w-full rounded-2xl px-4 py-2 text-sm font-semibold transition",
                fscStatus === "idle"
                  ? "border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
      <p className="mt-2 text-xs font-medium text-[var(--brand-primary)]">
        {copy?.labels?.agiRequiredFootnote ?? "* Enter $0 if no income."}
      </p>
    </section>
  );
}
