"use client";

type Props = {
  visible: boolean;
  label: string;
  value: string;
};

export default function MobileFloatingEndingValue({ visible, label, value }: Props) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.85rem)] z-40 px-2 md:hidden">
      <div className="rounded-md border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] px-3 py-2 shadow-sm backdrop-blur dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
          <div className="text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {value}
          </div>
        </div>
      </div>
    </div>
  );
}
