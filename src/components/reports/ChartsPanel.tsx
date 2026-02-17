"use client";

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { YearRow } from "@/lib/amortization";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";

type Props = {
  ableRows: YearRow[];
  language: "en" | "es";
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

export default function ChartsPanel({ ableRows, language }: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const monthlyRows = useMemo(
    () =>
      ableRows
        .filter((row) => row.year >= 0)
        .flatMap((row) => row.months)
        .sort((a, b) => a.monthIndex - b.monthIndex),
    [ableRows],
  );

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const isDark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
    const axisColor = isDark ? "#d4d4d8" : "#52525b";
    const splitLineColor = isDark ? "rgba(161,161,170,0.22)" : "rgba(63,63,70,0.16)";
    const titleColor = isDark ? "#e4e4e7" : "#18181b";

    const labels = monthlyRows.map((monthRow) =>
      formatMonthYearFromIndex(monthRow.monthIndex, language, { monthStyle: "short" }),
    );
    const labelStep = Math.max(1, Math.ceil(labels.length / 12));
    const firstRow = monthlyRows[0];
    const initialNetContribution = firstRow
      ? (Number.isFinite(firstRow.endingBalance) ? firstRow.endingBalance : 0) -
        (Number.isFinite(firstRow.earnings) ? firstRow.earnings : 0) -
        (Number.isFinite(firstRow.contribution) ? firstRow.contribution : 0) +
        (Number.isFinite(firstRow.withdrawal) ? firstRow.withdrawal : 0)
      : 0;

    let runningNetContribution = initialNetContribution;
    const netContributionSeries: number[] = [];
    const returnSeries: number[] = [];

    const yearToMonthIndexes = new Map<number, number[]>();
    const yearToBenefitTotal = new Map<number, number>();
    for (const row of monthlyRows) {
      const year = Math.floor(row.monthIndex / 12);
      const list = yearToMonthIndexes.get(year) ?? [];
      list.push(row.monthIndex);
      yearToMonthIndexes.set(year, list);
      const monthBenefit =
        (Number.isFinite(row.saversCredit) ? row.saversCredit : 0) +
        (Number.isFinite(row.stateBenefit) ? row.stateBenefit : 0);
      yearToBenefitTotal.set(year, (yearToBenefitTotal.get(year) ?? 0) + monthBenefit);
    }

    const smoothedBenefitPerMonth = new Map<number, number>();
    for (const [year, monthIndexes] of yearToMonthIndexes.entries()) {
      const totalBenefit = yearToBenefitTotal.get(year) ?? 0;
      const count = monthIndexes.length || 1;
      const perMonth = totalBenefit / count;
      for (const monthIndex of monthIndexes) {
        smoothedBenefitPerMonth.set(monthIndex, perMonth);
      }
    }
    const additionalEconomicBenefitSeries: number[] = [];
    const endingBalanceSeries: number[] = [];
    let runningAdditionalEconomicBenefit = 0;

    for (const row of monthlyRows) {
      const contribution = Number.isFinite(row.contribution) ? row.contribution : 0;
      const withdrawal = Number.isFinite(row.withdrawal) ? row.withdrawal : 0;
      const endingBalance = Number.isFinite(row.endingBalance) ? row.endingBalance : 0;
      runningNetContribution += contribution - withdrawal;
      netContributionSeries.push(runningNetContribution);
      returnSeries.push(endingBalance - runningNetContribution);
      endingBalanceSeries.push(endingBalance);
      const monthlyAdditionalBenefit = smoothedBenefitPerMonth.get(row.monthIndex) ?? 0;
      runningAdditionalEconomicBenefit += monthlyAdditionalBenefit;
      additionalEconomicBenefitSeries.push(runningAdditionalEconomicBenefit);
    }

    chart.setOption({
      animationDuration: 500,
      legend: {
        bottom: 4,
        textStyle: { fontSize: 11, color: titleColor },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        valueFormatter: (value: number) =>
          value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
      },
      grid: { left: 10, right: 12, top: 16, bottom: 64, containLabel: true },
      xAxis: {
        type: "category",
        name: language === "es" ? "Tiempo" : "Time",
        nameLocation: "middle",
        nameGap: 32,
        nameTextStyle: { color: axisColor },
        axisLine: { lineStyle: { color: axisColor } },
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
        nameGap: 48,
        nameTextStyle: { color: axisColor },
        axisLine: { lineStyle: { color: axisColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { formatter: formatCurrencyAxis, color: axisColor },
      },
      series: [
        {
          name: language === "es" ? "Contribuciones netas" : "Net Contributions",
          type: "line",
          stack: "components",
          smooth: 0.2,
          symbol: "circle",
          symbolSize: 5,
          data: netContributionSeries,
          lineStyle: { width: 2, color: "#1f6fd8" },
          itemStyle: { color: "#1f6fd8" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(31, 111, 216, 0.28)" },
              { offset: 1, color: "rgba(31, 111, 216, 0.08)" },
            ]),
          },
        },
        {
          name: language === "es" ? "Rendimientos de inversión" : "Investment Returns",
          type: "line",
          stack: "components",
          smooth: 0.2,
          symbol: "circle",
          symbolSize: 5,
          data: returnSeries,
          lineStyle: { width: 2, color: "#14b8a6" },
          itemStyle: { color: "#14b8a6" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(20, 184, 166, 0.28)" },
              { offset: 1, color: "rgba(20, 184, 166, 0.08)" },
            ]),
          },
        },
        {
          name:
            language === "es"
              ? "Beneficio económico adicional*"
              : "Additional Economic Benefit*",
          type: "line",
          stack: "components",
          smooth: 0.2,
          symbol: "circle",
          symbolSize: 5,
          data: additionalEconomicBenefitSeries,
          lineStyle: { width: 2, color: "#f59e0b" },
          itemStyle: { color: "#f59e0b" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(245, 158, 11, 0.25)" },
              { offset: 1, color: "rgba(245, 158, 11, 0.06)" },
            ]),
          },
        },
      ],
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [language, monthlyRows]);

  const chartSummaryRows = useMemo(() => {
    const months = monthlyRows;
    if (!months.length) return [];

    const firstRow = months[0];
    const initialNetContribution = firstRow
      ? (Number.isFinite(firstRow.endingBalance) ? firstRow.endingBalance : 0) -
        (Number.isFinite(firstRow.earnings) ? firstRow.earnings : 0) -
        (Number.isFinite(firstRow.contribution) ? firstRow.contribution : 0) +
        (Number.isFinite(firstRow.withdrawal) ? firstRow.withdrawal : 0)
      : 0;

    let runningNetContribution = initialNetContribution;
    let runningAdditionalEconomicBenefit = 0;

    const yearToMonthIndexes = new Map<number, number[]>();
    const yearToBenefitTotal = new Map<number, number>();
    for (const row of months) {
      const year = Math.floor(row.monthIndex / 12);
      const list = yearToMonthIndexes.get(year) ?? [];
      list.push(row.monthIndex);
      yearToMonthIndexes.set(year, list);
      const monthBenefit =
        (Number.isFinite(row.saversCredit) ? row.saversCredit : 0) +
        (Number.isFinite(row.stateBenefit) ? row.stateBenefit : 0);
      yearToBenefitTotal.set(year, (yearToBenefitTotal.get(year) ?? 0) + monthBenefit);
    }

    const smoothedBenefitPerMonth = new Map<number, number>();
    for (const [year, monthIndexes] of yearToMonthIndexes.entries()) {
      const totalBenefit = yearToBenefitTotal.get(year) ?? 0;
      const count = monthIndexes.length || 1;
      const perMonth = totalBenefit / count;
      for (const monthIndex of monthIndexes) {
        smoothedBenefitPerMonth.set(monthIndex, perMonth);
      }
    }

    let latestNetContribution = 0;
    let latestInvestmentReturn = 0;
    let latestAdditionalBenefit = 0;
    let latestEndingBalance = 0;
    let totalContributions = 0;
    let totalWithdrawals = 0;
    const startingBalance = Math.max(0, initialNetContribution);

    for (const row of months) {
      const contribution = Number.isFinite(row.contribution) ? row.contribution : 0;
      const withdrawal = Number.isFinite(row.withdrawal) ? row.withdrawal : 0;
      const endingBalance = Number.isFinite(row.endingBalance) ? row.endingBalance : 0;
      totalContributions += contribution;
      totalWithdrawals += withdrawal;
      runningNetContribution += contribution - withdrawal;
      runningAdditionalEconomicBenefit += smoothedBenefitPerMonth.get(row.monthIndex) ?? 0;
      latestNetContribution = runningNetContribution;
      latestInvestmentReturn = endingBalance - runningNetContribution;
      latestAdditionalBenefit = runningAdditionalEconomicBenefit;
      latestEndingBalance = endingBalance;
    }

    return [
      {
        key: "contribTotal",
        color: "#3b82f6",
        label: language === "es" ? "Contribuciones totales**" : "Total Contributions**",
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
        label: language === "es" ? "Rendimientos de inversión" : "Investment Returns",
        value: latestInvestmentReturn,
      },
      {
        key: "ending",
        color: "#111827",
        label: language === "es" ? "Saldo final ABLE" : "ABLE Ending Balance",
        value: latestEndingBalance,
      },
      {
        key: "benefit",
        color: "#f59e0b",
        label: language === "es" ? "Beneficio económico adicional*" : "Additional Economic Benefit*",
        value: latestAdditionalBenefit,
      },
    ];
  }, [language, monthlyRows]);
  const ableEndingBalanceValue =
    chartSummaryRows.find((row) => row.key === "ending")?.value ?? 0;
  const additionalEconomicBenefitValue =
    chartSummaryRows.find((row) => row.key === "benefit")?.value ?? 0;
  const totalEconomicValue = ableEndingBalanceValue + additionalEconomicBenefitValue;

  return (
    <div className="mt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
            <h2 className="px-3 pt-3 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {language === "es" ? "Crecimiento de la cuenta ABLE" : "ABLE Account Growth"}
            </h2>
            {monthlyRows.length ? (
              <div ref={chartRef} className="h-[440px] w-full min-w-0" />
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
                <div key={row.key} className="rounded-md border border-zinc-200/80 px-2.5 py-2 dark:border-zinc-700/80">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="truncate text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {row.label}
                    </span>
                  </div>
                  <span className="mt-0.5 block whitespace-nowrap text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.key === "withdrawalTotal"
                      ? formatSignedCurrencyValue(row.value)
                      : formatCurrencyValue(row.value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-2 dark:border-zinc-600 dark:bg-zinc-900/70">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                {language === "es" ? "Valor económico total" : "Total Economic Value"}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrencyValue(totalEconomicValue)}
              </div>
            </div>
          </div>
        </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {language === "es"
          ? "* Beneficio económico adicional por beneficios fiscales federales y estatales sobre contribuciones, no incluido en el saldo de la cuenta ABLE. Para visualización, los beneficios registrados en diciembre se distribuyen uniformemente a lo largo de los meses del mismo año calendario."
          : "* Additional Economic Benefit due to Federal and State Tax Benefits on contributions, not included in ABLE account balance. For visualization, benefits recorded in December are distributed evenly across months in the same calendar year."}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {language === "es"
          ? "** El monto incluye el saldo inicial de la cuenta."
          : "** Amount includes account starting balance."}
      </p>
    </div>
  );
}
