"use client";

import { useEffect, useRef, useState } from "react";
import { type SupportedLanguage } from "@/copy";

export type SettingsMenuProps = {
  language: SupportedLanguage;
  setLanguage: (value: SupportedLanguage) => void;
};

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

export default function SettingsMenu({
  language,
  setLanguage,
}: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("touchstart", handlePointer);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("touchstart", handlePointer);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-zinc-200 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/60"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Settings
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-20 mt-3 min-w-[200px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-black"
          role="menu"
          aria-label="Settings menu"
        >
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Language
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "rounded-full border px-2 py-1 text-xs font-semibold transition",
                      option.value === language
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/60",
                    ].join(" ")}
                    aria-pressed={option.value === language}
                    onClick={() => setLanguage(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
