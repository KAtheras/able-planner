"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";
import ReportWindowToggle, { type ReportWindowOptionItem } from "@/components/reports/ReportWindowToggle";

type Props = {
  language: "en" | "es";
  title: string;
  panelTitle: string;
  ableLineLabel: string;
  taxableLineLabel: string;
  withdrawalDifferenceLabel: string;
  taxableWithdrawalDifferenceLabel: string;
  withdrawalInfoToggleAriaLabel: string;
  withdrawalInfoMessageLabel: string;
  ableBalanceAdvantageLabel: string;
  taxableBalanceAdvantageLabel: string;
  balanceInfoToggleAriaLabel: string;
  balanceInfoMessageLabel: string;
  additionalEconomicBenefitBothLabel: string;
  additionalEconomicBenefitFederalOnlyLabel: string;
  additionalEconomicBenefitStateOnlyLabel: string;
  additionalEconomicBenefitNoneLabel: string;
  additionalEconomicBenefitInfoToggleAriaLabel: string;
  additionalEconomicBenefitInfoMessageLabel: string;
  investmentReturnDifferenceLabel: string;
  taxableInvestmentReturnDifferenceLabel: string;
  investmentReturnInfoToggleAriaLabel: string;
  investmentReturnInfoMessageWithStateLabel: string;
  investmentReturnInfoMessageFederalOnlyLabel: string;
  noDifferencesLabel: string;
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
};

type ComparisonPoint = {
  monthIndex: number;
  ableEndingBalance: number;
  taxableEndingBalance: number;
};

type SideMetric = {
  key: string;
  label: string;
  value: number;
  hideIfZero?: boolean;
};

const finiteOrZero = (value: number) => (Number.isFinite(value) ? value : 0);

const normalizeCurrencyDisplayValue = (value: number) =>
  Object.is(value, -0) || Math.abs(value) < 0.5 ? 0 : value;

const formatCurrencyValue = (value: number) =>
  normalizeCurrencyDisplayValue(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatSignedCurrencyValue = (value: number) => {
  const normalized = normalizeCurrencyDisplayValue(value);
  return normalized < 0
    ? `-${formatCurrencyValue(Math.abs(normalized))}`
    : formatCurrencyValue(normalized);
};

const formatCurrencyAxis = (value: number) => `$${Math.round(value / 1000)}k`;

export default function ExperimentalComparisonPanel({
  language,
  title,
  panelTitle,
  ableLineLabel,
  taxableLineLabel,
  withdrawalDifferenceLabel,
  taxableWithdrawalDifferenceLabel,
  withdrawalInfoToggleAriaLabel,
  withdrawalInfoMessageLabel,
  ableBalanceAdvantageLabel,
  taxableBalanceAdvantageLabel,
  balanceInfoToggleAriaLabel,
  balanceInfoMessageLabel,
  additionalEconomicBenefitBothLabel,
  additionalEconomicBenefitFederalOnlyLabel,
  additionalEconomicBenefitStateOnlyLabel,
  additionalEconomicBenefitNoneLabel,
  additionalEconomicBenefitInfoToggleAriaLabel,
  additionalEconomicBenefitInfoMessageLabel,
  investmentReturnDifferenceLabel,
  taxableInvestmentReturnDifferenceLabel,
  investmentReturnInfoToggleAriaLabel,
  investmentReturnInfoMessageWithStateLabel,
  investmentReturnInfoMessageFederalOnlyLabel,
  noDifferencesLabel,
  ableRows,
  taxableRows,
  reportWindowLabel,
  reportWindowOptions,
}: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showWithdrawalInfoMessage, setShowWithdrawalInfoMessage] = useState(false);
  const [showInvestmentReturnInfoMessage, setShowInvestmentReturnInfoMessage] = useState(false);
  const [showBalanceInfoMessage, setShowBalanceInfoMessage] = useState(false);
  const [showAdditionalEconomicBenefitInfoMessage, setShowAdditionalEconomicBenefitInfoMessage] =
    useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDarkMode(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const ableMonthlyRows = useMemo(
    () =>
      ableRows
        .filter((row) => row.year >= 0)
        .flatMap((row) => row.months)
        .sort((a, b) => a.monthIndex - b.monthIndex),
    [ableRows],
  );

  const taxableMonthlyRows = useMemo(
    () =>
      taxableRows
        .filter((row) => row.year >= 0)
        .flatMap((row) => row.months)
        .sort((a, b) => a.monthIndex - b.monthIndex),
    [taxableRows],
  );

  const taxableSmoothedEndingByMonth = useMemo(() => {
    const smoothedByMonth = new Map<number, number>();
    if (!taxableMonthlyRows.length) return smoothedByMonth;

    const yearToMonthIndexes = new Map<number, number[]>();
    const yearToFederalTaxTotal = new Map<number, number>();
    const yearToStateTaxTotal = new Map<number, number>();

    for (const month of taxableMonthlyRows) {
      const year = Math.floor(month.monthIndex / 12);
      const monthIndexes = yearToMonthIndexes.get(year) ?? [];
      monthIndexes.push(month.monthIndex);
      yearToMonthIndexes.set(year, monthIndexes);
      yearToFederalTaxTotal.set(
        year,
        (yearToFederalTaxTotal.get(year) ?? 0) + finiteOrZero(month.federalTaxOnEarnings),
      );
      yearToStateTaxTotal.set(
        year,
        (yearToStateTaxTotal.get(year) ?? 0) + finiteOrZero(month.stateTaxOnEarnings),
      );
    }

    const smoothedFederalTaxPerMonth = new Map<number, number>();
    const smoothedStateTaxPerMonth = new Map<number, number>();
    for (const [year, monthIndexes] of yearToMonthIndexes.entries()) {
      const monthCount = monthIndexes.length || 1;
      const federalTaxPerMonth = (yearToFederalTaxTotal.get(year) ?? 0) / monthCount;
      const stateTaxPerMonth = (yearToStateTaxTotal.get(year) ?? 0) / monthCount;
      for (const monthIndex of monthIndexes) {
        smoothedFederalTaxPerMonth.set(monthIndex, federalTaxPerMonth);
        smoothedStateTaxPerMonth.set(monthIndex, stateTaxPerMonth);
      }
    }

    const firstRow = taxableMonthlyRows[0];
    const initialNetContribution = firstRow
      ? finiteOrZero(firstRow.endingBalance) -
        finiteOrZero(firstRow.investmentReturn) +
        finiteOrZero(firstRow.federalTaxOnEarnings) +
        finiteOrZero(firstRow.stateTaxOnEarnings) -
        finiteOrZero(firstRow.contribution) +
        finiteOrZero(firstRow.withdrawal)
      : 0;

    let runningNetContribution = initialNetContribution;
    let runningGrossReturn = 0;
    let runningTaxDrag = 0;

    for (const month of taxableMonthlyRows) {
      runningNetContribution += finiteOrZero(month.contribution) - finiteOrZero(month.withdrawal);
      runningGrossReturn += finiteOrZero(month.investmentReturn);
      runningTaxDrag +=
        (smoothedFederalTaxPerMonth.get(month.monthIndex) ?? 0) +
        (smoothedStateTaxPerMonth.get(month.monthIndex) ?? 0);
      smoothedByMonth.set(month.monthIndex, runningNetContribution + runningGrossReturn - runningTaxDrag);
    }

    return smoothedByMonth;
  }, [taxableMonthlyRows]);

  const comparisonPoints = useMemo<ComparisonPoint[]>(() => {
    if (!ableMonthlyRows.length && !taxableMonthlyRows.length) return [];

    const ableByMonth = new Map<number, number>();
    const taxableByMonth = new Map<number, number>();
    for (const month of ableMonthlyRows) {
      ableByMonth.set(month.monthIndex, finiteOrZero(month.endingBalance));
    }
    for (const month of taxableMonthlyRows) {
      taxableByMonth.set(
        month.monthIndex,
        finiteOrZero(taxableSmoothedEndingByMonth.get(month.monthIndex) ?? month.endingBalance),
      );
    }

    const monthIndexSet = new Set<number>();
    for (const month of ableMonthlyRows) monthIndexSet.add(month.monthIndex);
    for (const month of taxableMonthlyRows) monthIndexSet.add(month.monthIndex);
    const monthIndexes = Array.from(monthIndexSet).sort((a, b) => a - b);

    let lastAble = 0;
    let lastTaxable = 0;
    return monthIndexes.map((monthIndex) => {
      if (ableByMonth.has(monthIndex)) {
        lastAble = ableByMonth.get(monthIndex) ?? lastAble;
      }
      if (taxableByMonth.has(monthIndex)) {
        lastTaxable = taxableByMonth.get(monthIndex) ?? lastTaxable;
      }
      return {
        monthIndex,
        ableEndingBalance: lastAble,
        taxableEndingBalance: lastTaxable,
      };
    });
  }, [ableMonthlyRows, taxableMonthlyRows, taxableSmoothedEndingByMonth]);

  const {
    summaryMetrics,
    additionalEconomicBenefitFederal,
    additionalEconomicBenefitState,
    taxableStateTaxDrag,
    taxableTotalTaxDrag,
    investmentReturnDifference,
  } = useMemo(() => {
    const ableEndingBalance = comparisonPoints[comparisonPoints.length - 1]?.ableEndingBalance ?? 0;
    const taxableEndingBalance = comparisonPoints[comparisonPoints.length - 1]?.taxableEndingBalance ?? 0;

    const ableTotalWithdrawals = ableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.withdrawal), 0);
    const taxableTotalWithdrawals = taxableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.withdrawal), 0);
    const ableTotalReturns = ableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.earnings), 0);
    const taxableTotalReturns = taxableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.investmentReturn), 0);
    const taxableFederalTaxDrag = taxableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.federalTaxOnEarnings), 0);
    const taxableStateTaxDrag = taxableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.stateTaxOnEarnings), 0);
    const taxableTotalTaxDrag =
      taxableFederalTaxDrag + taxableStateTaxDrag;
    const investmentReturnDifference = ableTotalReturns - taxableTotalReturns;
    const additionalEconomicBenefitFederal = ableRows
      .filter((row) => row.year >= 0)
      .reduce(
        (sum, row) => sum + finiteOrZero(row.saversCredit),
        0,
      );
    const additionalEconomicBenefitState = ableRows
      .filter((row) => row.year >= 0)
      .reduce((sum, row) => sum + finiteOrZero(row.stateBenefit), 0);
    const additionalEconomicBenefit =
      additionalEconomicBenefitFederal + additionalEconomicBenefitState;

    const metrics: SideMetric[] = [
      {
        key: "ending-balance-advantage",
        label: ableBalanceAdvantageLabel,
        value: ableEndingBalance - taxableEndingBalance,
        hideIfZero: true,
      },
      {
        key: "investment-return-difference",
        label: investmentReturnDifferenceLabel,
        value: investmentReturnDifference,
      },
      {
        key: "withdrawal-difference",
        label: withdrawalDifferenceLabel,
        value: ableTotalWithdrawals - taxableTotalWithdrawals,
        hideIfZero: true,
      },
      {
        key: "additional-economic-benefit",
        label: "",
        value: additionalEconomicBenefit,
      },
    ];

    return {
      summaryMetrics: metrics.filter((metric) => !metric.hideIfZero || Math.abs(metric.value) > 0.005),
      additionalEconomicBenefitFederal,
      additionalEconomicBenefitState,
      taxableStateTaxDrag,
      taxableTotalTaxDrag,
      investmentReturnDifference,
    };
  }, [
    ableRows,
    taxableRows,
    comparisonPoints,
    withdrawalDifferenceLabel,
    ableBalanceAdvantageLabel,
    investmentReturnDifferenceLabel,
  ]);

  useEffect(() => {
    if (!chartRef.current || !comparisonPoints.length) return;
    const chart = echarts.init(chartRef.current);
    const axisColor = isDarkMode ? "#ffffff" : "#52525b";
    const splitLineColor = isDarkMode ? "rgba(161,161,170,0.22)" : "rgba(63,63,70,0.16)";
    const taxableColor = isDarkMode ? "#cbd5e1" : "#475569";
    const themeColor =
      getComputedStyle(document.documentElement).getPropertyValue("--brand-primary").trim() || "#1f6fd8";

    const labels = comparisonPoints.map((point) =>
      formatMonthYearFromIndex(point.monthIndex, language, { monthStyle: "short" }),
    );
    const labelStep = Math.max(1, Math.ceil(labels.length / 12));

    chart.setOption({
      animationDuration: 500,
      legend: { show: false },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: unknown) =>
          formatCurrencyValue(Number.isFinite(value as number) ? (value as number) : 0),
      },
      grid: { left: 24, right: 12, top: 16, bottom: 24, containLabel: true },
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
        axisLine: { lineStyle: { color: axisColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { formatter: formatCurrencyAxis, color: axisColor },
      },
      series: [
        {
          name: ableLineLabel,
          type: "line",
          smooth: 0.15,
          symbol: "none",
          data: comparisonPoints.map((point) => point.ableEndingBalance),
          lineStyle: { width: 3, color: themeColor },
          itemStyle: { color: themeColor },
        },
        {
          name: taxableLineLabel,
          type: "line",
          smooth: 0.15,
          symbol: "none",
          data: comparisonPoints.map((point) => point.taxableEndingBalance),
          lineStyle: { width: 2, color: taxableColor },
          itemStyle: { color: taxableColor },
        },
      ],
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [ableLineLabel, comparisonPoints, isDarkMode, language, taxableLineLabel]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black/80">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <div className="ml-auto">
          <ReportWindowToggle label={reportWindowLabel} options={reportWindowOptions} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div ref={chartRef} aria-hidden="true" className="h-[440px] w-full min-w-0" />
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-4 rounded-full bg-[var(--brand-primary)]" />
              <span>{ableLineLabel}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-4 rounded-full bg-slate-600 dark:bg-slate-300" />
              <span>{taxableLineLabel}</span>
            </div>
          </div>
        </div>
        <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
          <h3 className="border-b border-zinc-300 pb-2 text-center text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:border-zinc-600 dark:text-zinc-50">
            {panelTitle}
          </h3>
          {summaryMetrics.length ? (
            <dl className="mt-3">
              {summaryMetrics.map((metric, index) => {
                const itemContainerClass = [
                  "mx-2 space-y-1",
                  index > 0
                    ? "mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const isWithdrawalDifferenceMetric = metric.key === "withdrawal-difference";
                const isBalanceAdvantageMetric = metric.key === "ending-balance-advantage";
                const isInvestmentReturnDifferenceMetric = metric.key === "investment-return-difference";
                const isAdditionalEconomicBenefitMetric = metric.key === "additional-economic-benefit";
                if (isWithdrawalDifferenceMetric) {
                  const amount = formatCurrencyValue(Math.abs(metric.value));
                  const template =
                    metric.value >= 0 ? withdrawalDifferenceLabel : taxableWithdrawalDifferenceLabel;
                  const resolvedSentence = template.includes("{{amount}}")
                    ? template.replace("{{amount}}", amount)
                    : `${template} ${amount}`;
                  return (
                    <div key={metric.key} className={itemContainerClass}>
                      <p className="text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                        {resolvedSentence}
                        <button
                          type="button"
                          aria-label={withdrawalInfoToggleAriaLabel}
                          aria-expanded={showWithdrawalInfoMessage}
                          aria-controls="withdrawal-difference-info-message"
                          onClick={() => setShowWithdrawalInfoMessage((prev) => !prev)}
                          className="ml-1 inline-flex h-4 w-4 translate-y-[-1px] items-center justify-center rounded-full border text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
                        >
                          i
                        </button>
                      </p>
                      {showWithdrawalInfoMessage ? (
                        <p
                          id="withdrawal-difference-info-message"
                          className="text-xs font-normal leading-relaxed text-[var(--brand-primary)]"
                        >
                          {withdrawalInfoMessageLabel}
                        </p>
                      ) : null}
                    </div>
                  );
                }
                if (isBalanceAdvantageMetric) {
                  const amount = formatCurrencyValue(Math.abs(metric.value));
                  const taxesAmount = formatCurrencyValue(Math.abs(taxableTotalTaxDrag));
                  const returnsAmount = formatCurrencyValue(Math.abs(investmentReturnDifference));
                  const infoMessage = balanceInfoMessageLabel
                    .replace("{{taxes}}", taxesAmount)
                    .replace("{{returns}}", returnsAmount);
                  const template =
                    metric.value >= 0 ? ableBalanceAdvantageLabel : taxableBalanceAdvantageLabel;
                  const resolvedSentence = template.includes("{{amount}}")
                    ? template.replace("{{amount}}", amount)
                    : `${template} ${amount}`;
                  return (
                    <div key={metric.key} className={itemContainerClass}>
                      <p className="text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                        {resolvedSentence}
                        <button
                          type="button"
                          aria-label={balanceInfoToggleAriaLabel}
                          aria-expanded={showBalanceInfoMessage}
                          aria-controls="balance-advantage-info-message"
                          onClick={() => setShowBalanceInfoMessage((prev) => !prev)}
                          className="ml-1 inline-flex h-4 w-4 translate-y-[-1px] items-center justify-center rounded-full border text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
                        >
                          i
                        </button>
                      </p>
                      {showBalanceInfoMessage ? (
                        <p
                          id="balance-advantage-info-message"
                          className="text-xs font-normal leading-relaxed text-[var(--brand-primary)]"
                        >
                          {infoMessage}
                        </p>
                      ) : null}
                    </div>
                  );
                }
                if (isInvestmentReturnDifferenceMetric) {
                  const amount = formatCurrencyValue(Math.abs(metric.value));
                  const template =
                    metric.value >= 0
                      ? investmentReturnDifferenceLabel
                      : taxableInvestmentReturnDifferenceLabel;
                  const resolvedSentence = template.includes("{{amount}}")
                    ? template.replace("{{amount}}", amount)
                    : `${template} ${amount}`;
                  const hasStateTaxDrag =
                    normalizeCurrencyDisplayValue(Math.abs(taxableStateTaxDrag)) > 0;
                  const taxDragAmount = formatCurrencyValue(Math.abs(taxableTotalTaxDrag));
                  const infoTemplate = hasStateTaxDrag
                    ? investmentReturnInfoMessageWithStateLabel
                    : investmentReturnInfoMessageFederalOnlyLabel;
                  const infoMessage = infoTemplate.includes("{{amount}}")
                    ? infoTemplate.replace("{{amount}}", taxDragAmount)
                    : `${infoTemplate} ${taxDragAmount}`;
                  return (
                    <div key={metric.key} className={itemContainerClass}>
                      <p className="text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                        {resolvedSentence}
                        <button
                          type="button"
                          aria-label={investmentReturnInfoToggleAriaLabel}
                          aria-expanded={showInvestmentReturnInfoMessage}
                          aria-controls="investment-return-difference-info-message"
                          onClick={() => setShowInvestmentReturnInfoMessage((prev) => !prev)}
                          className="ml-1 inline-flex h-4 w-4 translate-y-[-1px] items-center justify-center rounded-full border text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
                        >
                          i
                        </button>
                      </p>
                      {showInvestmentReturnInfoMessage ? (
                        <p
                          id="investment-return-difference-info-message"
                          className="text-xs font-normal leading-relaxed text-[var(--brand-primary)]"
                        >
                          {infoMessage}
                        </p>
                      ) : null}
                    </div>
                  );
                }
                if (isAdditionalEconomicBenefitMetric) {
                  const amount = formatCurrencyValue(Math.abs(metric.value));
                  const hasFederal = additionalEconomicBenefitFederal > 0.005;
                  const hasState = additionalEconomicBenefitState > 0.005;
                  const template = hasFederal && hasState
                    ? additionalEconomicBenefitBothLabel
                    : hasFederal
                      ? additionalEconomicBenefitFederalOnlyLabel
                      : hasState
                        ? additionalEconomicBenefitStateOnlyLabel
                        : additionalEconomicBenefitNoneLabel;
                  const resolvedSentence = template.includes("{{amount}}")
                    ? template.replace("{{amount}}", amount)
                    : template;
                  return (
                    <div key={metric.key} className={itemContainerClass}>
                      <p className="text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                        {resolvedSentence}
                        <button
                          type="button"
                          aria-label={additionalEconomicBenefitInfoToggleAriaLabel}
                          aria-expanded={showAdditionalEconomicBenefitInfoMessage}
                          aria-controls="additional-economic-benefit-info-message"
                          onClick={() => setShowAdditionalEconomicBenefitInfoMessage((prev) => !prev)}
                          className="ml-1 inline-flex h-4 w-4 translate-y-[-1px] items-center justify-center rounded-full border text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
                        >
                          i
                        </button>
                      </p>
                      {showAdditionalEconomicBenefitInfoMessage ? (
                        <p
                          id="additional-economic-benefit-info-message"
                          className="text-xs font-normal leading-relaxed text-[var(--brand-primary)]"
                        >
                          {additionalEconomicBenefitInfoMessageLabel}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div key={metric.key} className={itemContainerClass}>
                    <dt className="text-xs text-zinc-600 dark:text-zinc-300">{metric.label}</dt>
                    <dd className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatSignedCurrencyValue(metric.value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{noDifferencesLabel}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
