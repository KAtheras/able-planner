export type MonthlyRow = {
  monthLabel: string;
  year: number;
  monthIndex: number;
  contribution: number;
  withdrawal: number;
  earnings: number;
  endingBalance: number;
  fedTax: number;
  stateTax: number;
  saversCredit: number;
  stateBenefit: number;
  ssiCodes?: string[];
  planCodes?: string[];
};

export type YearRow = {
  yearLabel: string;
  year: number;
  contribution: number;
  withdrawal: number;
  earnings: number;
  fedTax: number;
  stateTax: number;
  saversCredit: number;
  stateBenefit: number;
  endingBalance: number;
  months: MonthlyRow[];
};

export type TaxableMonthRow = {
  monthIndex: number;
  monthLabel: string;
  contribution: number;
  withdrawal: number;
  investmentReturn: number;
  federalTaxOnEarnings: number;
  stateTaxOnEarnings: number;
  endingBalance: number;
};

export type TaxableYearRow = {
  year: number;
  months: TaxableMonthRow[];
  contribution: number;
  withdrawal: number;
  investmentReturn: number;
  federalTaxOnEarnings: number;
  stateTaxOnEarnings: number;
  endingBalance: number;
};

export type AmortizationInputs = {
  startMonthIndex: number;
  totalMonths: number;
  horizonEndIndex: number;
  startingBalance: number;
  monthlyContribution: number;
  monthlyContributionCurrentYear?: number;
  monthlyContributionFutureYears?: number;
  monthlyWithdrawal: number;
  contributionIncreasePct: number;
  stopContributionIncreasesAfterYear?: number | null;
  withdrawalIncreasePct: number;
  contributionEndIndex: number;
  withdrawalStartIndex: number;
  annualReturnDecimal: number;
  isSsiEligible?: boolean;
  planMaxBalance?: number | null;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MAX_MONTHS = 900;

const SSI_LIMIT = 100000;
const PLAN_STOP_CODE = "PLAN_MAX_CONTRIBUTIONS_STOPPED";

export type SsiMessage = {
  code: string;
  data: { monthLabel: string };
};

export type PlanMessage = {
  code: typeof PLAN_STOP_CODE;
  data: { monthLabel: string; planMax: number };
};

export function extractSsiMessages(rows: YearRow[]): SsiMessage[] {
  const seen: Record<string, boolean> = {};
  const out: SsiMessage[] = [];

  for (const yearRow of rows) {
    for (const monthRow of yearRow.months) {
      if (!monthRow.ssiCodes?.length) continue;
      for (const code of monthRow.ssiCodes) {
        if (seen[code]) continue;
        seen[code] = true;
        let label = monthRow.monthLabel;
        label = label.replace(/^[-–—]+\s*/, "");
        out.push({ code, data: { monthLabel: label } });
      }
    }
  }

  return out;
}

export function extractPlanMessages(rows: YearRow[], planMaxBalance: number | null): PlanMessage[] {
  if (!Number.isFinite(planMaxBalance ?? NaN) || planMaxBalance === null) {
    return [];
  }

  const seen: Record<string, boolean> = {};
  const out: PlanMessage[] = [];
  for (const yearRow of rows) {
    for (const monthRow of yearRow.months) {
      if (!monthRow.planCodes?.length) continue;
      for (const code of monthRow.planCodes) {
        if (seen[code]) continue;
        if (code !== PLAN_STOP_CODE) continue;
        seen[code] = true;
        let label = monthRow.monthLabel;
        label = label.replace(/^[-–—]+\s*/, "");
        out.push({ code: PLAN_STOP_CODE, data: { monthLabel: label, planMax: planMaxBalance } });
      }
    }
  }

  return out;
}

export function buildAmortizationSchedule(inputs: AmortizationInputs): YearRow[] {
  const monthsToBuild = Math.min(Math.max(0, inputs.totalMonths), MAX_MONTHS);
  if (monthsToBuild <= 0) {
    return [];
  }

    const monthlyRate =
      Math.pow(1 + inputs.annualReturnDecimal, 1 / 12) - 1;
    const computeEarnings = (basis: number) => {
      const normalizedBasis = Number.isFinite(basis) ? Math.max(0, basis) : 0;
      const result = normalizedBasis * monthlyRate;
      if (!Number.isFinite(result) || result < 0) {
        return 0;
      }
      return result;
    };
  // Example: annual 0.06 => monthly ≈ 0.00486755 (not 0.005)
  const contributionIncreaseFactor = 1 + Math.max(0, inputs.contributionIncreasePct) / 100;
  const withdrawalIncreaseFactor = 1 + Math.max(0, inputs.withdrawalIncreasePct) / 100;
  let currentBalance = Math.max(0, inputs.startingBalance);
  const baseCurrentYearContribution = Math.max(
    0,
    inputs.monthlyContributionCurrentYear ?? inputs.monthlyContribution,
  );
  const baseFutureYearContribution = Math.max(
    0,
    inputs.monthlyContributionFutureYears ?? inputs.monthlyContribution,
  );
  const startCalendarYear = Math.floor(inputs.startMonthIndex / 12);
  let currentBaseForPeriod = baseCurrentYearContribution;
  let contributionMultiplier = 1;
  let currentContribution = currentBaseForPeriod * contributionMultiplier;
  let currentWithdrawal = Math.max(0, inputs.monthlyWithdrawal);

  const rows: YearRow[] = [];
  let currentYearRow: YearRow | null = null;

  let contributionsStopped = false;
  let forcedWithdrawalsStarted = false;
  let planMaxContribStopped = false;
  const planMaxBalanceValue = Number.isFinite(inputs.planMaxBalance ?? NaN)
    ? inputs.planMaxBalance ?? 0
    : null;
  let withdrawalsStopped = false;
  for (let offset = 0; offset < monthsToBuild; offset += 1) {
    const monthIndex = inputs.startMonthIndex + offset;
    if (monthIndex > inputs.horizonEndIndex) {
      break;
    }

    const year = Math.floor(monthIndex / 12);
    const monthNumber = (monthIndex % 12) + 1;
    const monthLabel = `– ${MONTH_NAMES[monthNumber - 1]} ${year}`;
    const currentMonthCalendarYear = Math.floor(monthIndex / 12);
    const relevantBase =
      currentMonthCalendarYear === startCalendarYear
        ? baseCurrentYearContribution
        : baseFutureYearContribution;
    if (relevantBase !== currentBaseForPeriod) {
      currentBaseForPeriod = relevantBase;
      currentContribution = currentBaseForPeriod * contributionMultiplier;
    }

    const contributionActive =
      monthIndex >= inputs.startMonthIndex && monthIndex <= inputs.contributionEndIndex;
    const monthsSinceContributionStart = monthIndex - inputs.startMonthIndex;
    if (
      contributionActive &&
      inputs.contributionIncreasePct > 0 &&
      monthsSinceContributionStart > 0 &&
      monthsSinceContributionStart % 12 === 0
    ) {
      const completedYears = Math.floor(monthsSinceContributionStart / 12);
      const stopAfterYear = inputs.stopContributionIncreasesAfterYear ?? null;
      // Example: stopAfterYear=5 => do NOT apply the increase at the start of year 6 (completedYears === 5).
      if (stopAfterYear === null || !Number.isFinite(stopAfterYear) || completedYears < stopAfterYear) {
        contributionMultiplier *= contributionIncreaseFactor;
        currentContribution = currentBaseForPeriod * contributionMultiplier;
      }
    }

    const withdrawalActive = monthIndex >= inputs.withdrawalStartIndex;
    const monthsSinceWithdrawalStart = monthIndex - inputs.withdrawalStartIndex;
    if (
      withdrawalActive &&
      inputs.withdrawalIncreasePct > 0 &&
      monthsSinceWithdrawalStart > 0 &&
      monthsSinceWithdrawalStart % 12 === 0
    ) {
      currentWithdrawal *= withdrawalIncreaseFactor;
    }

    let contributionValue = contributionActive ? currentContribution : 0;
    let withdrawalValue = withdrawalActive ? currentWithdrawal : 0;
    let balanceAfterCashflow = currentBalance + contributionValue - withdrawalValue;
    let earnings = computeEarnings(balanceAfterCashflow);
    let endingBalance = balanceAfterCashflow + earnings;

    const monthSsiCodes: string[] = [];
    const monthPlanCodes: string[] = [];
    const hasPlanMax =
      planMaxBalanceValue !== null && Number.isFinite(planMaxBalanceValue) && planMaxBalanceValue > 0;
    if (
      hasPlanMax &&
      !planMaxContribStopped &&
      endingBalance >= planMaxBalanceValue!
    ) {
      planMaxContribStopped = true;
      contributionValue = 0;
      monthPlanCodes.push(PLAN_STOP_CODE);
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;
    }
    if (planMaxContribStopped) {
      contributionValue = 0;
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;
    }
    if (contributionsStopped) {
      contributionValue = 0;
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;
    }

    balanceAfterCashflow = currentBalance + contributionValue - withdrawalValue;
    earnings = computeEarnings(balanceAfterCashflow);
    endingBalance = balanceAfterCashflow + earnings;

    const projectedBase = currentBalance + earnings + contributionValue - withdrawalValue;
    if (inputs.isSsiEligible && projectedBase > SSI_LIMIT) {
      if (!contributionsStopped) {
        contributionsStopped = true;
        monthSsiCodes.push("SSI_CONTRIBUTIONS_STOPPED");
      }
      contributionValue = 0;

      // Apply only the incremental forced withdrawal needed after user-scheduled
      // withdrawals so SSI-cap mode targets (and does not undershoot) 100,000.
      const projectedAfterContrib = currentBalance + earnings + contributionValue - withdrawalValue;
      const forcedWithdrawal = Math.max(0, projectedAfterContrib - SSI_LIMIT);
      if (forcedWithdrawal > 0) {
        if (!forcedWithdrawalsStarted) {
          forcedWithdrawalsStarted = true;
          monthSsiCodes.push("SSI_FORCED_WITHDRAWALS_APPLIED");
        }
      }

      withdrawalValue += forcedWithdrawal;
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;

      if (endingBalance > SSI_LIMIT) {
        endingBalance = SSI_LIMIT;
      }
    }

    // Guard withdrawals so we never drive balances negative.
    const safeContribution = Number.isFinite(contributionValue) ? contributionValue : 0;
    const safeEarnings = Number.isFinite(earnings) ? earnings : 0;
    const startingBalanceForMonth = Number.isFinite(currentBalance) ? currentBalance : 0;
    const availableFunds = Math.max(0, startingBalanceForMonth + safeContribution + safeEarnings);
    const plannedWithdrawal = Number.isFinite(withdrawalValue) ? Math.max(0, withdrawalValue) : 0;
    let actualWithdrawal = plannedWithdrawal;
    let adjustedEndingBalance = availableFunds;

    if (withdrawalsStopped) {
      actualWithdrawal = 0;
    } else if (availableFunds <= 0) {
      actualWithdrawal = 0;
      adjustedEndingBalance = 0;
    } else if (plannedWithdrawal <= availableFunds) {
      adjustedEndingBalance = availableFunds - plannedWithdrawal;
    } else if (safeContribution > 0) {
      // cap withdrawals to contributions + earnings when contributions still arrive
      actualWithdrawal = Math.min(plannedWithdrawal, Math.max(0, safeContribution + safeEarnings));
      adjustedEndingBalance = Math.max(0, availableFunds - actualWithdrawal);
    } else {
      // final bucket-empty withdrawal then stop future draws
      actualWithdrawal = Math.min(plannedWithdrawal, availableFunds);
      adjustedEndingBalance = Math.max(0, availableFunds - actualWithdrawal);
      if (adjustedEndingBalance === 0) {
        withdrawalsStopped = true;
      }
    }

    withdrawalValue = actualWithdrawal;
    endingBalance = adjustedEndingBalance;

    const monthRow: MonthlyRow = {
      monthLabel,
      year,
      monthIndex,
      contribution: contributionValue,
      withdrawal: withdrawalValue,
      earnings,
      endingBalance,
      fedTax: 0,
      stateTax: 0,
      saversCredit: 0,
      stateBenefit: 0,
      ssiCodes: monthSsiCodes.length ? monthSsiCodes : undefined,
      planCodes: monthPlanCodes.length ? monthPlanCodes : undefined,
    };

    currentBalance = endingBalance;

    if (!currentYearRow || currentYearRow.year !== year) {
    currentYearRow = {
      yearLabel: String(year),
        year,
        contribution: 0,
        withdrawal: 0,
        earnings: 0,
        fedTax: 0,
        stateTax: 0,
        saversCredit: 0,
        stateBenefit: 0,
        endingBalance: endingBalance,
        months: [],
      };
      rows.push(currentYearRow);
    }

    currentYearRow.months.push(monthRow);
    currentYearRow.contribution += contributionValue;
    currentYearRow.withdrawal += withdrawalValue;
    currentYearRow.earnings += earnings;
    currentYearRow.endingBalance = endingBalance;
  }

  const totalableRow = rows.reduce(
    (acc, row) => {
      acc.contribution += row.contribution;
      acc.withdrawal += row.withdrawal;
      acc.earnings += row.earnings;
      acc.endingBalance = Number.isFinite(row.endingBalance) ? row.endingBalance : acc.endingBalance;
      return acc;
    },
    { contribution: 0, withdrawal: 0, earnings: 0, endingBalance: Number.NaN },
  );
  rows.unshift({
    yearLabel: "Account totals",
    year: -1,
    contribution: totalableRow.contribution,
    withdrawal: totalableRow.withdrawal,
    earnings: totalableRow.earnings,
    fedTax: 0,
    stateTax: 0,
    saversCredit: 0,
    stateBenefit: 0,
    endingBalance: Number.NaN,
    months: [],
  });
  return rows;
}

export function buildTaxableInvestmentScheduleFromAbleSchedule({
  ableRows,
  annualReturnDecimal,
  federalTaxRateDecimal,
  stateTaxRateDecimal,
  startingBalance,
}: {
  ableRows: YearRow[];
  annualReturnDecimal: number;
  federalTaxRateDecimal: number;
  stateTaxRateDecimal: number;
  startingBalance: number;
}): TaxableYearRow[] {
  const safeAnnualReturnDecimal = Number.isFinite(annualReturnDecimal) ? annualReturnDecimal : 0;
  const safeFederalTaxRateDecimal = Number.isFinite(federalTaxRateDecimal) ? Math.max(0, federalTaxRateDecimal) : 0;
  const safeStateTaxRateDecimal = Number.isFinite(stateTaxRateDecimal) ? Math.max(0, stateTaxRateDecimal) : 0;
  const monthlyReturnDecimal = Math.pow(1 + safeAnnualReturnDecimal, 1 / 12) - 1;
  let prevBalance = Number.isFinite(startingBalance) ? Math.max(0, startingBalance) : 0;
  const taxableYears: TaxableYearRow[] = [];

  for (const ableYear of ableRows) {
    let yearContribution = 0;
    let yearWithdrawal = 0;
    let yearEarnings = 0;
    let yearInvestmentReturn = 0;
    let yearFederalTax = 0;
    let yearStateTax = 0;
    let yearEndingBalance = prevBalance;
    const taxableMonths: TaxableMonthRow[] = [];

    for (const ableMonth of ableYear.months) {
      const contribution = Number.isFinite(ableMonth.contribution) ? Math.max(0, ableMonth.contribution) : 0;
      const withdrawal = Number.isFinite(ableMonth.withdrawal) ? Math.max(0, ableMonth.withdrawal) : 0;
      const availableBalance = prevBalance + contribution;
      const normalizedLabel = ableMonth.monthLabel.replace(/^[-–—]+\s*/, "");
      const isDecember = normalizedLabel.startsWith("Dec ");

      let federalTaxOnEarnings = 0;
      let stateTaxOnEarnings = 0;
      const safeAvailableBalance = Math.max(0, Number.isFinite(availableBalance) ? availableBalance : 0);
      const shouldPostDepletionYearTaxNow =
        !isDecember && yearEarnings > 0 && withdrawal >= safeAvailableBalance && safeAvailableBalance > 0;
      let reservedForTax = 0;
      if (shouldPostDepletionYearTaxNow) {
        const taxableEarnings = Math.max(0, yearEarnings);
        const federalDue = taxableEarnings * safeFederalTaxRateDecimal;
        const stateDue = taxableEarnings * safeStateTaxRateDecimal;
        const totalDue = federalDue + stateDue;
        if (totalDue > 0) {
          reservedForTax = Math.min(safeAvailableBalance, totalDue);
          const federalShare = federalDue / totalDue;
          federalTaxOnEarnings = reservedForTax * federalShare;
          stateTaxOnEarnings = reservedForTax - federalTaxOnEarnings;
          yearFederalTax += federalTaxOnEarnings;
          yearStateTax += stateTaxOnEarnings;
          yearEarnings = 0;
        }
      }

      const distributableBalance = Math.max(0, safeAvailableBalance - reservedForTax);
      const actualWithdrawal = Math.min(withdrawal, distributableBalance);
      const balanceAfterCashFlow = distributableBalance - actualWithdrawal;
      // Taxable schedule uses same cashflow timing as ABLE: contributions + withdrawals assumed at start of month.
      const normalizedBasis = Math.max(0, Number.isFinite(balanceAfterCashFlow) ? balanceAfterCashFlow : 0);
      let earnings = normalizedBasis * monthlyReturnDecimal;
      if (!Number.isFinite(earnings) || earnings < 0) {
        earnings = 0;
      }
      yearContribution += contribution;
      yearWithdrawal += actualWithdrawal;
      yearInvestmentReturn += earnings;
      yearEarnings += earnings;

      let monthEndingBalance = normalizedBasis + earnings;
      if (isDecember) {
        const taxableEarnings = Math.max(0, yearEarnings);
        federalTaxOnEarnings += taxableEarnings * safeFederalTaxRateDecimal;
        stateTaxOnEarnings += taxableEarnings * safeStateTaxRateDecimal;
        monthEndingBalance = normalizedBasis + earnings - federalTaxOnEarnings - stateTaxOnEarnings;
        yearFederalTax += taxableEarnings * safeFederalTaxRateDecimal;
        yearStateTax += taxableEarnings * safeStateTaxRateDecimal;
        yearEarnings = 0;
      }

      const taxableMonth: TaxableMonthRow = {
        monthIndex: ableMonth.monthIndex,
        monthLabel: ableMonth.monthLabel,
        contribution,
        withdrawal: actualWithdrawal,
        investmentReturn: earnings,
        federalTaxOnEarnings,
        stateTaxOnEarnings,
        endingBalance: monthEndingBalance,
      };

      taxableMonths.push(taxableMonth);
      prevBalance = monthEndingBalance;
      yearEndingBalance = monthEndingBalance;
    }

    if (taxableMonths.length > 0 && yearEarnings > 0) {
        const taxableEarnings = Math.max(0, yearEarnings);
        const extraFederal = taxableEarnings * safeFederalTaxRateDecimal;
        const extraState = taxableEarnings * safeStateTaxRateDecimal;
      const lastIdx = taxableMonths.length - 1;
      taxableMonths[lastIdx].federalTaxOnEarnings += extraFederal;
      taxableMonths[lastIdx].stateTaxOnEarnings += extraState;
      taxableMonths[lastIdx].endingBalance -= extraFederal + extraState;
      prevBalance = taxableMonths[lastIdx].endingBalance;
      yearEndingBalance = prevBalance;
      yearFederalTax += extraFederal;
      yearStateTax += extraState;
      yearEarnings = 0;
    }

    taxableYears.push({
      year: ableYear.year,
      months: taxableMonths,
      contribution: yearContribution,
      withdrawal: yearWithdrawal,
      investmentReturn: yearInvestmentReturn,
      federalTaxOnEarnings: yearFederalTax,
      stateTaxOnEarnings: yearStateTax,
      endingBalance: yearEndingBalance,
    });
  }

  const taxableTotals = taxableYears.reduce(
    (acc, row) => {
      acc.contribution += row.contribution;
      acc.withdrawal += row.withdrawal;
      acc.investmentReturn += row.investmentReturn;
      return acc;
    },
    { contribution: 0, withdrawal: 0, investmentReturn: 0 },
  );
  taxableYears.unshift({
    year: -1,
    months: [],
    contribution: taxableTotals.contribution,
    withdrawal: taxableTotals.withdrawal,
    investmentReturn: taxableTotals.investmentReturn,
    federalTaxOnEarnings: 0,
    stateTaxOnEarnings: 0,
    endingBalance: Number.NaN,
  });
  return taxableYears;
}
