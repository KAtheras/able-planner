import type { TaxableYearRow, YearRow } from "@/lib/amortization";

type SupportedLanguage = "en" | "es";

type BuildAccountGrowthNarrativeArgs = {
  language: SupportedLanguage;
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatCurrencyLabel = (value: number) => formatCurrency(value).replace(".00", "");

const sumFiniteValues = (values: number[]) =>
  values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);

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

  const ableContributionTotal = sumFiniteValues(ableRows.map((row) => row.contribution));
  const taxableContributionTotal = sumFiniteValues(taxableRows.map((row) => row.contribution));
  const ableReturnTotal = sumFiniteValues(ableRows.map((row) => row.earnings));
  const taxableReturnTotal = sumFiniteValues(taxableRows.map((row) => row.investmentReturn));
  const ableWithdrawalTotal = sumFiniteValues(ableRows.map((row) => row.withdrawal));
  const taxableWithdrawalTotal = sumFiniteValues(taxableRows.map((row) => row.withdrawal));
  const taxableFederalTaxTotal = sumFiniteValues(taxableRows.map((row) => row.federalTaxOnEarnings));
  const taxableStateTaxTotal = sumFiniteValues(taxableRows.map((row) => row.stateTaxOnEarnings));
  const fscTotal = sumFiniteValues(ableRows.map((row) => row.saversCredit));
  const stateBenefitTotal = sumFiniteValues(ableRows.map((row) => row.stateBenefit));

  const ableEndingBalanceRaw = ableRows.at(-1)?.endingBalance;
  const taxableEndingBalanceRaw = taxableRows.at(-1)?.endingBalance;
  const ableEndingBalance = Number.isFinite(ableEndingBalanceRaw) ? ableEndingBalanceRaw : 0;
  const taxableEndingBalance = Number.isFinite(taxableEndingBalanceRaw) ? taxableEndingBalanceRaw : 0;

  let taxableDepletionLabel: string | null = null;
  for (const yearRow of taxableRows) {
    for (const monthRow of yearRow.months) {
      if (!Number.isFinite(monthRow.endingBalance)) continue;
      if (monthRow.endingBalance <= 0.01) {
        taxableDepletionLabel = monthRow.monthLabel;
        break;
      }
    }
    if (taxableDepletionLabel) break;
  }

  if (language === "es") {
    const base = `En esta proyección, las contribuciones son ${formatCurrencyLabel(ableContributionTotal)} en ABLE y ${formatCurrencyLabel(taxableContributionTotal)} en la cuenta imponible. La cuenta ABLE genera ${formatCurrencyLabel(ableReturnTotal)} en rendimientos de inversión frente a ${formatCurrencyLabel(taxableReturnTotal)} en la cuenta imponible, donde los rendimientos se reducen por impuestos estimados de ${formatCurrencyLabel(taxableFederalTaxTotal)} federales y ${formatCurrencyLabel(taxableStateTaxTotal)} estatales. Los retiros totales son ${formatCurrencyLabel(ableWithdrawalTotal)} en ABLE y ${formatCurrencyLabel(taxableWithdrawalTotal)} en imponible. Los saldos finales son ${formatCurrencyLabel(ableEndingBalance)} en ABLE y ${formatCurrencyLabel(taxableEndingBalance)} en imponible.`;
    const depletion =
      taxableDepletionLabel && taxableWithdrawalTotal + 0.01 < ableWithdrawalTotal
        ? ` La cuenta imponible llega a cero en ${taxableDepletionLabel}, por lo que los retiros imponibles se detienen antes que en ABLE.`
        : "";
    const benefits =
      fscTotal > 0 || stateBenefitTotal > 0
        ? ` Los beneficios económicos potenciales mostrados por separado del saldo ABLE son ${formatCurrencyLabel(fscTotal)} por Crédito del Ahorrador Federal y ${formatCurrencyLabel(stateBenefitTotal)} por beneficio fiscal estatal.`
        : "";
    return `${base}${depletion}${benefits}`;
  }

  const base = `Over this projection, contributions are ${formatCurrencyLabel(ableContributionTotal)} in ABLE and ${formatCurrencyLabel(taxableContributionTotal)} in the taxable account. The ABLE account earns ${formatCurrencyLabel(ableReturnTotal)} in investment returns versus ${formatCurrencyLabel(taxableReturnTotal)} in the taxable account, where returns are reduced by an estimated ${formatCurrencyLabel(taxableFederalTaxTotal)} in federal taxes and ${formatCurrencyLabel(taxableStateTaxTotal)} in state taxes. Total withdrawals are ${formatCurrencyLabel(ableWithdrawalTotal)} from ABLE and ${formatCurrencyLabel(taxableWithdrawalTotal)} from taxable. Ending balances are ${formatCurrencyLabel(ableEndingBalance)} for ABLE and ${formatCurrencyLabel(taxableEndingBalance)} for taxable.`;
  const depletion =
    taxableDepletionLabel && taxableWithdrawalTotal + 0.01 < ableWithdrawalTotal
      ? ` The taxable account reaches zero in ${taxableDepletionLabel}, so taxable withdrawals stop earlier than ABLE withdrawals.`
      : "";
  const benefits =
    fscTotal > 0 || stateBenefitTotal > 0
      ? ` Additional potential economic benefits disclosed separately from ABLE balance are ${formatCurrencyLabel(fscTotal)} in Federal Saver's Credit and ${formatCurrencyLabel(stateBenefitTotal)} in state tax benefits.`
      : "";
  return `${base}${depletion}${benefits}`;
}
