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
  monthlyWithdrawal: number;
  contributionIncreasePct: number;
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
  // Example: annual 0.06 => monthly ≈ 0.00486755 (not 0.005)
  const contributionIncreaseFactor = 1 + Math.max(0, inputs.contributionIncreasePct) / 100;
  const withdrawalIncreaseFactor = 1 + Math.max(0, inputs.withdrawalIncreasePct) / 100;
  let currentBalance = Math.max(0, inputs.startingBalance);
  let currentContribution = Math.max(0, inputs.monthlyContribution);
  let currentWithdrawal = Math.max(0, inputs.monthlyWithdrawal);

  const rows: YearRow[] = [];
  let currentYearRow: YearRow | null = null;

  let contributionsStopped = false;
  let forcedWithdrawalsStarted = false;
  let planMaxContribStopped = false;
  const planMaxBalanceValue = Number.isFinite(inputs.planMaxBalance ?? NaN)
    ? inputs.planMaxBalance ?? 0
    : null;
  let ssiCapMode = false;
  for (let offset = 0; offset < monthsToBuild; offset += 1) {
    const monthIndex = inputs.startMonthIndex + offset;
    if (monthIndex > inputs.horizonEndIndex) {
      break;
    }

    const year = Math.floor(monthIndex / 12);
    const monthNumber = (monthIndex % 12) + 1;
    const monthLabel = `– ${MONTH_NAMES[monthNumber - 1]} ${year}`;

    const contributionActive =
      monthIndex >= inputs.startMonthIndex && monthIndex <= inputs.contributionEndIndex;
    const monthsSinceContributionStart = monthIndex - inputs.startMonthIndex;
    if (
      contributionActive &&
      inputs.contributionIncreasePct > 0 &&
      monthsSinceContributionStart > 0 &&
      monthsSinceContributionStart % 12 === 0
    ) {
      currentContribution *= contributionIncreaseFactor;
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
    let earnings = balanceAfterCashflow * monthlyRate;
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
    earnings = balanceAfterCashflow * monthlyRate;
    endingBalance = balanceAfterCashflow + earnings;

    const projectedBase = currentBalance + earnings + contributionValue - withdrawalValue;
    if (inputs.isSsiEligible && projectedBase > SSI_LIMIT) {
      if (!contributionsStopped) {
        contributionsStopped = true;
        monthSsiCodes.push("SSI_CONTRIBUTIONS_STOPPED");
      }
      contributionValue = 0;

      let forcedWithdrawal = 0;
      const projectedAfterContrib = currentBalance + earnings + contributionValue - withdrawalValue;
      if (!ssiCapMode) {
        forcedWithdrawal = projectedAfterContrib - SSI_LIMIT;
        if (forcedWithdrawal > 0) {
          ssiCapMode = true;
          if (!forcedWithdrawalsStarted) {
            forcedWithdrawalsStarted = true;
            monthSsiCodes.push("SSI_FORCED_WITHDRAWALS_APPLIED");
          }
        }
      } else {
        forcedWithdrawal = Math.max(0, earnings);
        if (forcedWithdrawal > 0 && !forcedWithdrawalsStarted) {
          forcedWithdrawalsStarted = true;
          monthSsiCodes.push("SSI_FORCED_WITHDRAWALS_APPLIED");
        }
      }

      forcedWithdrawal = Math.max(0, forcedWithdrawal);
      withdrawalValue += forcedWithdrawal;
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;

      if (endingBalance > SSI_LIMIT) {
        endingBalance = SSI_LIMIT;
      }
    }

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
  const monthlyReturnDecimal = Math.pow(1 + annualReturnDecimal, 1 / 12) - 1;
  let prevBalance = Math.max(0, startingBalance);
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
      const contribution = Math.max(0, ableMonth.contribution);
      const withdrawal = Math.max(0, ableMonth.withdrawal);
      const balanceBeforeEarnings = prevBalance + contribution;
      const earnings = balanceBeforeEarnings * monthlyReturnDecimal;
     yearContribution += contribution;
     yearWithdrawal += withdrawal;
     yearInvestmentReturn += earnings;
     yearEarnings += earnings;

      const normalizedLabel = ableMonth.monthLabel.replace(/^[-–—]+\s*/, "");
      const isDecember = normalizedLabel.startsWith("Dec ");
      let federalTaxOnEarnings = 0;
      let stateTaxOnEarnings = 0;
      let monthEndingBalance = balanceBeforeEarnings + earnings - withdrawal;
      if (isDecember) {
        const taxableEarnings = Math.max(0, yearEarnings);
        federalTaxOnEarnings = taxableEarnings * federalTaxRateDecimal;
        stateTaxOnEarnings = taxableEarnings * stateTaxRateDecimal;
        monthEndingBalance = balanceBeforeEarnings + earnings - withdrawal - federalTaxOnEarnings - stateTaxOnEarnings;
        yearFederalTax = federalTaxOnEarnings;
        yearStateTax = stateTaxOnEarnings;
        yearEarnings = 0;
      }

      const taxableMonth: TaxableMonthRow = {
        monthIndex: ableMonth.monthIndex,
        monthLabel: ableMonth.monthLabel,
        contribution,
        withdrawal,
        investmentReturn: earnings,
        federalTaxOnEarnings,
        stateTaxOnEarnings,
        endingBalance: monthEndingBalance,
      };

      taxableMonths.push(taxableMonth);
      prevBalance = monthEndingBalance;
      yearEndingBalance = monthEndingBalance;
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

  return taxableYears;
}
