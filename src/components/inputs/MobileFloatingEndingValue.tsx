"use client";

import { useEffect, useState } from "react";

type Props = {
  visible: boolean;
  label: string;
  value: string;
};

export default function MobileFloatingEndingValue({ visible, label, value }: Props) {
  const [viewportOffsetY, setViewportOffsetY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !visible) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const syncOffset = () => {
      const next = Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0;
      setViewportOffsetY((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };

    const initialSyncTimeout = window.setTimeout(syncOffset, 0);
    vv.addEventListener("resize", syncOffset);
    vv.addEventListener("scroll", syncOffset);
    return () => {
      window.clearTimeout(initialSyncTimeout);
      vv.removeEventListener("resize", syncOffset);
      vv.removeEventListener("scroll", syncOffset);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed right-2 top-[calc(env(safe-area-inset-top)+11.5rem)] z-50 w-[202px] md:hidden"
      style={{ transform: `translateY(${viewportOffsetY}px)` }}
    >
      <div className="rounded-md border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] px-2 py-[0.6rem] shadow-sm backdrop-blur dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)]">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="mt-1 text-center text-[12px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {value}
        </div>
      </div>
    </div>
  );
}
