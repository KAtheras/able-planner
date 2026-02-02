"use client";

import { Fragment, useState } from "react";
import {
  type YearRow,
  type TaxableYearRow,
} from "@/lib/amortization";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type Props = {
  rows: YearRow[];
  taxableRows?: TaxableYearRow[];
};

type ViewMode = "able" | "taxable";

export default function AmortizationScheduleTable({ rows, taxableRows = [] }: Props) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("able");

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
      <div className="flex flex-wrap items-center gap-2 border-b border-sky-200 bg-slate-50 px-4 py-3">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
            viewMode === "able"
              ? "bg-sky-800 text-white"
              : "border border-slate-200 text-slate-600 hover:border-slate-400"
          }`}
          onClick={() => setViewMode("able")}
        >
          ABLE
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
            viewMode === "taxable"
              ? "bg-sky-800 text-white"
              : "border border-slate-200 text-slate-600 hover:border-slate-400"
          }`}
          onClick={() => setViewMode("taxable")}
        >
          Taxable
        </button>
      </div>
      {viewMode === "able" ? (
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-sky-700">
            <tr>
              <th className="border-b border-sky-200 px-3 py-3 w-[220px] whitespace-nowrap">Month</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Contributions</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Monthly Withdrawals</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Earnings</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Balance</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Federal Savers Credit</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">State Tax Deduction / Credit</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700">
            {rows.map((yearRow) => {
              const isExpanded = expandedYears.has(yearRow.year);
              return (
                <Fragment key={yearRow.year}>
                  <tr
                    className="cursor-pointer bg-sky-50 text-sm text-slate-800 transition hover:bg-sky-100"
                    onClick={() => toggleYear(yearRow.year)}
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    <td className="border-b border-sky-200 px-3 py-3 font-bold whitespace-nowrap">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {`${yearRow.yearLabel} ${isExpanded ? "–" : "+"}`}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.contribution)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.withdrawal)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.earnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(yearRow.endingBalance)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.saversCredit)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.stateBenefit)}
                    </td>
                  </tr>
                  {isExpanded &&
                    yearRow.months.map((monthRow) => (
                      <tr
                        key={`${yearRow.year}-${monthRow.monthIndex}`}
                        className="bg-white text-[13px] text-slate-600"
                      >
                        <td className="border-b border-sky-100 px-3 py-2 pl-8 whitespace-nowrap">{monthRow.monthLabel}</td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.contribution)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.withdrawal)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.earnings)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.endingBalance)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.saversCredit)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.stateBenefit)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-sky-700">
            <tr>
              <th className="border-b border-sky-200 px-3 py-3 w-[220px] whitespace-nowrap">Month</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Contributions</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Monthly Withdrawals</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Investment Return</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">(-) Federal Tax on Earnings</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">(-) State Tax on Earnings</th>
              <th className="border-b border-sky-200 px-3 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700">
            {taxableRows.map((yearRow) => {
              const isExpanded = expandedYears.has(yearRow.year);
              return (
                <Fragment key={`taxable-${yearRow.year}`}>
                  <tr
                    className="cursor-pointer bg-sky-50 text-sm text-slate-800 transition hover:bg-sky-100"
                    onClick={() => toggleYear(yearRow.year)}
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    <td className="border-b border-sky-200 px-3 py-3 font-bold whitespace-nowrap">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {`Year ${yearRow.year} ${isExpanded ? "–" : "+"}`}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.contribution)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.withdrawal)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(yearRow.investmentReturn)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(-yearRow.federalTaxOnEarnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrency(-yearRow.stateTaxOnEarnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(yearRow.endingBalance)}
                    </td>
                  </tr>
                  {isExpanded &&
                    yearRow.months.map((monthRow) => (
                      <tr
                        key={`taxable-${yearRow.year}-${monthRow.monthIndex}`}
                        className="bg-white text-[13px] text-slate-600"
                      >
                        <td className="border-b border-sky-100 px-3 py-2 pl-8 whitespace-nowrap">{monthRow.monthLabel}</td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.contribution)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.withdrawal)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.investmentReturn)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(-monthRow.federalTaxOnEarnings)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(-monthRow.stateTaxOnEarnings)}
                        </td>
                        <td className="border-b border-sky-100 px-3 py-2 text-right">
                          {formatCurrency(monthRow.endingBalance)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
