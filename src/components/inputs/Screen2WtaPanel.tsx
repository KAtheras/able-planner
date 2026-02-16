"use client";

import type { ReactNode } from "react";

type WtaMode = "idle" | "initialPrompt" | "wtaQuestion" | "noPath" | "combinedLimit";
type WtaStatus = "unknown" | "ineligible" | "eligible";

type Props = {
  wtaMode: WtaMode;
  wtaDismissed: boolean;
  wtaStatus: WtaStatus;
  wtaHasEarnedIncome: boolean | null;
  wtaEarnedIncome: string;
  wtaRetirementPlan: boolean | null;
  wtaAdditionalAllowed: number;
  wtaCombinedLimit: number;
  baseAnnualLimit: number;
  accountEndingNode: ReactNode;
  depletionNoticeNode: ReactNode;
  renderDefaultPanel: () => ReactNode;
  workToAblePromptText: string;
  yesLabel: string;
  noLabel: string;
  earnedIncomeQuestionLabel: string;
  earnedIncomeInputLabel: string;
  retirementPlanQuestionLabel: string;
  wtaNotEligibleText: string;
  wtaAutoAppliedAdjustedLine: string;
  wtaAutoAppliedMonthlyCapHint: string;
  wtaEligibleOverCombinedLine1: string;
  onStartWta: () => void;
  onOverLimitNo: () => void;
  onEarnedIncomeAnswer: (value: boolean) => void;
  onEarnedIncomeChange: (value: string) => void;
  onEvaluateWta: (hasRetirementPlan: boolean) => void;
  onDismiss: () => void;
  deriveMonthlyCaps: (limit: number) => { currentYearMaxMonthly: number; futureYearMaxMonthly: number };
  formatMonthlyLabel: (value: number) => string;
  formatCurrency: (value: number) => string;
};

export default function Screen2WtaPanel({
  wtaMode,
  wtaDismissed,
  wtaStatus,
  wtaHasEarnedIncome,
  wtaEarnedIncome,
  wtaRetirementPlan,
  wtaAdditionalAllowed,
  wtaCombinedLimit,
  baseAnnualLimit,
  accountEndingNode,
  depletionNoticeNode,
  renderDefaultPanel,
  workToAblePromptText,
  yesLabel,
  noLabel,
  earnedIncomeQuestionLabel,
  earnedIncomeInputLabel,
  retirementPlanQuestionLabel,
  wtaNotEligibleText,
  wtaAutoAppliedAdjustedLine,
  wtaAutoAppliedMonthlyCapHint,
  wtaEligibleOverCombinedLine1,
  onStartWta,
  onOverLimitNo,
  onEarnedIncomeAnswer,
  onEarnedIncomeChange,
  onEvaluateWta,
  onDismiss,
  deriveMonthlyCaps,
  formatMonthlyLabel,
  formatCurrency,
}: Props) {
  const buttonBase = "flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition";

  if (wtaMode === "initialPrompt") {
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        {accountEndingNode}
        {depletionNoticeNode}
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{workToAblePromptText}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={[buttonBase, "border-transparent bg-[var(--brand-primary)] text-white"].join(" ")}
            onClick={onStartWta}
          >
            {yesLabel}
          </button>
          <button
            type="button"
            className={[
              buttonBase,
              "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-white dark:text-zinc-700",
            ].join(" ")}
            onClick={onOverLimitNo}
          >
            {noLabel}
          </button>
        </div>
      </div>
    );
  }

  if (wtaMode === "wtaQuestion") {
    const earnedIncomeValue = Number(wtaEarnedIncome);
    const showStep3 = earnedIncomeValue > 0;
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        {accountEndingNode}
        {depletionNoticeNode}
        <div className="space-y-3 rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,white)] p-4 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_20%,black)]">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {earnedIncomeQuestionLabel}
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className={[
                  buttonBase,
                  wtaHasEarnedIncome === true
                    ? "border-transparent bg-[var(--brand-primary)] text-white"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-white dark:text-zinc-700",
                ].join(" ")}
                onClick={() => onEarnedIncomeAnswer(true)}
              >
                {yesLabel}
              </button>
              <button
                type="button"
                className={[
                  buttonBase,
                  wtaHasEarnedIncome === false
                    ? "border-transparent bg-[var(--brand-primary)] text-white"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-white dark:text-zinc-700",
                ].join(" ")}
                onClick={() => onEarnedIncomeAnswer(false)}
              >
                {noLabel}
              </button>
            </div>
          </div>
          {wtaHasEarnedIncome === true && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {earnedIncomeInputLabel}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={wtaEarnedIncome}
                onChange={(e) => onEarnedIncomeChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] focus-visible:ring-inset md:text-sm dark:border-zinc-700 dark:bg-white dark:text-zinc-900"
              />
            </div>
          )}
          {showStep3 && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {retirementPlanQuestionLabel}
              </label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  className={[
                    buttonBase,
                    wtaRetirementPlan === true
                      ? "border-transparent bg-[var(--brand-primary)] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-white dark:text-zinc-700",
                  ].join(" ")}
                  onClick={() => onEvaluateWta(true)}
                >
                  {yesLabel}
                </button>
                <button
                  type="button"
                  className={[
                    buttonBase,
                    wtaRetirementPlan === false
                      ? "border-transparent bg-[var(--brand-primary)] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-white dark:text-zinc-700",
                  ].join(" ")}
                  onClick={() => onEvaluateWta(false)}
                >
                  {noLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const showWtaPanel = !wtaDismissed && (wtaMode === "noPath" || wtaMode === "combinedLimit");
  if (!showWtaPanel) {
    return <>{renderDefaultPanel()}</>;
  }

  if (wtaStatus === "ineligible" && !wtaDismissed) {
    const baseLimitCaps = deriveMonthlyCaps(baseAnnualLimit);
    const current = formatMonthlyLabel(baseLimitCaps.currentYearMaxMonthly);
    const future = formatMonthlyLabel(baseLimitCaps.futureYearMaxMonthly);
    const part3 = wtaAutoAppliedMonthlyCapHint
      ? wtaAutoAppliedMonthlyCapHint.replace("{{current}}", current).replace("{{future}}", future)
      : "";
    const body = [wtaNotEligibleText.trim(), wtaAutoAppliedAdjustedLine, part3].filter(Boolean).join("\n\n");
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        {accountEndingNode}
        {depletionNoticeNode}
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
        <button
          type="button"
          className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
          onClick={onDismiss}
        >
          OK
        </button>
      </div>
    );
  }

  if (wtaStatus === "eligible" && !wtaDismissed) {
    const combinedLimitCaps = deriveMonthlyCaps(wtaCombinedLimit);
    const current = formatMonthlyLabel(combinedLimitCaps.currentYearMaxMonthly);
    const future = formatMonthlyLabel(combinedLimitCaps.futureYearMaxMonthly);
    const firstPart = wtaEligibleOverCombinedLine1
      .replace("{{additional}}", formatCurrency(wtaAdditionalAllowed).replace(".00", ""))
      .replace("{{combined}}", formatCurrency(wtaCombinedLimit).replace(".00", ""));
    const thirdPart = wtaAutoAppliedMonthlyCapHint
      ? wtaAutoAppliedMonthlyCapHint.replace("{{current}}", current).replace("{{future}}", future)
      : "";
    const body = [firstPart, wtaAutoAppliedAdjustedLine, thirdPart].filter(Boolean).join("\n\n");
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        {accountEndingNode}
        {depletionNoticeNode}
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
        <button
          type="button"
          className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
          onClick={onDismiss}
        >
          OK
        </button>
      </div>
    );
  }

  return <>{renderDefaultPanel()}</>;
}
