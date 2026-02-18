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
  language: "en" | "es";
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
};

const normalizeZero = (value: number) =>
  Object.is(value, -0) || Math.abs(value) < 0.5 ? 0 : value;

const formatCurrency = (value: number) =>
  normalizeZero(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const formatSignedCurrency = (value: number) => {
  const normalized = normalizeZero(value);
  return normalized < 0 ? `-${formatCurrency(Math.abs(normalized))}` : formatCurrency(normalized);
};
const formatCurrencyOrDash = (value: number, dash: string) =>
  value === 0 ? dash : formatCurrency(value);
const NA_DISPLAY = "N/A";
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
  language,
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
      ableNumeric: ableTotals.startingBalance,
      taxableNumeric: taxableTotals.startingBalance,
      able: formatCurrency(ableTotals.startingBalance),
      taxable: formatCurrency(taxableTotals.startingBalance),
    },
    {
      key: "contributions",
      label: labels.rows.contributions,
      ableNumeric: ableTotals.contributions,
      taxableNumeric: taxableTotals.contributions,
      able: formatCurrency(ableTotals.contributions),
      taxable: formatCurrency(taxableTotals.contributions),
    },
    {
      key: "investmentReturns",
      label: labels.rows.investmentReturns,
      ableNumeric: ableTotals.investmentReturns,
      taxableNumeric: taxableTotals.investmentReturns,
      able: formatCurrency(ableTotals.investmentReturns),
      taxable: formatCurrency(taxableTotals.investmentReturns),
    },
    {
      key: "federalTaxes",
      label: labels.rows.federalTaxes,
      ableNumeric: null,
      taxableNumeric: taxableTotals.federalTaxes,
      able: NA_DISPLAY,
      taxable: formatSignedCurrency(-taxableTotals.federalTaxes),
    },
    {
      key: "stateTaxes",
      label: labels.rows.stateTaxes,
      ableNumeric: null,
      taxableNumeric: taxableTotals.stateTaxes,
      able: NA_DISPLAY,
      taxable: formatSignedCurrency(-taxableTotals.stateTaxes),
    },
    {
      key: "totalFundsAvailable",
      label: language === "es" ? "Total de fondos disponibles" : "Total Funds Available",
      ableNumeric:
        ableTotals.startingBalance +
        ableTotals.contributions +
        ableTotals.investmentReturns -
        ableTotals.federalTaxes -
        ableTotals.stateTaxes,
      taxableNumeric:
        taxableTotals.startingBalance +
        taxableTotals.contributions +
        taxableTotals.investmentReturns -
        taxableTotals.federalTaxes -
        taxableTotals.stateTaxes,
      able: formatCurrency(
        ableTotals.startingBalance +
          ableTotals.contributions +
          ableTotals.investmentReturns -
          ableTotals.federalTaxes -
          ableTotals.stateTaxes,
      ),
      taxable: formatCurrency(
        taxableTotals.startingBalance +
          taxableTotals.contributions +
          taxableTotals.investmentReturns -
          taxableTotals.federalTaxes -
          taxableTotals.stateTaxes,
      ),
      forceShow: true,
    },
    {
      key: "withdrawals",
      label: labels.rows.withdrawals,
      ableNumeric: ableTotals.withdrawals,
      taxableNumeric: taxableTotals.withdrawals,
      able: formatCurrency(ableTotals.withdrawals),
      taxable: formatCurrency(taxableTotals.withdrawals),
      forceShow: true,
    },
    {
      key: "endingAccountBalance",
      label: language === "es" ? "Saldo final de la cuenta" : "Ending Account Balance",
      ableNumeric:
        ableTotals.startingBalance +
        ableTotals.contributions +
        ableTotals.investmentReturns -
        ableTotals.federalTaxes -
        ableTotals.stateTaxes -
        ableTotals.withdrawals,
      taxableNumeric:
        taxableTotals.startingBalance +
        taxableTotals.contributions +
        taxableTotals.investmentReturns -
        taxableTotals.federalTaxes -
        taxableTotals.stateTaxes -
        taxableTotals.withdrawals,
      able: formatCurrency(
        ableTotals.startingBalance +
          ableTotals.contributions +
          ableTotals.investmentReturns -
          ableTotals.federalTaxes -
          ableTotals.stateTaxes -
          ableTotals.withdrawals,
      ),
      taxable: formatCurrency(
        taxableTotals.startingBalance +
          taxableTotals.contributions +
          taxableTotals.investmentReturns -
          taxableTotals.federalTaxes -
          taxableTotals.stateTaxes -
          taxableTotals.withdrawals,
      ),
      forceShow: true,
    },
    {
      key: "federalSaversCredit",
      label: labels.rows.federalSaversCredit,
      ableNumeric: ableTotals.federalSaversCredit,
      taxableNumeric: null,
      able: formatCurrencyOrDash(ableTotals.federalSaversCredit, labels.naLabel),
      taxable: NA_DISPLAY,
    },
    {
      key: "stateTaxBenefits",
      label: labels.rows.stateTaxBenefits,
      ableNumeric: ableTotals.stateTaxBenefits,
      taxableNumeric: null,
      able: formatCurrencyOrDash(ableTotals.stateTaxBenefits, labels.naLabel),
      taxable: NA_DISPLAY,
    },
  ].filter((row) => {
    if ("forceShow" in row && row.forceShow) return true;
    const ableValue = row.ableNumeric;
    const taxableValue = row.taxableNumeric;
    const ableIsZero = ableValue === null || ableValue === 0;
    const taxableIsZero = taxableValue === null || taxableValue === 0;
    return !(ableIsZero && taxableIsZero);
  });

  const taxableTaxAmount = taxableTotals.federalTaxes + taxableTotals.stateTaxes;
  const hasFederalTaxAmount = taxableTotals.federalTaxes > 0;
  const hasStateTaxAmount = taxableTotals.stateTaxes > 0;
  const hasTaxAmount = taxableTaxAmount > 0;
  const taxableTaxAmountLabel = formatCurrency(taxableTaxAmount);
  const investmentReturnDrag = Math.max(0, ableTotals.investmentReturns - taxableTotals.investmentReturns);
  const investmentReturnDragLabel = formatCurrency(investmentReturnDrag);
  const taxTypeLabelEn =
    hasFederalTaxAmount && hasStateTaxAmount
      ? "federal and state taxes"
      : hasFederalTaxAmount
        ? "federal taxes"
        : "state taxes";
  const taxTypeLabelEs =
    hasFederalTaxAmount && hasStateTaxAmount
      ? "los impuestos federales y estatales"
      : hasFederalTaxAmount
        ? "los impuestos federales"
        : "los impuestos estatales";
  const getFirstDepletionMonthIndex = (
    months: Array<{ monthIndex: number; endingBalance: number }>,
  ): number | null => {
    const depleted = months.find((month) => month.endingBalance <= 0);
    return depleted ? depleted.monthIndex : null;
  };
  const ableMonths = ableRows
    .filter((row) => row.year >= 0)
    .flatMap((row) => row.months)
    .sort((a, b) => a.monthIndex - b.monthIndex);
  const taxableMonths = taxableRows
    .filter((row) => row.year >= 0)
    .flatMap((row) => row.months)
    .sort((a, b) => a.monthIndex - b.monthIndex);
  const ableDepletionMonthIndex = getFirstDepletionMonthIndex(ableMonths);
  const taxableDepletionMonthIndex = getFirstDepletionMonthIndex(taxableMonths);
  const taxableDepletesSooner =
    taxableDepletionMonthIndex !== null &&
    (ableDepletionMonthIndex === null || taxableDepletionMonthIndex < ableDepletionMonthIndex);
  const withdrawalShortfall = ableTotals.withdrawals - taxableTotals.withdrawals;
  const hasWithdrawalShortfall = withdrawalShortfall > 0;
  const showWithdrawalDepletionNote = taxableDepletesSooner && hasWithdrawalShortfall;
  const withdrawalShortfallLabel = formatCurrency(withdrawalShortfall);
  const additionalEconomicBenefit = ableTotals.federalSaversCredit + ableTotals.stateTaxBenefits;
  const hasFederalSaversCredit = ableTotals.federalSaversCredit > 0;
  const hasStateTaxBenefits = ableTotals.stateTaxBenefits > 0;
  const showAdditionalBenefitNote = additionalEconomicBenefit > 0;
  const additionalEconomicBenefitLabel = formatCurrency(additionalEconomicBenefit);
  const additionalBenefitLabelEn =
    hasFederalSaversCredit && hasStateTaxBenefits
      ? "the Federal Saver's Credit and state tax benefits on contributions"
      : hasFederalSaversCredit
        ? "the Federal Saver's Credit"
        : "state tax benefits on contributions";
  const additionalBenefitLabelEs =
    hasFederalSaversCredit && hasStateTaxBenefits
      ? "el Crédito Federal del Ahorrador y los beneficios fiscales estatales sobre contribuciones"
      : hasFederalSaversCredit
        ? "el Crédito Federal del Ahorrador"
        : "los beneficios fiscales estatales sobre contribuciones";

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="md:hidden">{language === "es" ? "ABLE vs. Gravable" : "Able vs. Taxable"}</span>
              <span className="hidden md:inline">{labels.title}</span>
            </h2>
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
                    className={[
                      index % 2 === 0 ? "bg-zinc-50/60 dark:bg-zinc-900/40" : "",
                      row.key === "totalFundsAvailable" ? "border-t border-zinc-300 dark:border-zinc-600" : "",
                      row.key === "withdrawals" ? "border-b border-zinc-300 dark:border-zinc-600" : "",
                      row.key === "endingAccountBalance" ? "border-b-4 border-double border-zinc-400 dark:border-zinc-500" : "",
                    ].join(" ")}
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
        <aside className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
            {language === "es" ? "Notas de comparación" : "Comparison Notes"}
          </h3>
          <div className="mb-4 mt-2 border-b border-zinc-200 dark:border-zinc-700" />
          {hasTaxAmount && (
            <p className="leading-relaxed">
              {language === "es"
                ? `Durante el periodo seleccionado, ${taxTypeLabelEs} sobre la cuenta gravable suman ${taxableTaxAmountLabel}. Ese monto reduce directamente el saldo de la cuenta gravable y también genera un efecto de arrastre sobre los rendimientos de inversión de ${investmentReturnDragLabel}, medido como la diferencia entre los rendimientos de inversión de ABLE y gravable.`
                : `Over the selected period, ${taxTypeLabelEn} on the taxable account total ${taxableTaxAmountLabel}. This amount directly reduces the taxable account balance and also creates drag on investment returns of ${investmentReturnDragLabel}, measured as the difference between ABLE and taxable investment returns.`}
            </p>
          )}
          {showWithdrawalDepletionNote && (
            <p className="mt-2 leading-relaxed">
              {language === "es"
                ? `Además, la cuenta gravable se agota antes que la cuenta ABLE. Una vez agotada, los retiros quedan limitados al saldo disponible, por lo que los retiros acumulados terminan siendo menores. En este escenario, la cuenta gravable retira ${withdrawalShortfallLabel} menos que la cuenta ABLE.`
                : `In this scenario, the taxable account depletes earlier than the ABLE account. Once depleted, withdrawals are limited to remaining available funds, so cumulative withdrawals are lower. In this scenario, the taxable account delivers ${withdrawalShortfallLabel} less in total withdrawals than the ABLE account.`}
            </p>
          )}
          {showAdditionalBenefitNote && (
            <p className="mt-2 leading-relaxed">
              {language === "es"
                ? `Además, ${additionalBenefitLabelEs} suman ${additionalEconomicBenefitLabel}. Este monto no está incluido en el saldo de la cuenta ABLE. Sin embargo, representa un beneficio económico real y adicional al que no tendría derecho si invirtiera en una cuenta gravable.`
                : `In addition, ${additionalBenefitLabelEn} total ${additionalEconomicBenefitLabel}. This amount is not included in the ABLE account balance. However, it represents a real and additional economic benefit which you would not be entitled to if you were to invest in a taxable account.`}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
