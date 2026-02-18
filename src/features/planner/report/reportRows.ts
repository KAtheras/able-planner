import type { TaxableYearRow, YearRow } from "@/lib/amortization";

const finiteOrZero = (value: number) => (Number.isFinite(value) ? value : 0);

export function getAbleMonthlyForDisplay(rows: YearRow[]) {
  return rows
    .filter((row) => row.year >= 0)
    .flatMap((row) => row.months)
    .sort((a, b) => a.monthIndex - b.monthIndex);
}

export function getTaxableMonthlyForDisplay(rows: TaxableYearRow[]) {
  return rows
    .filter((row) => row.year >= 0)
    .flatMap((row) => row.months)
    .sort((a, b) => a.monthIndex - b.monthIndex);
}

export function buildReportAbleRows(rows: YearRow[], reportWindowEndIndex: number): YearRow[] {
  return rows
    .filter((row) => row.year >= 0)
    .map((row) => {
      const months = row.months.filter((month) => month.monthIndex <= reportWindowEndIndex);
      if (!months.length) return null;

      let contribution = 0;
      let withdrawal = 0;
      let earnings = 0;
      let fedTax = 0;
      let stateTax = 0;
      let saversCredit = 0;
      let stateBenefit = 0;

      for (const month of months) {
        contribution += finiteOrZero(month.contribution);
        withdrawal += finiteOrZero(month.withdrawal);
        earnings += finiteOrZero(month.earnings);
        fedTax += finiteOrZero(month.fedTax);
        stateTax += finiteOrZero(month.stateTax);
        saversCredit += finiteOrZero(month.saversCredit);
        stateBenefit += finiteOrZero(month.stateBenefit);
      }

      return {
        ...row,
        months,
        contribution,
        withdrawal,
        earnings,
        fedTax,
        stateTax,
        saversCredit,
        stateBenefit,
        endingBalance: months[months.length - 1]?.endingBalance ?? row.endingBalance,
      };
    })
    .filter((row): row is YearRow => Boolean(row));
}

export function buildReportTaxableRows(
  rows: TaxableYearRow[],
  reportWindowEndIndex: number,
): TaxableYearRow[] {
  return rows
    .filter((row) => row.year >= 0)
    .map((row) => {
      const months = row.months.filter((month) => month.monthIndex <= reportWindowEndIndex);
      if (!months.length) return null;

      let contribution = 0;
      let withdrawal = 0;
      let investmentReturn = 0;
      let federalTaxOnEarnings = 0;
      let stateTaxOnEarnings = 0;

      for (const month of months) {
        contribution += finiteOrZero(month.contribution);
        withdrawal += finiteOrZero(month.withdrawal);
        investmentReturn += finiteOrZero(month.investmentReturn);
        federalTaxOnEarnings += finiteOrZero(month.federalTaxOnEarnings);
        stateTaxOnEarnings += finiteOrZero(month.stateTaxOnEarnings);
      }

      return {
        ...row,
        months,
        contribution,
        withdrawal,
        investmentReturn,
        federalTaxOnEarnings,
        stateTaxOnEarnings,
        endingBalance: months[months.length - 1]?.endingBalance ?? row.endingBalance,
      };
    })
    .filter((row): row is TaxableYearRow => Boolean(row));
}
