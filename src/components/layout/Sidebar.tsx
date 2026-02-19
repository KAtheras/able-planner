"use client";

import type { ReactNode } from "react";

export type NavKey =
  | "inputs"
  | "reports"
  | "schedule"
  | "resources"
  | "disclosures";

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
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  );
}

function IconReports() {
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

function IconResources() {
  return (
    <svg viewBox="0 -960 960 960" className="h-7 w-7" aria-hidden="true">
      <path
        fill="currentColor"
        d="M480-60q-72-68-165-104t-195-36v-440q101 0 194 36.5T480-498q73-69 166-105.5T840-640v440q-103 0-195.5 36T480-60Zm0-104q63-47 134-75t146-37v-276q-73 13-143.5 52.5T480-394q-66-66-136.5-105.5T200-552v276q75 9 146 37t134 75ZM367-647q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47Zm169.5-56.5Q560-727 560-760t-23.5-56.5Q513-840 480-840t-56.5 23.5Q400-793 400-760t23.5 56.5Q447-680 480-680t56.5-23.5ZM480-760Zm0 366Z"
      />
    </svg>
  );
}

function IconArrowBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
    </svg>
  );
}

function IconArrowForward() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path fill="currentColor" d="m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
    </svg>
  );
}

const ITEMS: NavItem[] = [
  { key: "inputs", label: "Inputs", icon: <IconGrid /> },
  { key: "reports", label: "Reports", icon: <IconReports /> },
  { key: "schedule", label: "Schedule", icon: <IconChat /> },
  { key: "resources", label: "Resources", icon: <IconResources /> },
  { key: "disclosures", label: "Disclosures", icon: <IconGear /> },
];

type SidebarProps = {
  active: NavKey;
  onChange: (key: NavKey) => void;
  language: "en" | "es";
  labels?: Partial<Record<NavKey, string>>;
  desktopTopOffsetPx?: number;
  mobileBackAction?: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
  };
  mobileNextAction?: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
  };
};

export default function Sidebar({
  active,
  onChange,
  language,
  labels,
  desktopTopOffsetPx,
  mobileBackAction,
  mobileNextAction,
}: SidebarProps) {
  return (
    <>
      {/* Desktop / wide: left sidebar */}
      <nav
        aria-label="Primary"
        className="hidden h-[calc(100vh-3.5rem)] w-24 flex-col items-center gap-3 border-r border-zinc-200 bg-white px-2 pt-0 pb-4 dark:border-zinc-800 dark:bg-black md:flex"
        style={
          typeof desktopTopOffsetPx === "number"
            ? { paddingTop: `${desktopTopOffsetPx}px` }
            : undefined
        }
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
                "group flex w-full flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]",
                isActive
                  ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
              ].join(" ")}
            >
              <span
                className={[
                  "grid place-items-center rounded-lg",
                  isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100",
                ].join(" ")}
              >
                {item.icon}
              </span>
              <span className="tracking-wide">{labels?.[item.key] ?? item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:hidden"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-1 px-2 py-2">
          <button
            type="button"
            disabled={mobileBackAction?.disabled}
            onClick={mobileBackAction?.onClick}
            className={[
              "shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]",
              mobileBackAction?.disabled
                ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
            ].join(" ")}
          >
            <span className="grid place-items-center">
              <IconArrowBack />
            </span>
            <span className="text-[9px] leading-none tracking-tight">{mobileBackAction?.label}</span>
          </button>
          <div className="grid flex-1 grid-cols-5 gap-0.5">
            {ITEMS.map((item) => {
              const isActive = item.key === active;
              const baseLabel = labels?.[item.key] ?? item.label;
              const mobileLabel =
                item.key === "schedule"
                  ? language === "es"
                    ? "Tabla"
                    : "Schedule"
                  : item.key === "resources"
                    ? language === "es"
                      ? "Recursos"
                      : "Resources"
                  : item.key === "disclosures"
                    ? language === "es"
                      ? "Notas"
                      : "Notes"
                    : baseLabel;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-semibold",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]",
                    isActive
                      ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/60",
                  ].join(" ")}
                >
                  <span className="grid place-items-center">{item.icon}</span>
                  <span
                    className="block w-full max-w-full text-center text-[9px] leading-none whitespace-nowrap tracking-tight"
                  >
                    {mobileLabel}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={mobileNextAction?.disabled}
            onClick={mobileNextAction?.onClick}
            className={[
              "shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]",
              mobileNextAction?.disabled
                ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                : "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]",
            ].join(" ")}
          >
            <span className="grid place-items-center">
              <IconArrowForward />
            </span>
            <span className="text-[9px] leading-none tracking-tight">{mobileNextAction?.label}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
