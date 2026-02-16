import type { TaxableYearRow, YearRow } from "@/lib/amortization";

type ScheduleLabels = {
  monthYear?: string;
  accountTotals?: string;
  contributions?: string;
  withdrawals?: string;
  investmentReturns?: string;
  accountBalance?: string;
  federalSaversCredit?: string;
  stateTaxBenefit?: string;
  federalTaxes?: string;
  stateTaxes?: string;
};

const formatNumberForCsv = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toFixed(2);
};

const csvEscape = (value: string | number) => {
  const stringValue = typeof value === "number" ? String(value) : value;
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
};

const downloadCsvFile = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
  if (typeof window === "undefined") return;
  const csvBody = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const buildAbleScheduleCsvRows = (rows: YearRow[], labels?: ScheduleLabels) => {
  const validRows = rows.filter((row) => row.year !== -1);
  const totals = validRows.reduce(
    (acc, row) => ({
      contribution: acc.contribution + (Number.isFinite(row.contribution) ? row.contribution : 0),
      withdrawal: acc.withdrawal + (Number.isFinite(row.withdrawal) ? row.withdrawal : 0),
      earnings: acc.earnings + (Number.isFinite(row.earnings) ? row.earnings : 0),
      saversCredit: acc.saversCredit + (Number.isFinite(row.saversCredit) ? row.saversCredit : 0),
      stateBenefit: acc.stateBenefit + (Number.isFinite(row.stateBenefit) ? row.stateBenefit : 0),
    }),
    { contribution: 0, withdrawal: 0, earnings: 0, saversCredit: 0, stateBenefit: 0 },
  );
  const endingBalance = validRows.length
    ? Number.isFinite(validRows[validRows.length - 1].endingBalance)
      ? validRows[validRows.length - 1].endingBalance
      : 0
    : 0;
  const csvRows: Array<Array<string | number>> = [
    [
      labels?.accountTotals ?? "",
      formatNumberForCsv(totals.contribution),
      formatNumberForCsv(totals.withdrawal),
      formatNumberForCsv(totals.earnings),
      formatNumberForCsv(endingBalance),
      formatNumberForCsv(totals.saversCredit),
      formatNumberForCsv(totals.stateBenefit),
    ],
  ];

  for (const yearRow of validRows) {
    csvRows.push([
      yearRow.yearLabel,
      formatNumberForCsv(yearRow.contribution),
      formatNumberForCsv(yearRow.withdrawal),
      formatNumberForCsv(yearRow.earnings),
      formatNumberForCsv(yearRow.endingBalance),
      formatNumberForCsv(yearRow.saversCredit),
      formatNumberForCsv(yearRow.stateBenefit),
    ]);
    for (const monthRow of yearRow.months) {
      csvRows.push([
        monthRow.monthLabel,
        formatNumberForCsv(monthRow.contribution),
        formatNumberForCsv(monthRow.withdrawal),
        formatNumberForCsv(monthRow.earnings),
        formatNumberForCsv(monthRow.endingBalance),
        formatNumberForCsv(monthRow.saversCredit),
        formatNumberForCsv(monthRow.stateBenefit),
      ]);
    }
  }

  return csvRows;
};

const buildTaxableScheduleCsvRows = (rows: TaxableYearRow[], labels?: ScheduleLabels) => {
  const validRows = rows.filter((row) => row.year !== -1);
  const totals = validRows.reduce(
    (acc, row) => ({
      contribution: acc.contribution + (Number.isFinite(row.contribution) ? row.contribution : 0),
      withdrawal: acc.withdrawal + (Number.isFinite(row.withdrawal) ? row.withdrawal : 0),
      investmentReturn: acc.investmentReturn + (Number.isFinite(row.investmentReturn) ? row.investmentReturn : 0),
      federalTaxOnEarnings:
        acc.federalTaxOnEarnings +
        (Number.isFinite(row.federalTaxOnEarnings) ? row.federalTaxOnEarnings : 0),
      stateTaxOnEarnings:
        acc.stateTaxOnEarnings + (Number.isFinite(row.stateTaxOnEarnings) ? row.stateTaxOnEarnings : 0),
    }),
    {
      contribution: 0,
      withdrawal: 0,
      investmentReturn: 0,
      federalTaxOnEarnings: 0,
      stateTaxOnEarnings: 0,
    },
  );
  const endingBalance = validRows.length
    ? Number.isFinite(validRows[validRows.length - 1].endingBalance)
      ? validRows[validRows.length - 1].endingBalance
      : 0
    : 0;
  const csvRows: Array<Array<string | number>> = [
    [
      labels?.accountTotals ?? "",
      formatNumberForCsv(totals.contribution),
      formatNumberForCsv(totals.withdrawal),
      formatNumberForCsv(totals.investmentReturn),
      formatNumberForCsv(-totals.federalTaxOnEarnings),
      formatNumberForCsv(-totals.stateTaxOnEarnings),
      formatNumberForCsv(endingBalance),
    ],
  ];

  for (const yearRow of validRows) {
    csvRows.push([
      String(yearRow.year),
      formatNumberForCsv(yearRow.contribution),
      formatNumberForCsv(yearRow.withdrawal),
      formatNumberForCsv(yearRow.investmentReturn),
      formatNumberForCsv(-yearRow.federalTaxOnEarnings),
      formatNumberForCsv(-yearRow.stateTaxOnEarnings),
      formatNumberForCsv(yearRow.endingBalance),
    ]);
    for (const monthRow of yearRow.months) {
      csvRows.push([
        monthRow.monthLabel,
        formatNumberForCsv(monthRow.contribution),
        formatNumberForCsv(monthRow.withdrawal),
        formatNumberForCsv(monthRow.investmentReturn),
        formatNumberForCsv(-monthRow.federalTaxOnEarnings),
        formatNumberForCsv(-monthRow.stateTaxOnEarnings),
        formatNumberForCsv(monthRow.endingBalance),
      ]);
    }
  }

  return csvRows;
};

export function downloadAbleScheduleCsv(rows: YearRow[], labels?: ScheduleLabels) {
  const headers = [
    labels?.monthYear ?? "",
    labels?.contributions ?? "",
    labels?.withdrawals ?? "",
    labels?.investmentReturns ?? "",
    labels?.accountBalance ?? "",
    labels?.federalSaversCredit ?? "",
    labels?.stateTaxBenefit ?? "",
  ];
  const csvRows = buildAbleScheduleCsvRows(rows, labels);
  downloadCsvFile("able-amortization-schedule.csv", headers, csvRows);
}

export function downloadTaxableScheduleCsv(rows: TaxableYearRow[], labels?: ScheduleLabels) {
  const headers = [
    labels?.monthYear ?? "",
    labels?.contributions ?? "",
    labels?.withdrawals ?? "",
    labels?.investmentReturns ?? "",
    labels?.federalTaxes ?? "",
    labels?.stateTaxes ?? "",
    labels?.accountBalance ?? "",
  ];
  const csvRows = buildTaxableScheduleCsvRows(rows, labels);
  downloadCsvFile("taxable-amortization-schedule.csv", headers, csvRows);
}
