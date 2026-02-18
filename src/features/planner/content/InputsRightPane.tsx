import type { ReactNode, RefObject } from "react";

type FscQuestionKey = "hasTaxLiability" | "isOver18" | "isStudent" | "isDependent";

type InputsRightPaneProps = {
  inputStep: number;
  showResidencyWarning: boolean;
  renderResidencyWarning: () => ReactNode;
  ssiIncomeEligibilityWarningText: string | null;
  ssiIncomeWarningDismissed: boolean;
  onDismissSsiIncomeWarning: () => void;
  annualReturnWarningText: string | null;
  ssiSelectionPlannerMessageText: string | null;
  showQuestionnaire: boolean;
  fscQuestionnaireRef: RefObject<HTMLDivElement | null>;
  fscEligibilityTitle: string;
  fscIntro: string;
  visibleQuestions: Array<{ key: FscQuestionKey; label: string }>;
  fscAnswers: Record<FscQuestionKey, boolean | null>;
  onAnswerFscQuestion: (key: FscQuestionKey, value: boolean) => void;
  yesLabel: string;
  noLabel: string;
  screen1Messages: string[];
  renderScreen2Panel: () => ReactNode;
};

export default function InputsRightPane({
  inputStep,
  showResidencyWarning,
  renderResidencyWarning,
  ssiIncomeEligibilityWarningText,
  ssiIncomeWarningDismissed,
  onDismissSsiIncomeWarning,
  annualReturnWarningText,
  ssiSelectionPlannerMessageText,
  showQuestionnaire,
  fscQuestionnaireRef,
  fscEligibilityTitle,
  fscIntro,
  visibleQuestions,
  fscAnswers,
  onAnswerFscQuestion,
  yesLabel,
  noLabel,
  screen1Messages,
  renderScreen2Panel,
}: InputsRightPaneProps) {
  if (inputStep !== 1) {
    return <>{renderScreen2Panel()}</>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {showResidencyWarning && (
        <div role="status" aria-live="polite">
          {renderResidencyWarning()}
        </div>
      )}
      {!showResidencyWarning && ssiIncomeEligibilityWarningText && !ssiIncomeWarningDismissed && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm leading-relaxed text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100"
        >
          <p>{ssiIncomeEligibilityWarningText}</p>
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
            onClick={onDismissSsiIncomeWarning}
          >
            OK
          </button>
        </div>
      )}
      {annualReturnWarningText && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm leading-relaxed text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100"
        >
          {annualReturnWarningText}
        </div>
      )}
      {ssiSelectionPlannerMessageText && (
        <div className="rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,white)] p-3 text-sm leading-relaxed text-zinc-900 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_24%,black)] dark:text-zinc-100">
          {ssiSelectionPlannerMessageText}
        </div>
      )}
      {showQuestionnaire && !showResidencyWarning && (
        <div
          ref={fscQuestionnaireRef}
          className="space-y-4 rounded-2xl border border-[var(--brand-primary)] bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,white)] p-4 dark:bg-[color:color-mix(in_srgb,var(--brand-primary)_20%,black)]"
        >
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{fscEligibilityTitle}</h2>
            <p className="text-xs text-zinc-500">{fscIntro}</p>
          </div>
          <div className="space-y-3">
            {visibleQuestions.map((question) => {
              const selectedAnswer = fscAnswers[question.key];
              const isAnswered = selectedAnswer !== null;
              return (
                <fieldset key={question.key} className="space-y-2">
                  <legend className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    {question.label}
                  </legend>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={[
                        "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition",
                        selectedAnswer === true
                          ? "border-transparent bg-[var(--brand-primary)] text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
                      ].join(" ")}
                      onClick={() => onAnswerFscQuestion(question.key, true)}
                      disabled={isAnswered}
                    >
                      {yesLabel}
                    </button>
                    <button
                      type="button"
                      className={[
                        "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition",
                        selectedAnswer === false
                          ? "border-transparent bg-[var(--brand-primary)] text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
                      ].join(" ")}
                      onClick={() => onAnswerFscQuestion(question.key, false)}
                      disabled={isAnswered}
                    >
                      {noLabel}
                    </button>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </div>
      )}
      {screen1Messages.map((message, index) => (
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
