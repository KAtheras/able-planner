export type MonthYearLanguage = "en" | "es";

type MonthYearFormatOptions = {
  monthStyle?: "short" | "long";
  withPrefixDash?: boolean;
};

export const isDecemberMonthIndex = (monthIndex: number) => ((monthIndex % 12) + 12) % 12 === 11;

export function formatMonthYearFromIndex(
  monthIndex: number,
  language: MonthYearLanguage,
  options?: MonthYearFormatOptions,
): string {
  if (!Number.isFinite(monthIndex)) return "";
  const monthStyle = options?.monthStyle ?? "long";
  const year = Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const date = new Date(year, month, 1);
  const locale = language === "es" ? "es" : "en";
  const formatted = new Intl.DateTimeFormat(locale, {
    month: monthStyle,
    year: "numeric",
  }).format(date);
  return options?.withPrefixDash ? `– ${formatted}` : formatted;
}
