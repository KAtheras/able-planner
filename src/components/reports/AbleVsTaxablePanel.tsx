"use client";

import { useMemo } from "react";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";
import ReportWindowToggle, { type ReportWindowOptionItem } from "@/components/reports/ReportWindowToggle";

type Labels = {
  title: string;
  metricLabel: string;
  ableLabel: string;
  taxableLabel: string;
  naLabel: string;
  rows: {
    startingBalance: string;
    contributions: string;
    withdrawals: string;
    investmentReturns: string;
    federalTaxes: string;
    stateTaxes: string;
    endingBalance: string;
    federalSaversCredit: string;
    stateTaxBenefits: string;
    totalEconomicValue: string;
    totalEconomicBenefit: string;
  };
};

type Props = {
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
  labels: Labels;
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const formatSignedCurrency = (value: number) =>
  value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value);
const formatCurrencyOrDash = (value: number, dash: string) =>
  value === 0 ? dash : formatCurrency(value);

type Totals = {
  startingBalance: number;
  contributions: number;
  withdrawals: number;
  investmentReturns: number;
  federalTaxes: number;
  stateTaxes: number;
  endingBalance: number;
  federalSaversCredit: number;
  stateTaxBenefits: number;
  totalEconomicValue: number;
  totalEconomicBenefit: number;
};

export default function AbleVsTaxablePanel({
  ableRows,
  taxableRows,
  labels,
  reportWindowLabel,
  reportWindowOptions,
}: Props) {
  const ableTotals = useMemo<Totals>(() => {
    const months = ableRows
      .filter((row) => row.year >= 0)
      .flatMap((row) => row.months)
      .sort((a, b) => a.monthIndex - b.monthIndex);

    if (!months.length) {
      return {
        startingBalance: 0,
        contributions: 0,
        withdrawals: 0,
        investmentReturns: 0,
        federalTaxes: 0,
        stateTaxes: 0,
        endingBalance: 0,
        federalSaversCredit: 0,
        stateTaxBenefits: 0,
        totalEconomicValue: 0,
        totalEconomicBenefit: 0,
      };
    }

    const first = months[0];
    const startingBalance = Math.max(
      0,
      first.endingBalance - first.earnings - first.contribution + first.withdrawal,
    );

    let contributions = 0;
    let withdrawals = 0;
    let investmentReturns = 0;
    let federalSaversCredit = 0;
    let stateTaxBenefits = 0;

    for (const month of months) {
      contributions += Number.isFinite(month.contribution) ? month.contribution : 0;
      withdrawals += Number.isFinite(month.withdrawal) ? month.withdrawal : 0;
      investmentReturns += Number.isFinite(month.earnings) ? month.earnings : 0;
      federalSaversCredit += Number.isFinite(month.saversCredit) ? month.saversCredit : 0;
      stateTaxBenefits += Number.isFinite(month.stateBenefit) ? month.stateBenefit : 0;
    }

    const endingBalance = months[months.length - 1]?.endingBalance ?? 0;
    const totalEconomicValue = endingBalance + federalSaversCredit + stateTaxBenefits;
    const totalEconomicBenefit = investmentReturns + federalSaversCredit + stateTaxBenefits;

    return {
      startingBalance,
      contributions,
      withdrawals,
      investmentReturns,
      federalTaxes: 0,
      stateTaxes: 0,
      endingBalance,
      federalSaversCredit,
      stateTaxBenefits,
      totalEconomicValue,
      totalEconomicBenefit,
    };
  }, [ableRows]);

  const taxableTotals = useMemo<Totals>(() => {
    const months = taxableRows
      .filter((row) => row.year >= 0)
      .flatMap((row) => row.months)
      .sort((a, b) => a.monthIndex - b.monthIndex);

    if (!months.length) {
      return {
        startingBalance: 0,
        contributions: 0,
        withdrawals: 0,
        investmentReturns: 0,
        federalTaxes: 0,
        stateTaxes: 0,
        endingBalance: 0,
        federalSaversCredit: 0,
        stateTaxBenefits: 0,
        totalEconomicValue: 0,
        totalEconomicBenefit: 0,
      };
    }

    const first = months[0];
    const startingBalance = Math.max(
      0,
      first.endingBalance -
        first.investmentReturn +
        first.federalTaxOnEarnings +
        first.stateTaxOnEarnings -
        first.contribution +
        first.withdrawal,
    );

    let contributions = 0;
    let withdrawals = 0;
    let investmentReturns = 0;
    let federalTaxes = 0;
    let stateTaxes = 0;

    for (const month of months) {
      contributions += Number.isFinite(month.contribution) ? month.contribution : 0;
      withdrawals += Number.isFinite(month.withdrawal) ? month.withdrawal : 0;
      investmentReturns += Number.isFinite(month.investmentReturn) ? month.investmentReturn : 0;
      federalTaxes += Number.isFinite(month.federalTaxOnEarnings) ? month.federalTaxOnEarnings : 0;
      stateTaxes += Number.isFinite(month.stateTaxOnEarnings) ? month.stateTaxOnEarnings : 0;
    }

    const endingBalance = months[months.length - 1]?.endingBalance ?? 0;
    const totalEconomicBenefit = investmentReturns - federalTaxes - stateTaxes;

    return {
      startingBalance,
      contributions,
      withdrawals,
      investmentReturns,
      federalTaxes,
      stateTaxes,
      endingBalance,
      federalSaversCredit: 0,
      stateTaxBenefits: 0,
      totalEconomicValue: 0,
      totalEconomicBenefit,
    };
  }, [taxableRows]);

  const rows = [
    {
      key: "startingBalance",
      label: labels.rows.startingBalance,
      able: formatCurrency(ableTotals.startingBalance),
      taxable: formatCurrency(taxableTotals.startingBalance),
    },
    {
      key: "contributions",
      label: labels.rows.contributions,
      able: formatCurrency(ableTotals.contributions),
      taxable: formatCurrency(taxableTotals.contributions),
    },
    {
      key: "withdrawals",
      label: labels.rows.withdrawals,
      able: formatCurrency(ableTotals.withdrawals),
      taxable: formatCurrency(taxableTotals.withdrawals),
    },
    {
      key: "investmentReturns",
      label: labels.rows.investmentReturns,
      able: formatCurrency(ableTotals.investmentReturns),
      taxable: formatCurrency(taxableTotals.investmentReturns),
    },
    {
      key: "federalTaxes",
      label: labels.rows.federalTaxes,
      able: labels.naLabel,
      taxable: formatSignedCurrency(-taxableTotals.federalTaxes),
    },
    {
      key: "stateTaxes",
      label: labels.rows.stateTaxes,
      able: labels.naLabel,
      taxable: formatSignedCurrency(-taxableTotals.stateTaxes),
    },
    {
      key: "endingBalance",
      label: labels.rows.endingBalance,
      able: formatCurrency(ableTotals.endingBalance),
      taxable: formatCurrency(taxableTotals.endingBalance),
    },
    {
      key: "federalSaversCredit",
      label: labels.rows.federalSaversCredit,
      able: formatCurrencyOrDash(ableTotals.federalSaversCredit, labels.naLabel),
      taxable: labels.naLabel,
    },
    {
      key: "stateTaxBenefits",
      label: labels.rows.stateTaxBenefits,
      able: formatCurrencyOrDash(ableTotals.stateTaxBenefits, labels.naLabel),
      taxable: labels.naLabel,
    },
    {
      key: "totalEconomicValue",
      label: labels.rows.totalEconomicValue,
      able: formatCurrency(ableTotals.totalEconomicValue),
      taxable: formatCurrency(taxableTotals.endingBalance),
    },
    {
      key: "totalEconomicBenefit",
      label: labels.rows.totalEconomicBenefit,
      able: formatCurrencyOrDash(ableTotals.totalEconomicBenefit, labels.naLabel),
      taxable: formatSignedCurrency(taxableTotals.totalEconomicBenefit),
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{labels.title}</h2>
        <div className="ml-auto">
          <ReportWindowToggle label={reportWindowLabel} options={reportWindowOptions} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-2 py-2 font-semibold">{labels.metricLabel}</th>
              <th className="px-2 py-2 text-right font-semibold">{labels.ableLabel}</th>
              <th className="px-2 py-2 text-right font-semibold">{labels.taxableLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.key}
                className={index % 2 === 0 ? "bg-zinc-50/60 dark:bg-zinc-900/40" : ""}
              >
                <td className="px-2 py-2 text-zinc-700 dark:text-zinc-200">{row.label}</td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {row.able}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {row.taxable}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
