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
  isSsiEligible?: boolean;
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

export type SsiMessage = {
  code: string;
  data: { monthLabel: string };
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
    const earnings = currentBalance * monthlyRate;
    let endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;

    const monthSsiCodes: string[] = [];
    if (contributionsStopped) {
      contributionValue = 0;
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;
    }

    if (inputs.isSsiEligible && endingBalance > SSI_LIMIT) {
      if (!contributionsStopped) {
        contributionsStopped = true;
        monthSsiCodes.push("SSI_CONTRIBUTIONS_STOPPED");
      }
      contributionValue = 0;
      endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;

      if (endingBalance > SSI_LIMIT && earnings > 0) {
        if (!forcedWithdrawalsStarted) {
          forcedWithdrawalsStarted = true;
          monthSsiCodes.push("SSI_FORCED_WITHDRAWALS_APPLIED");
        }
        withdrawalValue += Math.floor(earnings);
        endingBalance = currentBalance + earnings + contributionValue - withdrawalValue;
      }

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
