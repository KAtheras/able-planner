import federalTaxBrackets from "@/config/rules/federalTaxBrackets.json";
import stateTaxDeductions from "@/config/rules/stateTaxDeductions.json";
import stateTaxRates from "@/config/rules/stateTaxRates.json";

export type FilingStatusOption =
  | "single"
  | "married_joint"
  | "married_separate"
  | "head_of_household";

type TaxBracket = { min: number; max?: number; rate: number };
type TaxBracketInput = { min?: number; max?: number; rate?: number };
type TaxBracketMap = Record<string, TaxBracketInput[]>;
type StateTaxBracketMap = Record<string, TaxBracketMap>;

type StateTaxBenefitType = "none" | "deduction" | "credit";

export type StateTaxBenefitConfig = {
  type: StateTaxBenefitType;
  amount: number;
  creditPercent: number;
};

type StateTaxDeductionEntry = {
  name: string;
  benefits: Record<string, StateTaxBenefitConfig>;
};

function clampMoney(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

function computeProgressiveTax(income: number, brackets: TaxBracket[]): number {
  const y = clampMoney(income);
  if (y <= 0) return 0;

  const sorted = (Array.isArray(brackets) ? brackets : [])
    .filter((b) => b && Number.isFinite(b.min) && Number.isFinite(b.rate))
    .map((b) => ({
      min: Number(b.min),
      max: typeof b.max === "number" && Number.isFinite(b.max) ? Number(b.max) : undefined,
      rate: Number(b.rate),
    }))
    .sort((a, b) => a.min - b.min);

  let tax = 0;
  for (const b of sorted) {
    const minEff = b.min > 0 ? b.min - 1 : 0;
    const upper = b.max === undefined ? y : Math.min(y, b.max);
    const taxable = Math.max(0, upper - minEff);
    if (taxable <= 0) continue;
    tax += taxable * Math.max(0, b.rate);
    if (b.max !== undefined && y <= b.max) break;
  }

  return clampMoney(tax);
}

export function getFederalIncomeTaxLiability(filingStatus: FilingStatusOption, agi: number): number {
  const key = filingStatus as keyof typeof federalTaxBrackets;
  const rows = (federalTaxBrackets as TaxBracketMap)[key] ?? [];
  const brackets: TaxBracket[] = rows.map((r) => ({
    min: Number(r.min ?? 0),
    max: typeof r.max === "number" && Number.isFinite(r.max) ? Number(r.max) : undefined,
    rate: Number(r.rate ?? 0),
  }));
  return computeProgressiveTax(agi, brackets);
}

function getStateIncomeTaxLiability(stateCode: string, filingStatus: FilingStatusOption, agi: number): number {
  const st = (stateCode || "").toUpperCase();
  const byState = (stateTaxRates as StateTaxBracketMap)[st];
  const rows = byState?.[filingStatus] ?? [];
  const brackets: TaxBracket[] = rows.map((r) => ({
    min: Number(r.min ?? 0),
    max: typeof r.max === "number" && Number.isFinite(r.max) ? Number(r.max) : undefined,
    rate: Number(r.rate ?? 0),
  }));
  return computeProgressiveTax(agi, brackets);
}

export function getStateTaxBenefitConfig(
  stateCode: string,
  filingStatus: FilingStatusOption,
): StateTaxBenefitConfig | null {
  const entries = stateTaxDeductions as Record<string, StateTaxDeductionEntry>;
  const entry = entries[stateCode];
  if (!entry) return null;
  return entry.benefits[filingStatus] ?? entry.benefits.single ?? null;
}

export function computeStateBenefitCapped(
  benefit: StateTaxBenefitConfig | null,
  contributionsForYear: number,
  agi: number,
  filingStatus: FilingStatusOption,
  stateCode: string,
): number {
  const contrib = clampMoney(contributionsForYear);
  const income = clampMoney(agi);
  const st = (stateCode || "").toUpperCase();
  if (!benefit) return 0;

  const type = benefit.type;
  const amount = clampMoney(benefit.amount ?? 0);
  const creditPercent = clampMoney(benefit.creditPercent ?? 0);
  if (type === "none") return 0;

  const taxBefore = getStateIncomeTaxLiability(st, filingStatus, income);
  if (taxBefore <= 0) return 0;

  if (type === "credit") {
    const qualifying = amount > 0 ? Math.min(contrib, amount) : contrib;
    const rawCredit = qualifying * creditPercent;
    return Math.max(0, Math.min(taxBefore, rawCredit));
  }

  const deductibleBase = amount > 0 ? Math.min(contrib, amount, income) : 0;
  if (deductibleBase <= 0) return 0;

  const taxAfter = getStateIncomeTaxLiability(st, filingStatus, Math.max(0, income - deductibleBase));
  const savings = Math.max(0, taxBefore - taxAfter);
  return Math.max(0, Math.min(taxBefore, savings));
}
