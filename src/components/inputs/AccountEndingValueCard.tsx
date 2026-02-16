"use client";

type Props = {
  label: string;
  value: string;
};

export default function AccountEndingValueCard({ label, value }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}
