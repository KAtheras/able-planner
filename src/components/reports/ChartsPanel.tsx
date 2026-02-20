"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";
import ReportWindowToggle, { type ReportWindowOptionItem } from "@/components/reports/ReportWindowToggle";

type Props = {
  language: "en" | "es";
  accountType: "able" | "taxable";
  ableRows?: YearRow[];
  taxableRows?: TaxableYearRow[];
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
};

type GrowthPoint = {
  monthIndex: number;
  contribution: number;
  withdrawal: number;
  investmentReturn: number;
  federalTaxOnEarnings: number;
  stateTaxOnEarnings: number;
  endingBalance: number;
  saversCredit: number;
  stateBenefit: number;
};

const formatCurrencyAxis = (value: number) => `$${Math.round(value / 1000)}k`;
const formatCurrencyValue = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const formatSignedCurrencyValue = (value: number) =>
  value < 0 ? `-${formatCurrencyValue(Math.abs(value))}` : formatCurrencyValue(value);

export default function ChartsPanel({
  language,
  accountType,
  ableRows = [],
  taxableRows = [],
  reportWindowLabel,
  reportWindowOptions,
}: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDarkMode(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const monthlyRows = useMemo<GrowthPoint[]>(() => {
    if (accountType === "taxable") {
      return taxableRows
        .filter((row) => row.year >= 0)
        .flatMap((row) => row.months)
        .sort((a, b) => a.monthIndex - b.monthIndex)
        .map((row) => ({
          monthIndex: row.monthIndex,
          contribution: Number.isFinite(row.contribution) ? row.contribution : 0,
          withdrawal: Number.isFinite(row.withdrawal) ? row.withdrawal : 0,
          investmentReturn: Number.isFinite(row.investmentReturn) ? row.investmentReturn : 0,
          federalTaxOnEarnings: Number.isFinite(row.federalTaxOnEarnings) ? row.federalTaxOnEarnings : 0,
          stateTaxOnEarnings: Number.isFinite(row.stateTaxOnEarnings) ? row.stateTaxOnEarnings : 0,
          endingBalance: Number.isFinite(row.endingBalance) ? row.endingBalance : 0,
          saversCredit: 0,
          stateBenefit: 0,
        }));
    }

    return ableRows
      .filter((row) => row.year >= 0)
      .flatMap((row) => row.months)
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map((row) => ({
        monthIndex: row.monthIndex,
        contribution: Number.isFinite(row.contribution) ? row.contribution : 0,
        withdrawal: Number.isFinite(row.withdrawal) ? row.withdrawal : 0,
        investmentReturn: Number.isFinite(row.earnings) ? row.earnings : 0,
        federalTaxOnEarnings: 0,
        stateTaxOnEarnings: 0,
        endingBalance: Number.isFinite(row.endingBalance) ? row.endingBalance : 0,
        saversCredit: Number.isFinite(row.saversCredit) ? row.saversCredit : 0,
        stateBenefit: Number.isFinite(row.stateBenefit) ? row.stateBenefit : 0,
      }));
  }, [accountType, ableRows, taxableRows]);

  const displayRows = useMemo<GrowthPoint[]>(() => {
    if (!monthlyRows.length) return monthlyRows;
    const depletionIndex = monthlyRows.findIndex((row) => row.endingBalance <= 0);
    if (depletionIndex === -1) return monthlyRows;
    return monthlyRows.slice(0, depletionIndex + 1);
  }, [monthlyRows]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const axisColor = isDarkMode ? "#ffffff" : "#52525b";
    const splitLineColor = isDarkMode ? "rgba(161,161,170,0.22)" : "rgba(63,63,70,0.16)";
    const titleColor = isDarkMode ? "#ffffff" : "#18181b";
    const endingBalanceLineColor = isDarkMode ? "#ffffff" : "#111827";

    const labels = displayRows.map((monthRow) =>
      formatMonthYearFromIndex(monthRow.monthIndex, language, { monthStyle: "short" }),
    );
    const labelStep = Math.max(1, Math.ceil(labels.length / 12));

    const firstRow = displayRows[0];
    const initialNetContribution = firstRow
      ? firstRow.endingBalance -
        firstRow.investmentReturn +
        firstRow.federalTaxOnEarnings +
        firstRow.stateTaxOnEarnings -
        firstRow.contribution +
        firstRow.withdrawal
      : 0;

    let runningNetContribution = initialNetContribution;
    let runningGrossReturn = 0;
    const netContributionSeries: number[] = [];
    const returnSeries: number[] = [];
    const taxDragSeries: number[] = [];
    const endingBalanceSeries: number[] = [];

    const yearToMonthIndexes = new Map<number, number[]>();
    const yearToBenefitTotal = new Map<number, number>();
    const yearToFederalTaxTotal = new Map<number, number>();
    const yearToStateTaxTotal = new Map<number, number>();
    for (const row of displayRows) {
      const year = Math.floor(row.monthIndex / 12);
      const list = yearToMonthIndexes.get(year) ?? [];
      list.push(row.monthIndex);
      yearToMonthIndexes.set(year, list);
      yearToBenefitTotal.set(year, (yearToBenefitTotal.get(year) ?? 0) + row.saversCredit + row.stateBenefit);
      yearToFederalTaxTotal.set(
        year,
        (yearToFederalTaxTotal.get(year) ?? 0) + row.federalTaxOnEarnings,
      );
      yearToStateTaxTotal.set(
        year,
        (yearToStateTaxTotal.get(year) ?? 0) + row.stateTaxOnEarnings,
      );
    }

    const smoothedBenefitPerMonth = new Map<number, number>();
    const smoothedFederalTaxPerMonth = new Map<number, number>();
    const smoothedStateTaxPerMonth = new Map<number, number>();
    for (const [year, monthIndexes] of yearToMonthIndexes.entries()) {
      const totalBenefit = yearToBenefitTotal.get(year) ?? 0;
      const totalFederalTax = yearToFederalTaxTotal.get(year) ?? 0;
      const totalStateTax = yearToStateTaxTotal.get(year) ?? 0;
      const count = monthIndexes.length || 1;
      const perMonth = totalBenefit / count;
      const federalPerMonth = totalFederalTax / count;
      const statePerMonth = totalStateTax / count;
      for (const monthIndex of monthIndexes) {
        smoothedBenefitPerMonth.set(monthIndex, perMonth);
        smoothedFederalTaxPerMonth.set(monthIndex, federalPerMonth);
        smoothedStateTaxPerMonth.set(monthIndex, statePerMonth);
      }
    }

    const additionalEconomicBenefitSeries: number[] = [];
    let runningAdditionalEconomicBenefit = 0;
    let runningTotalTaxDrag = 0;

    for (const row of displayRows) {
      runningNetContribution += row.contribution - row.withdrawal;
      runningGrossReturn += row.investmentReturn;
      runningTotalTaxDrag +=
        (smoothedFederalTaxPerMonth.get(row.monthIndex) ?? 0) +
        (smoothedStateTaxPerMonth.get(row.monthIndex) ?? 0);
      netContributionSeries.push(runningNetContribution);
      returnSeries.push(runningGrossReturn);
      taxDragSeries.push(-runningTotalTaxDrag);
      const smoothedEndingBalance =
        runningNetContribution + runningGrossReturn - runningTotalTaxDrag;
      endingBalanceSeries.push(accountType === "taxable" ? smoothedEndingBalance : row.endingBalance);
      const monthlyAdditionalBenefit = smoothedBenefitPerMonth.get(row.monthIndex) ?? 0;
      runningAdditionalEconomicBenefit += monthlyAdditionalBenefit;
      additionalEconomicBenefitSeries.push(runningAdditionalEconomicBenefit);
    }
    const hasAdditionalEconomicBenefitSeries = additionalEconomicBenefitSeries.some(
      (value) => Math.abs(value) > 0.005,
    );

    const netContributionsName = language === "es" ? "Contribuciones netas" : "Net Contributions";
    const investmentReturnsName =
      language === "es"
        ? "Rendimientos de inversión"
        : "Investment Returns";
    const taxableTaxDragName =
      language === "es" ? "Impuestos sobre rendimientos (impacto)" : "Taxes on Earnings (Drag)";
    const taxableEndingName = language === "es" ? "Saldo final gravable" : "Taxable Ending Balance";
    const ableEndingName = language === "es" ? "Saldo final ABLE" : "ABLE Ending Balance";
    const additionalBenefitName =
      language === "es" ? "Beneficio económico adicional*" : "Additional Economic Benefit*";
    const chartSeries = [
      {
        name: netContributionsName,
        type: "line" as const,
        stack: "components",
        smooth: 0.2,
        symbol: "none",
        data: netContributionSeries,
        lineStyle: { width: 0, color: "#1f6fd8" },
        itemStyle: { color: "#1f6fd8" },
        areaStyle: { color: "#1f6fd8" },
      },
      {
        name: investmentReturnsName,
        type: "line" as const,
        stack: "components",
        smooth: 0.2,
        symbol: "none",
        data: returnSeries,
        lineStyle: { width: 0, color: "#14b8a6" },
        itemStyle: { color: "#14b8a6" },
        areaStyle: { color: "#14b8a6" },
      },
      ...(accountType === "taxable"
        ? [
            {
              name: taxableTaxDragName,
              type: "line" as const,
              stack: "components",
              smooth: 0.2,
              symbol: "none",
              data: taxDragSeries,
                lineStyle: { width: 0, color: "#ef4444" },
                itemStyle: { color: "#ef4444" },
                areaStyle: { color: "#ef4444" },
              },
            {
              name: taxableEndingName,
              type: "line" as const,
              smooth: 0.2,
              symbol: "none",
              data: endingBalanceSeries,
              lineStyle: { width: 2, color: endingBalanceLineColor, type: "solid" },
              itemStyle: { color: endingBalanceLineColor },
            },
          ]
        : []),
      ...(accountType === "able"
        ? [
            {
              name: ableEndingName,
              type: "line" as const,
              smooth: 0.2,
              symbol: "none",
              data: endingBalanceSeries,
              lineStyle: { width: 2, color: endingBalanceLineColor, type: "solid" },
              itemStyle: { color: endingBalanceLineColor },
            },
            ...(hasAdditionalEconomicBenefitSeries
              ? [
                  {
                    name: additionalBenefitName,
                    type: "line" as const,
                    stack: "components",
                      smooth: 0.2,
                      symbol: "none",
                      data: additionalEconomicBenefitSeries,
                      lineStyle: { width: 0, color: "#f59e0b" },
                      itemStyle: { color: "#f59e0b" },
                      areaStyle: { color: "#f59e0b" },
                    },
                  ]
                : []),
          ]
        : []),
    ];

    chart.setOption({
      animationDuration: 500,
      legend: {
        bottom: 4,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: {
          fontSize: 11,
          color: titleColor,
        },
      },
      tooltip: { show: false },
      grid: { left: 24, right: 12, top: 16, bottom: 64, containLabel: true },
      xAxis: {
        type: "category",
        axisLine: { show: false },
        axisLabel: {
          color: axisColor,
          fontSize: 11,
          hideOverlap: true,
          interval: (index: number) => index % labelStep !== 0 && index !== labels.length - 1,
        },
        data: labels,
      },
      yAxis: {
        type: "value",
        name: language === "es" ? "Saldo de la cuenta" : "Account Balance",
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: { color: axisColor },
        axisLine: { lineStyle: { color: axisColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { formatter: formatCurrencyAxis, color: axisColor },
      },
      series: chartSeries,
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [accountType, displayRows, isDarkMode, language]);

  const chartSummaryRows = useMemo(() => {
    if (!displayRows.length) return [];

    const firstRow = displayRows[0];
    const initialNetContribution = firstRow
      ? firstRow.endingBalance -
        firstRow.investmentReturn +
        firstRow.federalTaxOnEarnings +
        firstRow.stateTaxOnEarnings -
        firstRow.contribution +
        firstRow.withdrawal
      : 0;

    let runningNetContribution = initialNetContribution;
    let runningAdditionalEconomicBenefit = 0;

    const yearToMonthIndexes = new Map<number, number[]>();
    const yearToBenefitTotal = new Map<number, number>();
    const yearToFederalTaxTotal = new Map<number, number>();
    const yearToStateTaxTotal = new Map<number, number>();
    for (const row of displayRows) {
      const year = Math.floor(row.monthIndex / 12);
      const list = yearToMonthIndexes.get(year) ?? [];
      list.push(row.monthIndex);
      yearToMonthIndexes.set(year, list);
      yearToBenefitTotal.set(year, (yearToBenefitTotal.get(year) ?? 0) + row.saversCredit + row.stateBenefit);
      yearToFederalTaxTotal.set(
        year,
        (yearToFederalTaxTotal.get(year) ?? 0) + row.federalTaxOnEarnings,
      );
      yearToStateTaxTotal.set(
        year,
        (yearToStateTaxTotal.get(year) ?? 0) + row.stateTaxOnEarnings,
      );
    }

    const smoothedBenefitPerMonth = new Map<number, number>();
    const smoothedFederalTaxPerMonth = new Map<number, number>();
    const smoothedStateTaxPerMonth = new Map<number, number>();
    for (const [year, monthIndexes] of yearToMonthIndexes.entries()) {
      const totalBenefit = yearToBenefitTotal.get(year) ?? 0;
      const totalFederalTax = yearToFederalTaxTotal.get(year) ?? 0;
      const totalStateTax = yearToStateTaxTotal.get(year) ?? 0;
      const count = monthIndexes.length || 1;
      const perMonth = totalBenefit / count;
      const federalPerMonth = totalFederalTax / count;
      const statePerMonth = totalStateTax / count;
      for (const monthIndex of monthIndexes) {
        smoothedBenefitPerMonth.set(monthIndex, perMonth);
        smoothedFederalTaxPerMonth.set(monthIndex, federalPerMonth);
        smoothedStateTaxPerMonth.set(monthIndex, statePerMonth);
      }
    }

    let latestNetContribution = 0;
    let latestInvestmentReturn = 0;
    let latestAdditionalBenefit = 0;
    let latestEndingBalance = 0;
    let latestTotalTaxDrag = 0;
    let totalContributions = 0;
    let totalWithdrawals = 0;
    let totalGrossReturns = 0;
    const startingBalance = Math.max(0, initialNetContribution);
    const includesStartingBalance = startingBalance > 0;

    for (const row of displayRows) {
      totalContributions += row.contribution;
      totalWithdrawals += row.withdrawal;
      totalGrossReturns += row.investmentReturn;
      runningNetContribution += row.contribution - row.withdrawal;
      runningAdditionalEconomicBenefit += smoothedBenefitPerMonth.get(row.monthIndex) ?? 0;
      latestNetContribution = runningNetContribution;
      latestTotalTaxDrag +=
        (smoothedFederalTaxPerMonth.get(row.monthIndex) ?? 0) +
        (smoothedStateTaxPerMonth.get(row.monthIndex) ?? 0);
      latestInvestmentReturn =
        accountType === "taxable"
          ? totalGrossReturns
          : row.endingBalance - runningNetContribution;
      latestAdditionalBenefit = runningAdditionalEconomicBenefit;
      latestEndingBalance =
        accountType === "taxable"
          ? runningNetContribution + totalGrossReturns - latestTotalTaxDrag
          : row.endingBalance;
    }

    const rows = [
      {
        key: "contribTotal",
        color: "#3b82f6",
        label:
          language === "es"
            ? includesStartingBalance
              ? "Contribuciones totales**"
              : "Contribuciones totales"
            : includesStartingBalance
              ? "Total Contributions**"
              : "Total Contributions",
        value: totalContributions + startingBalance,
      },
      {
        key: "withdrawalTotal",
        color: "#1d4ed8",
        label: language === "es" ? "Retiros totales" : "Total Withdrawals",
        value: -totalWithdrawals,
      },
      {
        key: "net",
        color: "#1f6fd8",
        label: language === "es" ? "Contribuciones netas" : "Net Contributions",
        value: latestNetContribution,
      },
      {
        key: "returns",
        color: "#14b8a6",
        label:
          language === "es"
            ? "Rendimientos de inversión"
            : "Investment Returns",
        value: latestInvestmentReturn,
      },
      ...(accountType === "taxable"
        ? [
            {
              key: "taxDrag",
              color: "#ef4444",
              label:
                language === "es"
                  ? "Impuestos sobre rendimientos (impacto)"
                  : "Taxes on Earnings (Drag)",
              value: -latestTotalTaxDrag,
            },
          ]
        : []),
      {
        key: "ending",
        color: isDarkMode ? "#ffffff" : "#111827",
        label:
          language === "es"
            ? accountType === "able"
              ? "Saldo final ABLE"
              : "Saldo final gravable"
            : accountType === "able"
              ? "ABLE Ending Balance"
              : "Taxable Ending Balance",
        value: latestEndingBalance,
      },
      ...(accountType === "able" && Math.abs(latestAdditionalBenefit) > 0.005
        ? [
            {
              key: "benefit",
              color: "#f59e0b",
              label:
                language === "es"
                  ? "Beneficio económico adicional*"
                  : "Additional Economic Benefit*",
              value: latestAdditionalBenefit,
            },
          ]
        : []),
    ];

    return rows;
  }, [accountType, displayRows, isDarkMode, language]);

  const accountStartingBalance = useMemo(() => {
    const firstRow = displayRows[0];
    if (!firstRow) return 0;
    const startingBalance =
      firstRow.endingBalance -
      firstRow.investmentReturn +
      firstRow.federalTaxOnEarnings +
      firstRow.stateTaxOnEarnings -
      firstRow.contribution +
      firstRow.withdrawal;
    return Math.max(0, Number.isFinite(startingBalance) ? startingBalance : 0);
  }, [displayRows]);
  const showStartingBalanceFootnote = accountStartingBalance > 0;

  const endingBalanceValue = chartSummaryRows.find((row) => row.key === "ending")?.value ?? 0;
  const additionalEconomicBenefitValue =
    chartSummaryRows.find((row) => row.key === "benefit")?.value ?? 0;
  const totalEconomicValue = endingBalanceValue + additionalEconomicBenefitValue;
  const srSummaryId = `chart-sr-summary-${accountType}`;
  const srRegionLabel =
    language === "es"
      ? accountType === "able"
        ? "Región del gráfico de crecimiento ABLE"
        : "Región del gráfico de crecimiento gravable"
      : accountType === "able"
        ? "ABLE growth chart region"
        : "Taxable growth chart region";

  const srChartSummary = useMemo(() => {
    if (!displayRows.length) {
      return language === "es"
        ? "No hay datos suficientes para mostrar el gráfico."
        : "Not enough data to display the chart.";
    }

    const startLabel = formatMonthYearFromIndex(displayRows[0].monthIndex, language, { monthStyle: "short" });
    const endLabel = formatMonthYearFromIndex(displayRows[displayRows.length - 1].monthIndex, language, {
      monthStyle: "short",
    });
    const rangeText =
      language === "es" ? `Rango: ${startLabel} a ${endLabel}.` : `Range: ${startLabel} to ${endLabel}.`;

    const summaryRowsText = chartSummaryRows
      .map((row) => `${row.label}: ${formatSignedCurrencyValue(row.value)}.`)
      .join(" ");

    if (accountType === "able" && Math.abs(additionalEconomicBenefitValue) > 0.005) {
      const totalEconomicText =
        language === "es"
          ? `Valor económico total: ${formatCurrencyValue(totalEconomicValue)}.`
          : `Total Economic Value: ${formatCurrencyValue(totalEconomicValue)}.`;
      return `${rangeText} ${summaryRowsText} ${totalEconomicText}`;
    }

    return `${rangeText} ${summaryRowsText}`;
  }, [
    accountType,
    additionalEconomicBenefitValue,
    chartSummaryRows,
    displayRows,
    language,
    totalEconomicValue,
  ]);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div
          role="region"
          aria-label={srRegionLabel}
          aria-describedby={srSummaryId}
          className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
        >
          <p id={srSummaryId} className="sr-only">
            {srChartSummary}
          </p>
          <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {language === "es"
                ? accountType === "able"
                  ? "Crecimiento ABLE"
                  : "Crecimiento gravable"
                : accountType === "able"
                  ? "ABLE Growth"
                  : "Taxable Growth"}
            </h2>
            <div className="ml-auto">
              <ReportWindowToggle label={reportWindowLabel} options={reportWindowOptions} />
            </div>
          </div>
          {displayRows.length ? (
            <div ref={chartRef} aria-hidden="true" className="h-[440px] w-full min-w-0" />
          ) : (
            <div className="flex h-[440px] items-center justify-center px-4 text-sm text-zinc-500 dark:text-zinc-400">
              {language === "es"
                ? "No hay datos suficientes para mostrar el gráfico."
                : "Not enough data to display the chart."}
            </div>
          )}
        </div>
        <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="space-y-2.5">
            {chartSummaryRows.map((row) => (
              <div
                key={row.key}
                className="rounded-md border border-zinc-200/80 px-2.5 py-2 dark:border-zinc-700/80"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {row.key !== "contribTotal" && row.key !== "withdrawalTotal" ? (
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                  ) : null}
                  <span className="truncate text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    {row.label}
                  </span>
                </div>
                <span className="mt-0.5 block whitespace-nowrap text-right text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {row.key === "withdrawalTotal"
                    || row.key === "taxDrag"
                    ? formatSignedCurrencyValue(row.value)
                    : formatCurrencyValue(row.value)}
                </span>
              </div>
            ))}
          </div>
          {accountType === "able" && (
            <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-2 dark:border-zinc-600 dark:bg-zinc-900/70">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                {language === "es" ? "Valor económico total" : "Total Economic Value"}
              </div>
              <div className="mt-0.5 text-right text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrencyValue(totalEconomicValue)}
              </div>
            </div>
          )}
        </div>
      </div>
      {accountType === "able" && additionalEconomicBenefitValue > 0.005 && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {language === "es"
              ? "* Beneficio económico adicional por beneficios fiscales federales y estatales sobre contribuciones, no incluido en el saldo de la cuenta ABLE. Para visualización, los beneficios registrados en diciembre se distribuyen uniformemente a lo largo de los meses del mismo año calendario."
              : "* Additional Economic Benefit due to Federal and State Tax Benefits on contributions, not included in ABLE account balance. For visualization, benefits recorded in December are distributed evenly across months in the same calendar year."}
          </p>
          {showStartingBalanceFootnote && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {language === "es"
                ? `** El monto incluye el saldo inicial de la cuenta de ${formatCurrencyValue(accountStartingBalance)}.`
                : `** Amount includes account starting balance of ${formatCurrencyValue(accountStartingBalance)}.`}
            </p>
          )}
        </>
      )}
      {accountType === "taxable" && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {language === "es"
              ? "* Los impuestos federales y estatales sobre rendimientos se muestran como impacto distribuido de manera uniforme por mes dentro de cada año calendario, solo para visualización del gráfico."
              : "* Federal and state taxes on earnings are shown as evenly smoothed monthly drag within each calendar year for chart visualization only."}
          </p>
          {showStartingBalanceFootnote && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {language === "es"
                ? `** El monto incluye el saldo inicial de la cuenta de ${formatCurrencyValue(accountStartingBalance)}.`
                : `** Amount includes account starting balance of ${formatCurrencyValue(accountStartingBalance)}.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
