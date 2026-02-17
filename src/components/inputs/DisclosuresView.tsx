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
  return (
    <div className="space-y-3">
      <div className="flex justify-end">{languageToggle}</div>
      <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
        <h1 className="text-lg font-semibold uppercase text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {overrideText && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {overrideText}
          </p>
        )}
        {!overrideText && items.length > 0 && (
          <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            {items.map((item, index) => (
              <li
                key={`assumption-${index}`}
                className="list-disc pl-5 text-left text-sm text-zinc-600 dark:text-zinc-400"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
