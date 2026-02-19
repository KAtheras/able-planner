import type { ReactNode, RefObject } from "react";
import TopNav from "@/components/layout/TopNav";

type LandingCopy = {
  heroTitle: string;
  heroBody: string;
  heroBullets: string[];
  agreeToTermsPrefix: string;
  agreeAndContinueLabel: string;
  termsOfUseLinkLabel: string;
  termsOfUseTitle: string;
};

type WelcomeSectionProps = {
  appTitle: string;
  appTagline?: string;
  planSelector: ReactNode;
  languageToggle: ReactNode;
  landingCopy: LandingCopy;
  useLegacyLandingWelcomeOverride: boolean;
  welcomeTermsAgreed: boolean;
  showWelcomeTermsOfUse: boolean;
  onWelcomeTermsAgreedChange: (next: boolean) => void;
  onToggleWelcomeTerms: () => void;
  onWelcomeContinue: () => void;
  termsOfUseParagraphs: string[];
  welcomeTermsCardRef: RefObject<HTMLElement | null>;
};

export default function WelcomeSection({
  appTitle,
  appTagline,
  planSelector,
  languageToggle,
  landingCopy,
  useLegacyLandingWelcomeOverride,
  welcomeTermsAgreed,
  showWelcomeTermsOfUse,
  onWelcomeTermsAgreedChange,
  onToggleWelcomeTerms,
  onWelcomeContinue,
  termsOfUseParagraphs,
  welcomeTermsCardRef,
}: WelcomeSectionProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <TopNav
        title={appTitle}
        tagline={appTagline}
        rightSlot={
          <div className="flex items-center gap-2">
            {planSelector}
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
              WELCOME
            </span>
          </div>
        }
      />
      <div aria-hidden="true" className="h-20 md:hidden" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-1.5">
        <div className="flex justify-center">{languageToggle}</div>
        <div className="mt-4" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{landingCopy.heroTitle}</h1>

          <p className="mt-4 max-w-6xl mx-auto text-left text-base text-zinc-600 dark:text-zinc-400">
            {landingCopy.heroBody}
          </p>

          {!useLegacyLandingWelcomeOverride && (
            <>
              {landingCopy.heroBullets.length > 0 && (
                <ul className="mt-4 flex flex-col items-center gap-2 text-base text-zinc-600 dark:text-zinc-400">
                  {landingCopy.heroBullets.map((bullet, index) => (
                    <li
                      key={`hero-bullet-${index}`}
                      className="w-full max-w-xl list-inside list-disc text-left"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-start gap-2 text-left">
                <input
                  id="welcome-terms-consent"
                  type="checkbox"
                  checked={welcomeTermsAgreed}
                  onChange={(event) => onWelcomeTermsAgreedChange(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] dark:border-zinc-700"
                />
                <label htmlFor="welcome-terms-consent" className="text-sm text-zinc-700 dark:text-zinc-300">
                  {landingCopy.agreeToTermsPrefix || "I agree to the"}{" "}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleWelcomeTerms();
                    }}
                    aria-controls="welcome-terms-of-use-card"
                    aria-expanded={showWelcomeTermsOfUse}
                    className="font-semibold text-[var(--brand-primary)] underline underline-offset-2 hover:text-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
                  >
                    {landingCopy.termsOfUseLinkLabel || "Terms of Use"}
                  </button>
                </label>
              </div>

              <button
                type="button"
                onClick={onWelcomeContinue}
                disabled={!welcomeTermsAgreed}
                className={[
                  "rounded-full px-6 py-2 text-xs font-semibold transition",
                  welcomeTermsAgreed
                    ? "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]"
                    : "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                ].join(" ")}
              >
                {landingCopy.agreeAndContinueLabel || "Agree and Continue"}
              </button>
            </div>

            {showWelcomeTermsOfUse && (
              <section
                id="welcome-terms-of-use-card"
                ref={welcomeTermsCardRef}
                className="max-h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {landingCopy.termsOfUseTitle || landingCopy.termsOfUseLinkLabel || "Terms of Use"}
                </h2>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                  {termsOfUseParagraphs.map((paragraph, index) => {
                    const [leadIn, ...restParts] = paragraph.split("\n");
                    const rest = restParts.join("\n").trim();
                    if (!restParts.length) {
                      return (
                        <p key={`terms-of-use-${index}`} className="whitespace-pre-line">
                          {paragraph}
                        </p>
                      );
                    }
                    return (
                      <p key={`terms-of-use-${index}`} className="whitespace-pre-line">
                        <strong className="font-semibold text-[var(--brand-primary)]">{leadIn.trim()}</strong>
                        {rest ? ` ${rest}` : null}
                      </p>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          <div className="mt-4" />
        </div>
      </main>
      <footer className="px-4 pb-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        © 2026 Spectra Professional Services, LLC. All rights reserved.
      </footer>
    </div>
  );
}
