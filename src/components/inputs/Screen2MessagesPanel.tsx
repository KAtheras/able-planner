"use client";

import type { ReactNode } from "react";
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
      {ssiBalanceCapWarningText && (
        <PlannerNoticeCard>
          <div className="mb-2 whitespace-pre-line text-sm leading-relaxed">{ssiBalanceCapWarningText}</div>
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
