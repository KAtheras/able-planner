export type FilingStatus = "single" | "married_joint" | "married_separate" | "head_of_household";

const clampRate = (rate: number): number => {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(0.7, Math.max(0, rate));
};

export function getFederalMarginalRateDecimal(
  filingStatus: FilingStatus,
  agi: number,
): number {
  if (!Number.isFinite(agi) || agi <= 0) {
    return 0;
  }
  // TODO: replace with actual bracket lookup (e.g., src/config/rules/federalIncomeTaxBrackets.json)
  return clampRate(0);
}

export function getStateMarginalRateDecimal(
  stateCode: string,
  filingStatus: FilingStatus,
  agi: number,
): number {
  if (!Number.isFinite(agi) || agi <= 0) {
    return 0;
  }
  // TODO: replace with actual state bracket lookup (e.g., src/config/rules/{state}TaxBrackets.json)
  return clampRate(0);
}
