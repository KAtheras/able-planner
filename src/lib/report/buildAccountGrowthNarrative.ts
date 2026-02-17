import type { TaxableYearRow, YearRow } from "@/lib/amortization";
import { formatMonthYearFromIndex } from "@/lib/date/formatMonthYear";

type SupportedLanguage = "en" | "es";

type BuildAccountGrowthNarrativeArgs = {
  language: SupportedLanguage;
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
};

const formatCurrencyLabel = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const sumFiniteValues = (values: number[]) =>
  values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);

function buildEnglishTaxBalanceSentence(federalTaxTotal: number, stateTaxTotal: number): string {
  const hasFederal = federalTaxTotal > 0;
  const hasState = stateTaxTotal > 0;
  if (hasFederal && hasState) {
    return `The taxable account's returns are lower, in part, because federal taxes of ${formatCurrencyLabel(federalTaxTotal)} and state taxes of ${formatCurrencyLabel(stateTaxTotal)} during the projection period reduce the taxable account balances over time, which in turn results in lower investment returns.`;
  }
  if (hasFederal) {
    return `The taxable account's returns are lower, in part, because federal taxes of ${formatCurrencyLabel(federalTaxTotal)} during the projection period reduce the taxable account balances over time, which in turn results in lower investment returns.`;
  }
  if (hasState) {
    return `The taxable account's returns are lower, in part, because state taxes of ${formatCurrencyLabel(stateTaxTotal)} during the projection period reduce the taxable account balances over time, which in turn results in lower investment returns.`;
  }
  return "The taxable account's returns are lower, in part, because taxable account balances are reduced over time, which in turn results in lower investment returns.";
}

function buildSpanishTaxBalanceSentence(federalTaxTotal: number, stateTaxTotal: number): string {
  const hasFederal = federalTaxTotal > 0;
  const hasState = stateTaxTotal > 0;
  if (hasFederal && hasState) {
    return `Los rendimientos de la cuenta imponible son menores en parte porque los impuestos federales de ${formatCurrencyLabel(federalTaxTotal)} y los impuestos estatales de ${formatCurrencyLabel(stateTaxTotal)} reducen los saldos de la cuenta imponible con el tiempo, lo que a su vez resulta en menores rendimientos de inversión.`;
  }
  if (hasFederal) {
    return `Los rendimientos de la cuenta imponible son menores en parte porque los impuestos federales de ${formatCurrencyLabel(federalTaxTotal)} reducen los saldos de la cuenta imponible con el tiempo, lo que a su vez resulta en menores rendimientos de inversión.`;
  }
  if (hasState) {
    return `Los rendimientos de la cuenta imponible son menores en parte porque los impuestos estatales de ${formatCurrencyLabel(stateTaxTotal)} reducen los saldos de la cuenta imponible con el tiempo, lo que a su vez resulta en menores rendimientos de inversión.`;
  }
  return "Los rendimientos de la cuenta imponible son menores en parte porque los saldos de la cuenta imponible se reducen con el tiempo, lo que a su vez resulta en menores rendimientos de inversión.";
}

export function buildAccountGrowthNarrative({
  language,
  ableRows,
  taxableRows,
}: BuildAccountGrowthNarrativeArgs): string {
  if (!ableRows.length || !taxableRows.length) {
    return language === "es"
      ? "Ingrese un horizonte temporal para generar el resumen comparativo de crecimiento."
      : "Enter a time horizon to generate the comparative account growth summary.";
  }

  const ableDetailRows = ableRows.filter((row) => row.year >= 0);
  const taxableDetailRows = taxableRows.filter((row) => row.year >= 0);

  const ableContributionTotal = sumFiniteValues(ableDetailRows.map((row) => row.contribution));
  const ableReturnTotal = sumFiniteValues(ableDetailRows.map((row) => row.earnings));
  const taxableReturnTotal = sumFiniteValues(taxableDetailRows.map((row) => row.investmentReturn));
  const ableWithdrawalTotal = sumFiniteValues(ableDetailRows.map((row) => row.withdrawal));
  const taxableWithdrawalTotal = sumFiniteValues(taxableDetailRows.map((row) => row.withdrawal));
  const taxableFederalTaxTotal = sumFiniteValues(taxableDetailRows.map((row) => row.federalTaxOnEarnings));
  const taxableStateTaxTotal = sumFiniteValues(taxableDetailRows.map((row) => row.stateTaxOnEarnings));
  const fscTotal = sumFiniteValues(ableDetailRows.map((row) => row.saversCredit));
  const stateBenefitTotal = sumFiniteValues(ableDetailRows.map((row) => row.stateBenefit));

  const ableEndingBalanceRaw = ableRows.at(-1)?.endingBalance;
  const taxableEndingBalanceRaw = taxableRows.at(-1)?.endingBalance;
  const ableEndingBalance = Number.isFinite(ableEndingBalanceRaw) ? Number(ableEndingBalanceRaw) : 0;
  const taxableEndingBalance = Number.isFinite(taxableEndingBalanceRaw) ? Number(taxableEndingBalanceRaw) : 0;
  const allMonthIndexes = ableDetailRows.flatMap((row) => row.months.map((month) => month.monthIndex));
  const projectionYears = (() => {
    if (!allMonthIndexes.length) return 0;
    const minMonth = Math.min(...allMonthIndexes);
    const maxMonth = Math.max(...allMonthIndexes);
    const totalMonths = Math.max(0, maxMonth - minMonth + 1);
    return Math.max(0, Math.round(totalMonths / 12));
  })();
  const projectionYearsLabel = projectionYears > 0 ? String(projectionYears) : "0";

  let taxableDepletionLabel: string | null = null;
  for (const yearRow of taxableDetailRows) {
    for (const monthRow of yearRow.months) {
      if (!Number.isFinite(monthRow.endingBalance)) continue;
      if (monthRow.endingBalance <= 0.01) {
        taxableDepletionLabel = formatMonthYearFromIndex(monthRow.monthIndex, language, {
          monthStyle: "long",
        });
        break;
      }
    }
    if (taxableDepletionLabel) break;
  }

  if (language === "es") {
    const withdrawalsSentence =
      ableWithdrawalTotal <= 0.01 && taxableWithdrawalTotal <= 0.01
        ? "No hubo retiros programados durante el período."
        : Math.abs(ableWithdrawalTotal - taxableWithdrawalTotal) <= 0.01
          ? `Los retiros totales son ${formatCurrencyLabel(ableWithdrawalTotal)} tanto para las cuentas ABLE como imponible.`
        : `Los retiros totales son ${formatCurrencyLabel(ableWithdrawalTotal)} en ABLE y ${formatCurrencyLabel(taxableWithdrawalTotal)} en imponible.`;
    const paragraphs: string[] = [
      `En una proyeccion de ${projectionYearsLabel} anos, las contribuciones son ${formatCurrencyLabel(ableContributionTotal)} tanto en ABLE como en la cuenta imponible.`,
      `La cuenta ABLE genera ${formatCurrencyLabel(ableReturnTotal)} en rendimientos de inversión frente a ${formatCurrencyLabel(taxableReturnTotal)} en la cuenta imponible. ${buildSpanishTaxBalanceSentence(taxableFederalTaxTotal, taxableStateTaxTotal)}`,
      withdrawalsSentence,
      `Los saldos finales son ${formatCurrencyLabel(ableEndingBalance)} en ABLE y ${formatCurrencyLabel(taxableEndingBalance)} en imponible.`,
    ];
    const depletion =
      taxableDepletionLabel && taxableWithdrawalTotal + 0.01 < ableWithdrawalTotal
        ? ` La cuenta imponible llega a cero en ${taxableDepletionLabel}, por lo que los retiros imponibles se detienen antes que en ABLE.`
        : "";
    const spanishBenefitParts: string[] = [];
    if (fscTotal > 0) {
      spanishBenefitParts.push(`${formatCurrencyLabel(fscTotal)} por Crédito del Ahorrador Federal`);
    }
    if (stateBenefitTotal > 0) {
      spanishBenefitParts.push(`${formatCurrencyLabel(stateBenefitTotal)} por beneficios fiscales estatales`);
    }
    const benefits =
      spanishBenefitParts.length > 0
        ? ` Además, durante el período de proyección, se estima que la cuenta ABLE puede proporcionar beneficios económicos adicionales potenciales de ${spanishBenefitParts.join(" y ")}. Estos beneficios son adicionales y no están incluidos en el saldo de la cuenta ABLE indicado arriba.`
        : "";
    if (depletion) paragraphs.push(depletion.trim());
    if (benefits) paragraphs.push(benefits.trim());
    return paragraphs.join("\n\n");
  }

  const englishDepletionParenthetical =
    taxableDepletionLabel && taxableWithdrawalTotal + 0.01 < ableWithdrawalTotal
      ? ` (The taxable account reaches zero in ${taxableDepletionLabel}, so taxable account withdrawals stop earlier than ABLE withdrawals.)`
      : "";

  const withdrawalsSentence =
    ableWithdrawalTotal <= 0.01 && taxableWithdrawalTotal <= 0.01
      ? "There were no withdrawals scheduled during the projection."
      : Math.abs(ableWithdrawalTotal - taxableWithdrawalTotal) <= 0.01
        ? `Total withdrawals are ${formatCurrencyLabel(ableWithdrawalTotal)} for both ABLE and taxable accounts.${englishDepletionParenthetical}`
      : `Total withdrawals are ${formatCurrencyLabel(ableWithdrawalTotal)} from ABLE and ${formatCurrencyLabel(taxableWithdrawalTotal)} from taxable.${englishDepletionParenthetical}`;
  const endingBalancesSentence =
    Math.abs(ableEndingBalance - taxableEndingBalance) <= 0.01
      ? `Ending account balances are projected to be ${formatCurrencyLabel(ableEndingBalance)} for both the ABLE and the taxable accounts.`
      : `Ending account balances are projected to be ${formatCurrencyLabel(ableEndingBalance)} for ABLE account and ${formatCurrencyLabel(taxableEndingBalance)} for the taxable account.`;

  const paragraphs: string[] = [
    `Over a ${projectionYearsLabel} year projection, contributions are ${formatCurrencyLabel(ableContributionTotal)} in both ABLE and the taxable account.`,
    `The ABLE account is projected to earn ${formatCurrencyLabel(ableReturnTotal)} in investment returns versus ${formatCurrencyLabel(taxableReturnTotal)} in the taxable account. ${buildEnglishTaxBalanceSentence(taxableFederalTaxTotal, taxableStateTaxTotal)}`,
    withdrawalsSentence,
    endingBalancesSentence,
  ];
  const englishBenefitParts: string[] = [];
  if (fscTotal > 0) {
    englishBenefitParts.push(`${formatCurrencyLabel(fscTotal)} in Federal Saver's Credits`);
  }
  if (stateBenefitTotal > 0) {
    englishBenefitParts.push(`${formatCurrencyLabel(stateBenefitTotal)} in state tax benefits`);
  }
  const benefits =
    englishBenefitParts.length > 0
      ? ` Also, during the projection period, the ABLE account is estimated to provide potential additional economic benefits of ${englishBenefitParts.join(" and ")} on contributions. These benefits are in addition to and are not included in the ABLE account balance above.`
      : "";
  if (benefits) paragraphs.push(benefits.trim());
  return paragraphs.join("\n\n");
}
