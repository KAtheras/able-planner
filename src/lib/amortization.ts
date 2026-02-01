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

    const contributionValue = contributionActive ? currentContribution : 0;
    const withdrawalValue = withdrawalActive ? currentWithdrawal : 0;
    const earnings = currentBalance * monthlyRate;
    const endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;

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
