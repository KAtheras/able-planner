"use client";

import type { ReactNode } from "react";

export type NavKey = "inputs" | "reports" | "schedule" | "disclosures";

type NavItem = {
  key: NavKey;
  label: string;
  icon: ReactNode;
};

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h16v3H4zM4 10h16v3H4zM4 15h10v3H4z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5h18v14H3zM5 7v4h6V7H5zm0 6v4h6v-4H5zm8-6v4h6V7h-6zm0 6v4h6v-4h-6z"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 19h14v2H3V3h2v16Zm4-2H7V9h2v8Zm5 0h-2V5h2v12Zm5 0h-2v-6h2v6Z"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6H11l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1c.5.4 1.1.8 1.7 1l.4 2.6h4.2l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5ZM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  );
}

const ITEMS: NavItem[] = [
  { key: "inputs", label: "Inputs", icon: <IconGrid /> },
  { key: "reports", label: "Reports", icon: <IconChart /> },
  { key: "schedule", label: "Schedule", icon: <IconChat /> },
  { key: "disclosures", label: "Disclosures", icon: <IconGear /> },
];

type SidebarProps = {
  active: NavKey;
  onChange: (key: NavKey) => void;
};

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <>
      {/* Desktop / wide: left sidebar */}
      <nav
        aria-label="Primary"
        className="hidden h-[calc(100vh-3.5rem)] w-24 flex-col items-center gap-3 border-r border-zinc-200 bg-white px-2 py-4 dark:border-zinc-800 dark:bg-black md:flex"
      >
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group flex w-full flex-col items-center justify-center gap-2 rounded-3xl px-2 py-3 text-xs font-semibold",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]",
                isActive
                  ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
              ].join(" ")}
            >
              <span
                className={[
                  "grid place-items-center rounded-2xl",
                  isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100",
                ].join(" ")}
              >
                {item.icon}
              </span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:hidden"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 py-2">
          {ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChange(item.key)}
                aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]",
                isActive
                  ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
              ].join(" ")}
              >
                <span className="grid place-items-center">{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
