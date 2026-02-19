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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const ssiWarningCardRef = useRef<HTMLDivElement | null>(null);
  const [dismissedSsiWarningKey, setDismissedSsiWarningKey] = useState<string | null>(null);
  const activeSsiWarningKey = ssiBalanceCapWarningText ?? null;
  const ssiWarningDismissed =
    Boolean(activeSsiWarningKey) && activeSsiWarningKey === dismissedSsiWarningKey;
  const shouldShowSsiWarning = Boolean(ssiBalanceCapWarningText) && !ssiWarningDismissed;

  const getMobileScrollOffset = () => {
    if (typeof window === "undefined") return 0;
    const topNav = document.querySelector("header");
    const topNavHeight = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height : 0;
    const inputHeader = document.querySelector("[data-mobile-input-header='true']");
    const inputHeaderHeight =
      inputHeader instanceof HTMLElement ? inputHeader.getBoundingClientRect().height : 0;
    return topNavHeight + inputHeaderHeight + 8;
  };

  const canScrollPanel = () => {
    const panel = panelRef.current;
    return Boolean(panel && panel.scrollHeight > panel.clientHeight + 1);
  };

  useEffect(() => {
    if (!shouldShowSsiWarning || typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    window.setTimeout(() => {
      const panel = panelRef.current;
      const card = ssiWarningCardRef.current;
      if (!card) return;

      if (panel && canScrollPanel()) {
        panel.scrollTo({ top: Math.max(0, card.offsetTop - 8), behavior: "smooth" });
        return;
      }

      const targetTop = card.getBoundingClientRect().top + window.scrollY - getMobileScrollOffset();
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "smooth" });
    }, 0);
  }, [shouldShowSsiWarning]);

  const handleDismissSsiWarning = () => {
    if (activeSsiWarningKey) setDismissedSsiWarningKey(activeSsiWarningKey);
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && canScrollPanel()) {
        panel.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const inputsHeader = document.querySelector("[data-mobile-input-header='true']");
      if (inputsHeader instanceof HTMLElement) {
        const targetTop =
          inputsHeader.getBoundingClientRect().top + window.scrollY - getMobileScrollOffset();
        window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "smooth" });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }, 0);
  };

  return (
    <div ref={panelRef} className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
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
