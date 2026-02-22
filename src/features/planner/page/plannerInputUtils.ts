export function sanitizeAgiInput(value: string) {
  if (value === "") return "";
  const next = value.replace(".00", "");
  if (next === "") return "";
  const numeric = Number(next);
  if (Number.isNaN(numeric)) return next;
  if (numeric < 0) return "0";
  return next;
}

export function parsePercentStringToDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return num / 100;
}

export function formatDecimalToPercentString(decimal: number): string {
  const percent = Math.round(decimal * 10000) / 100;
  return String(percent);
}

export function sanitizeAmountInput(value: string) {
  if (value === "") return "";
  const clean = value.replace(".00", "");
  const digitsAndDot = clean.replace(/[^0-9.]/g, "");
  const parts = digitsAndDot.split(".");
  if (parts.length <= 2) {
    return digitsAndDot;
  }
  return `${parts[0]}.${parts.slice(1).join("")}`;
}
