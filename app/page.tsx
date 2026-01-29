"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar, { type NavKey } from "@/components/layout/Sidebar";
import SettingsMenu, {
  THEME_OPTIONS,
  type ThemeKey,
} from "@/components/layout/SettingsMenu";
import TopNav from "@/components/layout/TopNav";
import { getCopy, type SupportedLanguage } from "@/copy";

export default function Home() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [theme, setTheme] = useState<ThemeKey>("default");
  const [active, setActive] = useState<NavKey>("planner");
  const copy = getCopy(language);

  const content = useMemo(() => {
    switch (active) {
      case "planner":
        return (
          <section className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Planner (Shell)
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Next: Step inputs live in{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
                src/components/inputs/
              </code>
            </p>
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                This area will become the main input flow. (We’re only doing
                Layout A now.)
              </div>
            </div>
          </section>
        );
      case "messages":
        return (
          <section className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Messages (Shell)
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Next: message cards will live in{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
                src/components/messaging/
              </code>
            </p>
          </section>
        );
      case "reports":
        return (
          <section className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Reports (Shell)
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Next: 3 reports under{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
                src/components/reports/
              </code>
            </p>
          </section>
        );
      case "settings":
        return (
          <section className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Settings (Shell)
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Next: language + theme (default/UT/IL/TX) toggles live here.
            </p>
          </section>
        );
      default:
        return null;
    }
  }, [active]);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("language");
    if (storedLanguage === "en" || storedLanguage === "es") {
      setLanguage(storedLanguage);
    }

    const storedTheme = window.localStorage.getItem("theme") as ThemeKey | null;
    if (storedTheme && THEME_OPTIONS.includes(storedTheme)) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <TopNav
        title={copy.app?.title ?? "ABLE Planner"}
        tagline={copy.app?.tagline}
        rightSlot={
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
            {active.toUpperCase()}
          </span>
        }
        settingsSlot={
          <SettingsMenu
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            setTheme={setTheme}
          />
        }
      />

      <div className="mx-auto flex w-full max-w-6xl">
        <Sidebar active={active} onChange={setActive} />

        {/* Main content */}
        <main className="w-full px-4 py-6 md:px-8">
          {/* Mobile bottom-nav is fixed, so reserve space */}
          <div className="pb-20 md:pb-0">{content}</div>
        </main>
      </div>
    </div>
  );
}
