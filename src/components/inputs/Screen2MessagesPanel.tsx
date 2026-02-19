"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import PlannerNoticeCard from "@/components/inputs/PlannerNoticeCard";

type Props = {
  accountEndingNode: ReactNode;
  depletionNoticeNode: ReactNode;
  showStandaloneWithdrawalLimitedMessage: boolean;
  withdrawalLimitedText: string;
  planMaxNoticeText: string | null;
  ssiBalanceCapWarningText: string | null;
  screen2Messages: string[];
};

export default function Screen2MessagesPanel({
  accountEndingNode,
  depletionNoticeNode,
  showStandaloneWithdrawalLimitedMessage,
  withdrawalLimitedText,
  planMaxNoticeText,
  ssiBalanceCapWarningText,
  screen2Messages,
}: Props) {
  const ssiWarningCardRef = useRef<HTMLDivElement | null>(null);
  const [dismissedSsiWarningKey, setDismissedSsiWarningKey] = useState<string | null>(null);
  const activeSsiWarningKey = ssiBalanceCapWarningText ?? null;
  const ssiWarningDismissed =
    Boolean(activeSsiWarningKey) && activeSsiWarningKey === dismissedSsiWarningKey;

  useEffect(() => {
    if (!ssiBalanceCapWarningText || ssiWarningDismissed || typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    window.setTimeout(() => {
      const card = ssiWarningCardRef.current;
      if (!card) return;
      const topNav = document.querySelector("header");
      const topNavHeight = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height : 0;
      const inputHeader = document.querySelector("[data-mobile-input-header='true']");
      const inputHeaderHeight =
        inputHeader instanceof HTMLElement ? inputHeader.getBoundingClientRect().height : 0;
      const targetTop = card.getBoundingClientRect().top + window.scrollY - topNavHeight - inputHeaderHeight - 8;
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "smooth" });
    }, 0);
  }, [ssiBalanceCapWarningText, ssiWarningDismissed]);

  const handleDismissSsiWarning = () => {
    if (activeSsiWarningKey) setDismissedSsiWarningKey(activeSsiWarningKey);
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    window.setTimeout(() => {
      const inputsHeader = document.querySelector("[data-mobile-input-header='true']");
      if (inputsHeader instanceof HTMLElement) {
        const topNav = document.querySelector("header");
        const topNavHeight = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height : 0;
        const targetTop = inputsHeader.getBoundingClientRect().top + window.scrollY - topNavHeight - 8;
        window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "smooth" });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }, 0);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {accountEndingNode}
      {depletionNoticeNode}
      {showStandaloneWithdrawalLimitedMessage && (
        <PlannerNoticeCard>
          <p className="text-sm leading-relaxed">{withdrawalLimitedText}</p>
        </PlannerNoticeCard>
      )}
      {planMaxNoticeText && (
        <PlannerNoticeCard>
          <p className="text-sm leading-relaxed">{planMaxNoticeText}</p>
        </PlannerNoticeCard>
      )}
      {ssiBalanceCapWarningText && !ssiWarningDismissed && (
        <PlannerNoticeCard>
          <div ref={ssiWarningCardRef} />
          <div className="mb-2 whitespace-pre-line text-sm leading-relaxed">{ssiBalanceCapWarningText}</div>
          <button
            type="button"
            className="mt-1 w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
            onClick={handleDismissSsiWarning}
          >
            OK
          </button>
        </PlannerNoticeCard>
      )}
      {screen2Messages.map((message, index) => (
        <p
          key={`${message}-${index}`}
          className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
        >
          {message}
        </p>
      ))}
    </div>
  );
}
