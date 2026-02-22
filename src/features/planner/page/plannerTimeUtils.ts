export const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const parseIntegerInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return Math.round(num);
};

export const getStartMonthIndex = () => {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth() + 1;
};

export const monthIndexToParts = (index: number) => ({
  year: Math.floor(index / 12),
  month: (index % 12) + 1,
});

export const parseMonthYearToIndex = (yearStr: string, monthStr: string): number | null => {
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    year <= 0 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return year * 12 + (month - 1);
};

export const getYearOptions = (minIndex: number, maxIndex: number) => {
  const minYear = Math.floor(minIndex / 12);
  const maxYear = Math.floor(maxIndex / 12);
  return Array.from({ length: maxYear - minYear + 1 }, (_, idx) =>
    String(minYear + idx),
  );
};
