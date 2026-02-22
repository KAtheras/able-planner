import { getClientConfig } from "@/config/clients";

export type DemographicsFormUpdates = {
  beneficiaryName?: string;
  stateOfResidence?: string;
  filingStatus?: string;
  agi?: string;
  annualReturn?: string;
  isSsiEligible?: boolean;
};

type DemographicsFormHandlerDeps = {
  plannerStateCode: string;
  sanitizeAgiInput: (value: string) => string;
  parsePercentStringToDecimal: (value: string) => number | null;
  formatDecimalToPercentString: (value: number) => string;
  setBeneficiaryName: (value: string) => void;
  setBeneficiaryStateOfResidence: (value: string) => void;
  setPlannerFilingStatus: (value: string) => void;
  setPlannerAgi: (value: string) => void;
  setAnnualReturnEdited: (value: boolean) => void;
  setAnnualReturn: (value: string) => void;
  setAnnualReturnWarningMax: (value: number | null) => void;
  setIsSsiEligible: (value: boolean) => void;
};

export function buildDemographicsFormChangeHandler({
  plannerStateCode,
  sanitizeAgiInput,
  parsePercentStringToDecimal,
  formatDecimalToPercentString,
  setBeneficiaryName,
  setBeneficiaryStateOfResidence,
  setPlannerFilingStatus,
  setPlannerAgi,
  setAnnualReturnEdited,
  setAnnualReturn,
  setAnnualReturnWarningMax,
  setIsSsiEligible,
}: DemographicsFormHandlerDeps) {
  return (updates: DemographicsFormUpdates) => {
    if ("beneficiaryName" in updates) setBeneficiaryName(updates.beneficiaryName ?? "");
    if ("stateOfResidence" in updates) setBeneficiaryStateOfResidence(updates.stateOfResidence ?? "");
    if ("filingStatus" in updates) setPlannerFilingStatus(updates.filingStatus ?? "single");
    if ("agi" in updates) setPlannerAgi(sanitizeAgiInput(updates.agi ?? ""));
    if ("annualReturn" in updates) {
      setAnnualReturnEdited(true);

      const raw = (updates.annualReturn ?? "").toString();
      const dec = parsePercentStringToDecimal(raw);

      if (dec === null) {
        setAnnualReturn("");
        setAnnualReturnWarningMax(null);
      } else {
        const client = getClientConfig(plannerStateCode);
        const warningMax = client?.constraints?.annualReturnWarningMax;
        const hardMax = client?.constraints?.annualReturnHardMax;

        let nextDec = Math.max(0, dec);

        if (typeof hardMax === "number" && Number.isFinite(hardMax)) {
          if (nextDec > hardMax) nextDec = hardMax;
        }

        setAnnualReturn(formatDecimalToPercentString(nextDec));

        if (typeof warningMax === "number" && Number.isFinite(warningMax)) {
          if (nextDec > warningMax) {
            setAnnualReturnWarningMax(warningMax);
          } else {
            setAnnualReturnWarningMax(null);
          }
        } else {
          setAnnualReturnWarningMax(null);
        }
      }
    }
    if ("isSsiEligible" in updates) setIsSsiEligible(Boolean(updates.isSsiEligible));
  };
}

export type AccountActivityFormUpdates = {
  timeHorizonYears?: string;
  startingBalance?: string;
  monthlyContribution?: string;
  contributionEndYear?: string;
  contributionEndMonth?: string;
  monthlyWithdrawal?: string;
  withdrawalStartYear?: string;
  withdrawalStartMonth?: string;
  contributionIncreasePct?: string;
  withdrawalIncreasePct?: string;
};

type AccountActivityFormHandlerDeps = {
  sanitizeAmountInput: (value: string) => string;
  handleManualWithdrawalOverride: (value: string) => void;
  setTimeHorizonYears: (value: string) => void;
  setTimeHorizonEdited: (value: boolean) => void;
  setStartingBalance: (value: string) => void;
  setMonthlyContribution: (value: string) => void;
  setMonthlyContributionFuture: (value: string) => void;
  setContributionEndTouched: (value: boolean) => void;
  setManualContributionEndYear: (value: string) => void;
  setContributionEndYear: (value: string) => void;
  setManualContributionEndMonth: (value: string) => void;
  setContributionEndMonth: (value: string) => void;
  setWithdrawalStartTouched: (value: boolean) => void;
  setManualWithdrawalStartYear: (value: string) => void;
  setWithdrawalStartYear: (value: string) => void;
  setManualWithdrawalStartMonth: (value: string) => void;
  setWithdrawalStartMonth: (value: string) => void;
  setContributionIncreasePct: (value: string) => void;
  setHasUserEnteredContributionIncrease: (value: boolean) => void;
  setWithdrawalIncreasePct: (value: string) => void;
};

export function buildAccountActivityFormChangeHandler({
  sanitizeAmountInput,
  handleManualWithdrawalOverride,
  setTimeHorizonYears,
  setTimeHorizonEdited,
  setStartingBalance,
  setMonthlyContribution,
  setMonthlyContributionFuture,
  setContributionEndTouched,
  setManualContributionEndYear,
  setContributionEndYear,
  setManualContributionEndMonth,
  setContributionEndMonth,
  setWithdrawalStartTouched,
  setManualWithdrawalStartYear,
  setWithdrawalStartYear,
  setManualWithdrawalStartMonth,
  setWithdrawalStartMonth,
  setContributionIncreasePct,
  setHasUserEnteredContributionIncrease,
  setWithdrawalIncreasePct,
}: AccountActivityFormHandlerDeps) {
  return (updates: AccountActivityFormUpdates) => {
    if ("timeHorizonYears" in updates) {
      const raw = (updates.timeHorizonYears ?? "").replace(".00", "");
      setTimeHorizonYears(raw);
      setTimeHorizonEdited(true);
    }
    if ("startingBalance" in updates) setStartingBalance(sanitizeAmountInput(updates.startingBalance ?? ""));
    if ("monthlyContribution" in updates) {
      const sanitized = sanitizeAmountInput(updates.monthlyContribution ?? "");
      setMonthlyContribution(sanitized);
      setMonthlyContributionFuture("");
    }
    if ("contributionEndYear" in updates) {
      setContributionEndTouched(true);
      setManualContributionEndYear(updates.contributionEndYear ?? "");
      setContributionEndYear(updates.contributionEndYear ?? "");
    }
    if ("contributionEndMonth" in updates) {
      setContributionEndTouched(true);
      setManualContributionEndMonth(updates.contributionEndMonth ?? "");
      setContributionEndMonth(updates.contributionEndMonth ?? "");
    }
    if ("monthlyWithdrawal" in updates) {
      handleManualWithdrawalOverride(updates.monthlyWithdrawal ?? "");
    }
    if ("withdrawalStartYear" in updates) {
      setWithdrawalStartTouched(true);
      setManualWithdrawalStartYear(updates.withdrawalStartYear ?? "");
      setWithdrawalStartYear(updates.withdrawalStartYear ?? "");
    }
    if ("withdrawalStartMonth" in updates) {
      setWithdrawalStartTouched(true);
      setManualWithdrawalStartMonth(updates.withdrawalStartMonth ?? "");
      setWithdrawalStartMonth(updates.withdrawalStartMonth ?? "");
    }
    if ("contributionIncreasePct" in updates) {
      const nextValue = updates.contributionIncreasePct ?? "";
      setContributionIncreasePct(nextValue);
      const nextNumeric = Number(nextValue);
      setHasUserEnteredContributionIncrease(Number.isFinite(nextNumeric) && nextNumeric > 0);
    }
    if ("withdrawalIncreasePct" in updates) {
      setWithdrawalIncreasePct(updates.withdrawalIncreasePct ?? "");
    }
  };
}
