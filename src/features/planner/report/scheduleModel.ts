import type { YearRow } from "@/lib/amortization";

type EnrichScheduleRowsParams = {
  rows: YearRow[];
  showFederalSaverCredit: boolean;
  fscContributionLimit: number;
  fscCreditPercent: number;
  getFederalTaxLiability: () => number;
  getStateBenefitForYear: (contributionsForYear: number) => number;
};

export function enrichScheduleRowsWithBenefits({
  rows,
  showFederalSaverCredit,
  fscContributionLimit,
  fscCreditPercent,
  getFederalTaxLiability,
  getStateBenefitForYear,
}: EnrichScheduleRowsParams): YearRow[] {
  return rows.map((yearRow) => {
    const contributionsForYear = Math.max(0, yearRow.contribution);
    const federalTaxLiability = showFederalSaverCredit ? getFederalTaxLiability() : 0;
    const federalCreditRaw = showFederalSaverCredit
      ? Math.min(contributionsForYear, fscContributionLimit) * fscCreditPercent
      : 0;
    const federalCredit = showFederalSaverCredit
      ? Math.min(federalCreditRaw, federalTaxLiability)
      : 0;

    const stateBenefitAmount = getStateBenefitForYear(contributionsForYear);
    const months = yearRow.months.map((monthRow) => {
      const monthNumber = (monthRow.monthIndex % 12) + 1;
      const isDecember = monthNumber === 12;
      return {
        ...monthRow,
        saversCredit: isDecember ? federalCredit : 0,
        stateBenefit: isDecember ? stateBenefitAmount : 0,
      };
    });

    return {
      ...yearRow,
      saversCredit: federalCredit,
      stateBenefit: stateBenefitAmount,
      months,
    };
  });
}
