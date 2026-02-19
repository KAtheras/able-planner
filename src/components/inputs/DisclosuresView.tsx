"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  items: string[];
  overrideText: string;
  languageToggle: ReactNode;
};

export default function DisclosuresView({
  title,
  items,
  overrideText,
  languageToggle,
}: Props) {
  const overrideItems = overrideText
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const bulletItems = overrideItems.length > 0 ? overrideItems : items;

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold uppercase text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <div>{languageToggle}</div>
      </div>
      <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 md:max-h-[calc(100vh-13rem)]">
          {bulletItems.length > 0 && (
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              {bulletItems.map((item, index) => (
                <li
                  key={`assumption-${index}-${item.slice(0, 24)}`}
                  className="flex items-start gap-2 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 dark:bg-zinc-400"
                  />
                  <span className="whitespace-pre-line leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
