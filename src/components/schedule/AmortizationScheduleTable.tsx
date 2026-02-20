"use client";

import { Fragment, useState } from "react";
import {
  type YearRow,
  type TaxableYearRow,
} from "@/lib/amortization";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatCurrencyDisplay = (value: number | null | undefined) => {
  const finiteValue = asFiniteAmount(value ?? null);
  if (finiteValue === null || finiteValue === 0) {
    return "-";
  }
  if (finiteValue < 0) {
    return `(${formatCurrency(Math.abs(finiteValue))})`;
  }
  return formatCurrency(finiteValue);
};

type ViewMode = "able" | "taxable";

const asFiniteAmount = (value: number | undefined | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const sumFinite = (values: number[]) =>
  values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);

type Props = {
  rows: YearRow[];
  taxableRows?: TaxableYearRow[];
  view: ViewMode;
  language: "en" | "es";
  labels?: {
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
};

export default function AmortizationScheduleTable({
  rows,
  taxableRows = [],
  view,
  language,
  labels,
}: Props) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const baseAbleRows = rows.filter((row) => row.year !== -1);
  const baseTaxableRows = taxableRows.filter((row) => row.year !== -1);

  const ableTotalsRow: YearRow = {
    year: -1,
    yearLabel: "Account totals",
    contribution: sumFinite(baseAbleRows.map((row) => row.contribution)),
    withdrawal: sumFinite(baseAbleRows.map((row) => row.withdrawal)),
    earnings: sumFinite(baseAbleRows.map((row) => row.earnings)),
    fedTax: 0,
    stateTax: 0,
    saversCredit: sumFinite(baseAbleRows.map((row) => row.saversCredit)),
    stateBenefit: sumFinite(baseAbleRows.map((row) => row.stateBenefit)),
    endingBalance: asFiniteAmount(baseAbleRows.at(-1)?.endingBalance) ?? Number.NaN,
    months: [],
  };

  const taxableTotalsRow: TaxableYearRow = {
    year: -1,
    months: [],
    contribution: sumFinite(baseTaxableRows.map((row) => row.contribution)),
    withdrawal: sumFinite(baseTaxableRows.map((row) => row.withdrawal)),
    investmentReturn: sumFinite(baseTaxableRows.map((row) => row.investmentReturn)),
    federalTaxOnEarnings: sumFinite(baseTaxableRows.map((row) => row.federalTaxOnEarnings)),
    stateTaxOnEarnings: sumFinite(baseTaxableRows.map((row) => row.stateTaxOnEarnings)),
    endingBalance: asFiniteAmount(baseTaxableRows.at(-1)?.endingBalance) ?? Number.NaN,
  };

  const ableRowsWithTotals = [ableTotalsRow, ...baseAbleRows];
  const taxableRowsWithTotals = [taxableTotalsRow, ...baseTaxableRows];

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-sky-200 bg-white">
      <div className="max-h-[520px] w-full overflow-y-auto">
        {view === "able" ? (
          <table className="min-w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">
            {language === "es"
              ? "Tabla de amortización de cuenta ABLE por año y mes."
              : "ABLE account amortization schedule by year and month."}
          </caption>
          <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-sky-700">
            <tr>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 w-[220px] whitespace-nowrap text-center sticky top-0 bg-slate-100 z-10">{labels?.monthYear ?? "MONTH/YEAR"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.contributions ?? "CONTRIBUTIONS"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.withdrawals ?? "WITHDRAWALS"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.investmentReturns ?? "INVESTMENT RETURNS"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.accountBalance ?? "ACCOUNT BALANCE"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.federalSaversCredit ?? "FEDERAL SAVERS CREDIT"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.stateTaxBenefit ?? "STATE TAX BENEFIT"}</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700">
            {ableRowsWithTotals.map((yearRow) => {
              const isTotals = yearRow.year === -1;
              if (isTotals) {
                return (
                  <tr
                    key="account-totals"
                    className="bg-white text-[13px] text-slate-600"
                  >
                    <th scope="row" className="border-b border-sky-200 px-3 py-3 text-left font-bold whitespace-nowrap">
                      {labels?.accountTotals ?? ""}
                    </th>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.contribution)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.withdrawal)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.earnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-900">
                      {formatCurrencyDisplay(yearRow.endingBalance)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.saversCredit)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.stateBenefit)}
                    </td>
                  </tr>
                );
              }
              const isExpanded = expandedYears.has(yearRow.year);
              const yearSummary = (
                <tr
                  className="bg-sky-50 text-sm text-slate-800 transition hover:bg-sky-100"
                >
                  <th scope="row" className="border-b border-sky-200 px-3 py-3 text-left font-bold whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleYear(yearRow.year)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {`${yearRow.yearLabel} ${isExpanded ? "–" : "+"}`}
                      </span>
                    </button>
                  </th>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.contribution)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.withdrawal)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.earnings)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-900">
                    {formatCurrencyDisplay(yearRow.endingBalance)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.saversCredit)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.stateBenefit)}
                  </td>
                </tr>
              );

              return (
                <Fragment key={yearRow.year}>
                  {isExpanded ? (
                    <>
                      {yearRow.months.map((monthRow) => (
                        <tr
                          key={`${yearRow.year}-${monthRow.monthIndex}`}
                          className="bg-white text-[13px] text-slate-600"
                        >
                          <th scope="row" className="border-b border-sky-100 px-3 py-2 pl-8 text-left font-normal whitespace-nowrap">
                            {formatMonthYearFromIndex(monthRow.monthIndex, language, {
                              monthStyle: "long",
                              withPrefixDash: true,
                            })}
                          </th>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.contribution)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.withdrawal)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.earnings)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.endingBalance)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.saversCredit)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.stateBenefit)}
                          </td>
                        </tr>
                      ))}
                      {yearSummary}
                    </>
                  ) : (
                    yearSummary
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table className="min-w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">
            {language === "es"
              ? "Tabla de amortización de cuenta gravable por año y mes."
              : "Taxable account amortization schedule by year and month."}
          </caption>
          <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-sky-700">
            <tr>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 w-[220px] whitespace-nowrap text-center sticky top-0 bg-slate-100 z-10">{labels?.monthYear ?? "MONTH/YEAR"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.contributions ?? "CONTRIBUTIONS"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.withdrawals ?? "WITHDRAWALS"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.investmentReturns ?? "INVESTMENT RETURNS"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.federalTaxes ?? "FEDERAL TAXES"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.stateTaxes ?? "STATE TAXES"}</th>
              <th scope="col" className="border-b border-sky-200 px-3 py-3 text-center sticky top-0 bg-slate-100 z-10">{labels?.accountBalance ?? "ACCOUNT BALANCE"}</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700">
            {taxableRowsWithTotals.map((yearRow) => {
              if (yearRow.year === -1) {
                return (
                  <tr
                    key="taxable-account-totals"
                    className="bg-white text-[13px] text-slate-600"
                  >
                    <th scope="row" className="border-b border-sky-200 px-3 py-3 text-left font-bold whitespace-nowrap">
                      {labels?.accountTotals ?? ""}
                    </th>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.contribution)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.withdrawal)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.investmentReturn)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(-yearRow.federalTaxOnEarnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(-yearRow.stateTaxOnEarnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-900">
                      {formatCurrencyDisplay(yearRow.endingBalance)}
                    </td>
                  </tr>
                );
              }
              const isExpanded = expandedYears.has(yearRow.year);
              const yearSummary = (
                <tr
                  className="bg-sky-50 text-sm text-slate-800 transition hover:bg-sky-100"
                >
                  <th scope="row" className="border-b border-sky-200 px-3 py-3 text-left font-bold whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleYear(yearRow.year)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {`${yearRow.year} ${isExpanded ? "–" : "+"}`}
                      </span>
                    </button>
                  </th>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.contribution)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.withdrawal)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(yearRow.investmentReturn)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(-yearRow.federalTaxOnEarnings)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                    {formatCurrencyDisplay(-yearRow.stateTaxOnEarnings)}
                  </td>
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-900">
                    {formatCurrencyDisplay(yearRow.endingBalance)}
                  </td>
                </tr>
              );

              return (
                <Fragment key={`taxable-${yearRow.year}`}>
                  {isExpanded ? (
                    <>
                      {yearRow.months.map((monthRow) => (
                        <tr
                          key={`taxable-${yearRow.year}-${monthRow.monthIndex}`}
                          className="bg-white text-[13px] text-slate-600"
                        >
                          <th scope="row" className="border-b border-sky-100 px-3 py-2 pl-8 text-left font-normal whitespace-nowrap">
                            {formatMonthYearFromIndex(monthRow.monthIndex, language, {
                              monthStyle: "long",
                              withPrefixDash: true,
                            })}
                          </th>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.contribution)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.withdrawal)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.investmentReturn)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(-monthRow.federalTaxOnEarnings)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(-monthRow.stateTaxOnEarnings)}
                          </td>
                          <td className="border-b border-sky-100 px-3 py-2 text-right">
                            {formatCurrencyDisplay(monthRow.endingBalance)}
                          </td>
                        </tr>
                      ))}
                      {yearSummary}
                    </>
                  ) : (
                    yearSummary
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}
