"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function PlannerNoticeCard({ children, className = "" }: Props) {
  return (
    <div
      className={[
        "rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
