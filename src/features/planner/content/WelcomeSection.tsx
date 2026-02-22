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
  hideTopNav?: boolean;
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

type TermsBlock =
  | { type: "paragraph"; text: string }
  | { type: "section"; header: string; body: string };

function buildTermsBlocks(termsOfUseParagraphs: string[]): TermsBlock[] {
  const fullText = termsOfUseParagraphs.join("\n\n");
  const headingPrefixes = [
    "Spectra Professional Services, LLC. Terms of Use",
    "Términos de Uso de Spectra Professional Services, LLC.",
  ];
  const matchingPrefix = headingPrefixes.find((prefix) => fullText.startsWith(prefix));
  const text = matchingPrefix ? fullText.slice(matchingPrefix.length).trimStart() : fullText;
  const lines = text.split("\n");
  const blocks: TermsBlock[] = [];
  const numberedHeaderPattern = /^\d+\.\s+/;
  const electronicAcceptancePattern = /^(Electronic Acceptance|Aceptación electrónica)\b/i;

  let paragraphLines: string[] = [];
  let activeSection: { header: string; bodyLines: string[] } | null = null;
  let electronicAcceptanceLines: string[] = [];
  let inElectronicAcceptance = false;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const paragraph = paragraphLines.join(" ").replace(/\s+/g, " ").trim();
    if (paragraph) blocks.push({ type: "paragraph", text: paragraph });
    paragraphLines = [];
  };

  const flushSection = () => {
    if (!activeSection) return;
    const body = activeSection.bodyLines.join(" ").replace(/\s+/g, " ").trim();
    blocks.push({ type: "section", header: activeSection.header, body });
    activeSection = null;
  };

  const flushElectronicAcceptance = () => {
    if (!electronicAcceptanceLines.length) return;
    const full = electronicAcceptanceLines.join(" ").replace(/\s+/g, " ").trim();
    if (full) {
      const isSpanish = full.startsWith("Aceptación electrónica");
      const prefix = isSpanish ? "Aceptación electrónica" : "Electronic Acceptance";
      const body = full.startsWith(prefix) ? full.slice(prefix.length).trim() : full;
      blocks.push({
        type: "section",
        header: isSpanish ? "22. Aceptación electrónica" : "22. Electronic Acceptance",
        body,
      });
    }
    electronicAcceptanceLines = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (electronicAcceptancePattern.test(trimmed)) {
      flushParagraph();
      flushSection();
      inElectronicAcceptance = true;
      electronicAcceptanceLines.push(trimmed);
      continue;
    }

    if (inElectronicAcceptance) {
      if (trimmed) {
        electronicAcceptanceLines.push(trimmed);
      }
      continue;
    }

    if (numberedHeaderPattern.test(trimmed)) {
      flushParagraph();
      flushSection();
      activeSection = { header: trimmed, bodyLines: [] };
      continue;
    }

    if (activeSection) {
      if (trimmed) activeSection.bodyLines.push(trimmed);
      continue;
    }

    if (trimmed) {
      paragraphLines.push(trimmed);
    } else {
      flushParagraph();
    }
  }

  flushParagraph();
  flushSection();
  flushElectronicAcceptance();
  return blocks;
}

export default function WelcomeSection({
  appTitle,
  appTagline,
  planSelector,
  hideTopNav = false,
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
  const termsBlocks = buildTermsBlocks(termsOfUseParagraphs);
  const mainClassName = hideTopNav
    ? "w-full flex-1 px-0 pt-0"
    : "mx-auto w-full max-w-6xl flex-1 px-4 pt-1.5";
  const contentInnerClassName = hideTopNav ? "px-3 pb-4 md:px-4" : "";
  const headingOffsetClassName = hideTopNav ? "mt-2" : "mt-4";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {!hideTopNav ? (
        <>
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
        </>
      ) : null}

      <main className={mainClassName}>
        <div className={contentInnerClassName}>
          <div className="flex justify-center">{languageToggle}</div>
          <div className={headingOffsetClassName} />
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
                      className="flex w-full max-w-xl items-start gap-2 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 dark:bg-zinc-400"
                      />
                      <span className="leading-relaxed">{bullet}</span>
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
                    className="font-semibold text-zinc-800 underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] dark:text-zinc-100 dark:hover:text-white"
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
                  {termsBlocks.map((block, index) =>
                    block.type === "section" ? (
                      <div key={`terms-section-${index}`} className="space-y-1">
                        {(() => {
                          const match = block.header.match(/^(\d+\.)\s+(.*)$/);
                          const sectionNumber = match?.[1] ?? "";
                          const sectionTitle = match?.[2] ?? block.header;
                          return (
                            <div className="grid grid-cols-[2.5ch_1fr] gap-x-2">
                              <strong className="text-right font-semibold tabular-nums text-[var(--brand-primary)]">
                                {sectionNumber}
                              </strong>
                              <strong className="font-semibold text-[var(--brand-primary)]">{sectionTitle}</strong>
                              {block.body ? <p className="col-start-2">{block.body}</p> : null}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p key={`terms-paragraph-${index}`}>{block.text}</p>
                    ),
                  )}
                </div>
              </section>
            )}
          </div>
          <div className="mt-4" />
          </div>
        </div>
      </main>
      {!hideTopNav ? (
        <footer className="px-4 pb-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          © 2026 Spectra Professional Services, LLC. All rights reserved.
        </footer>
      ) : null}
    </div>
  );
}
