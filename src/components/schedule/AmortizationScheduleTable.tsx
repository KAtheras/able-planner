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

const formatCurrencyDisplay = (value: number) => {
  if (value === 0) {
    return "-";
  }
  if (value < 0) {
    return `(${formatCurrency(Math.abs(value))})`;
  }
  return formatCurrency(value);
};

type ViewMode = "able" | "taxable";

type Props = {
  rows: YearRow[];
  taxableRows?: TaxableYearRow[];
  view: ViewMode;
  labels?: {
    monthYear?: string;
    contributions?: string;
    withdrawals?: string;
    investmentReturns?: string;
    accountBalance?: string;
    federalSaversCredit?: string;
    stateTaxBenefit?: string;
    federalTaxes?: string;
    stateTaxes?: string;
  };
  labels?: {
    monthYear?: string;
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

export default function AmortizationScheduleTable({ rows, taxableRows = [], view, labels }: Props) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

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
      {view === "able" ? (
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-sky-700">
            <tr>
              <th className="border-b border-sky-200 px-3 py-3 w-[220px] whitespace-nowrap text-center">{labels?.monthYear ?? "MONTH/YEAR"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.contributions ?? "CONTRIBUTIONS"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.withdrawals ?? "WITHDRAWALS"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.investmentReturns ?? "INVESTMENT RETURNS"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.accountBalance ?? "ACCOUNT BALANCE"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.federalSaversCredit ?? "FEDERAL SAVERS CREDIT"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.stateTaxBenefit ?? "STATE TAX BENEFIT"}</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700">
            {rows.map((yearRow) => {
              const isExpanded = expandedYears.has(yearRow.year);
              const yearSummary = (
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
                      {formatCurrencyDisplay(yearRow.contribution)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.withdrawal)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold">
                      {formatCurrencyDisplay(yearRow.earnings)}
                    </td>
                    <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
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
                          <td className="border-b border-sky-100 px-3 py-2 pl-8 whitespace-nowrap">{monthRow.monthLabel}</td>
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
          <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-sky-700">
            <tr>
              <th className="border-b border-sky-200 px-3 py-3 w-[220px] whitespace-nowrap text-center">{labels?.monthYear ?? "MONTH/YEAR"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.contributions ?? "CONTRIBUTIONS"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.withdrawals ?? "WITHDRAWALS"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.investmentReturns ?? "INVESTMENT RETURNS"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.federalTaxes ?? "FEDERAL TAXES"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.stateTaxes ?? "STATE TAXES"}</th>
              <th className="border-b border-sky-200 px-3 py-3 text-center">{labels?.accountBalance ?? "ACCOUNT BALANCE"}</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700">
            {taxableRows.map((yearRow) => {
              const isExpanded = expandedYears.has(yearRow.year);
              const yearSummary = (
                <tr
                  className="cursor-pointer bg-sky-50 text-sm text-slate-800 transition hover:bg-sky-100"
                  onClick={() => toggleYear(yearRow.year)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <td className="border-b border-sky-200 px-3 py-3 font-bold whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {`${yearRow.year} ${isExpanded ? "–" : "+"}`}
                      </span>
                    </div>
                  </td>
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
                  <td className="border-b border-sky-200 px-3 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
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
                          <td className="border-b border-sky-100 px-3 py-2 pl-8 whitespace-nowrap">{monthRow.monthLabel}</td>
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
  );
}
