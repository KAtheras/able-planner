"use client";

type Props = {
  planResidencyRequired: boolean;
  residencyNotAllowedText: string;
  residencyGeneralAdviceText: string;
  changeResidencyLabel: string;
  understandProceedLabel: string;
  onChangeResidencyToPlan: () => void;
  onAcknowledgeNonResident: () => void;
};

export default function ResidencyWarningCard({
  planResidencyRequired,
  residencyNotAllowedText,
  residencyGeneralAdviceText,
  changeResidencyLabel,
  understandProceedLabel,
  onChangeResidencyToPlan,
  onAcknowledgeNonResident,
}: Props) {
  const primaryButtonClass =
    "w-full rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap";
  const secondaryButtonClass =
    "w-full rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 whitespace-nowrap hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900";
  const buttonContainerClass = "mt-4 flex flex-col gap-3";

  if (planResidencyRequired) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {`${residencyNotAllowedText} ${residencyGeneralAdviceText}`.trim()}
        </p>
        <div className={buttonContainerClass}>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={onChangeResidencyToPlan}
          >
            {changeResidencyLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {residencyGeneralAdviceText}
      </p>
      <div className={buttonContainerClass}>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={onAcknowledgeNonResident}
        >
          {understandProceedLabel}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={onChangeResidencyToPlan}
        >
          {changeResidencyLabel}
        </button>
      </div>
    </div>
  );
}
