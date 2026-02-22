import type { SupportedLanguage } from "@/copy";

type PlannerReportActionsProps = {
  language: SupportedLanguage;
  enrollmentPageUrl: string;
  onOpenEnrollmentPage: () => void;
  onPrintReport: () => void;
};

export default function PlannerReportActions({
  language,
  enrollmentPageUrl,
  onOpenEnrollmentPage,
  onPrintReport,
}: PlannerReportActionsProps) {
  const isSpanish = language === "es";

  return (
    <>
      <button
        type="button"
        onClick={onOpenEnrollmentPage}
        disabled={!enrollmentPageUrl}
        className={[
          "inline-flex h-8 items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold md:px-3 md:text-xs",
          enrollmentPageUrl
            ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            : "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-500",
        ].join(" ")}
        title={
          enrollmentPageUrl
            ? isSpanish
              ? "Abrir inscripción"
              : "Open enrollment"
            : isSpanish
              ? "URL de inscripción no configurada"
              : "Enrollment URL not configured"
        }
        aria-label={isSpanish ? "Inscribirse" : "Enroll"}
      >
        <span>{isSpanish ? "Inscribirse" : "Enroll"}</span>
      </button>
      <button
        type="button"
        onClick={onPrintReport}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        title={isSpanish ? "Imprimir / PDF" : "Print / PDF"}
        aria-label={isSpanish ? "Imprimir / PDF" : "Print / PDF"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M7 3a1 1 0 0 0-1 1v3h2V5h8v2h2V4a1 1 0 0 0-1-1H7Zm-2 6a3 3 0 0 0-3 3v5h4v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3h4v-5a3 3 0 0 0-3-3H5Zm3 8h8v2H8v-2Zm-2-2v-4h12v4H6Zm12-2h2v2h-2v-2Z" />
        </svg>
      </button>
    </>
  );
}
