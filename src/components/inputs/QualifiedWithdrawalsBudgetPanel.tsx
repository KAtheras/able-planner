"use client";

import type { ReactNode } from "react";

type BudgetValues = {
  housing: string;
  healthcare: string;
  transportation: string;
  education: string;
  other: string;
};

type BudgetCopy = {
  title?: string;
  housing?: string;
  healthcare?: string;
  transportation?: string;
  education?: string;
  other?: string;
  total?: string;
  closeButton?: string;
};

type Props = {
  accountEndingNode: ReactNode;
  depletionNoticeNode: ReactNode;
  values: BudgetValues;
  total: number;
  onChange: (key: keyof BudgetValues, value: string) => void;
  onClose: () => void;
  formatCurrency: (value: number) => string;
  copy: BudgetCopy;
};

export default function QualifiedWithdrawalsBudgetPanel({
  accountEndingNode,
  depletionNoticeNode,
  values,
  total,
  onChange,
  onClose,
  formatCurrency,
  copy,
}: Props) {
  const fields: Array<{ key: keyof BudgetValues; label: string }> = [
    { key: "housing", label: copy.housing ?? "Housing" },
    { key: "healthcare", label: copy.healthcare ?? "Healthcare" },
    { key: "transportation", label: copy.transportation ?? "Transportation" },
    { key: "education", label: copy.education ?? "Education" },
    { key: "other", label: copy.other ?? "Other" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {accountEndingNode}
      {depletionNoticeNode}
      <div className="space-y-4 rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,white)] p-4 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_20%,black)]">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
          {copy.title ?? "Budget for Qualified Withdrawals"}
        </h3>
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-[1fr_1fr] items-center gap-3">
              <label
                htmlFor={`qualified-withdrawals-${field.key}`}
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {field.label}
              </label>
              <input
                id={`qualified-withdrawals-${field.key}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={values[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 md:text-sm"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
          onClick={onClose}
        >
          {(copy.closeButton ?? "Done")} ({copy.total ?? "Total"}: {formatCurrency(total).replace(".00", "")})
        </button>
      </div>
    </div>
  );
}
