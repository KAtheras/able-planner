type ExternalLinkWarningModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  continueLabel: string;
  onCancel: () => void;
  onContinue: () => void;
};

export default function ExternalLinkWarningModal({
  isOpen,
  title,
  message,
  cancelLabel,
  continueLabel,
  onCancel,
  onContinue,
}: ExternalLinkWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-hover)]"
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
