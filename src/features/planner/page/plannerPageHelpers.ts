import federalSaversCreditBrackets from "@/config/rules/federalSaversCreditBrackets.json";

export type FilingStatusOption = "single" | "married_joint" | "married_separate" | "head_of_household";

type FederalSaverBracketEntry = (typeof federalSaversCreditBrackets)[number];

export function resolveDefaultMessages(
  override: string,
  fallback: string[] | undefined,
  defaultMessages: string[],
): string[] {
  if (override) {
    return override
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [...(fallback ?? defaultMessages)];
}

export function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getFederalSaverCreditPercent(status: FilingStatusOption, agi: number) {
  for (const bracket of federalSaversCreditBrackets as FederalSaverBracketEntry[]) {
    const info = bracket.brackets[status];
    if (!info) continue;
    if (info.type === "max" && agi <= info.value!) return bracket.creditRate;
    if (info.type === "range" && agi >= info.min! && agi <= info.max!) return bracket.creditRate;
    if (info.type === "min" && agi > info.value!) return bracket.creditRate;
  }
  return 0;
}
