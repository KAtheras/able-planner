"use client";

export type ReportWindowOptionItem = {
  key: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
};

type Props = {
  label: string;
  options: ReportWindowOptionItem[];
};

export default function ReportWindowToggle({ label, options }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="hidden whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:inline">
        {label}
      </span>
      <div className="inline-flex flex-nowrap rounded-full border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={option.isActive}
            className={[
              "rounded-full px-2 py-1.5 text-xs font-semibold leading-none whitespace-nowrap transition md:px-3 md:py-1 md:text-xs",
              option.isActive
                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
            ].join(" ")}
            onClick={option.onClick}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
