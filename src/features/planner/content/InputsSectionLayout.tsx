"use client";

import type { ReactNode, RefObject } from "react";

type InputsDesktopHeaderProps = {
  title: string;
  inputStep: 1 | 2;
  backLabel: string;
  nextLabel: string;
  isNextDisabled: boolean;
  onBack: () => void;
  onNext: () => void;
  refreshButton: ReactNode;
  languageToggle: ReactNode;
};

export function InputsDesktopHeader({
  title,
  inputStep,
  backLabel,
  nextLabel,
  isNextDisabled,
  onBack,
  onNext,
  refreshButton,
  languageToggle,
}: InputsDesktopHeaderProps) {
  return (
    <div className="hidden md:flex md:items-center md:justify-between md:text-xs md:font-semibold">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {inputStep === 2 && (
          <button
            type="button"
            className="inline-flex rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
            onClick={onBack}
          >
            {backLabel}
          </button>
        )}
        <button
          type="button"
          disabled={isNextDisabled}
          className={[
            "inline-flex rounded-full px-4 py-1 text-xs font-semibold transition",
            isNextDisabled
              ? "border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
              : "bg-[var(--brand-primary)] text-white",
          ].join(" ")}
          onClick={onNext}
        >
          {nextLabel}
        </button>
        <div className="hidden md:block">{refreshButton}</div>
        <div className="hidden md:block">{languageToggle}</div>
      </div>
    </div>
  );
}

type InputsTwoColumnShellProps = {
  inputsColumnRef: RefObject<HTMLDivElement | null>;
  consoleCardRef: RefObject<HTMLDivElement | null>;
  plannerConsoleTitle: string;
  leftContent: ReactNode;
  rightContent: ReactNode;
};

export function InputsTwoColumnShell({
  inputsColumnRef,
  consoleCardRef,
  plannerConsoleTitle,
  leftContent,
  rightContent,
}: InputsTwoColumnShellProps) {
  return (
    <div className="grid grid-cols-1 gap-6 items-stretch md:grid-cols-2">
      <div ref={inputsColumnRef} className="flex-1">
        {leftContent}
      </div>
      <div className="flex-1">
        <div className="h-full">
          <div
            ref={consoleCardRef}
            className="h-full rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400"
          >
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {plannerConsoleTitle}
            </h2>
            <div className="mb-4 mt-2 border-b border-zinc-200 dark:border-zinc-800" />
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
