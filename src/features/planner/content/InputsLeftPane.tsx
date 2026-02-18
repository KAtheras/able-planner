"use client";

import type { ReactNode } from "react";
import AccountActivityForm from "@/components/inputs/AccountActivityForm";
import DemographicsForm from "@/components/inputs/DemographicsForm";

type Option = {
  value: string;
  label: string;
};

type FilingStatusOption = "single" | "married_joint" | "married_separate" | "head_of_household";

type DemographicsUpdates = {
  beneficiaryName?: string;
  stateOfResidence?: string;
  filingStatus?: FilingStatusOption;
  agi?: string;
  annualReturn?: string;
  isSsiEligible?: boolean;
};

type AccountActivityUpdates = {
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

type InputsLabels = {
  [key: string]: unknown;
};

type Props = {
  inputStep: 1 | 2;
  mobileInputsHeaderActions: ReactNode;

  beneficiaryName: string;
  beneficiaryStateOfResidence: string;
  plannerFilingStatus: FilingStatusOption;
  plannerAgi: string;
  annualReturn: string;
  isSsiEligible: boolean;
  fscStatus: "idle" | "eligible" | "ineligible";
  fscButtonLabel: string;
  fscDisabled: boolean;
  demographicsTitle: string;
  inputLabels: InputsLabels | undefined;
  onDemographicsChange: (updates: DemographicsUpdates) => void;
  onDemographicsFscClick: () => void;

  timeHorizonYears: string;
  startingBalance: string;
  monthlyContribution: string;
  contributionEndYear: string;
  contributionEndMonth: string;
  monthlyWithdrawal: string;
  withdrawalStartYear: string;
  withdrawalStartMonth: string;
  contributionIncreaseDisabledNow: boolean;
  contributionIncreaseHelperText: string | undefined;
  hasUserEnteredContributionIncrease: boolean;
  contributionIncreasePct: string;
  withdrawalIncreasePct: string;
  stopContributionIncreasesAfterYear: number | null;
  monthOptions: Option[];
  contributionMonthOptions: Option[];
  contributionYearOptions: string[];
  horizonYearOptions: string[];
  onAccountActivityChange: (updates: AccountActivityUpdates) => void;
  onAdvancedClick: () => void;
  advancedButtonLabel: string;
  onTimeHorizonBlur: () => void;
  timeHorizonLabel: string;
  accountActivityTitle: string;
};

export default function InputsLeftPane({
  inputStep,
  mobileInputsHeaderActions,
  beneficiaryName,
  beneficiaryStateOfResidence,
  plannerFilingStatus,
  plannerAgi,
  annualReturn,
  isSsiEligible,
  fscStatus,
  fscButtonLabel,
  fscDisabled,
  demographicsTitle,
  inputLabels,
  onDemographicsChange,
  onDemographicsFscClick,
  timeHorizonYears,
  startingBalance,
  monthlyContribution,
  contributionEndYear,
  contributionEndMonth,
  monthlyWithdrawal,
  withdrawalStartYear,
  withdrawalStartMonth,
  contributionIncreaseDisabledNow,
  contributionIncreaseHelperText,
  hasUserEnteredContributionIncrease,
  contributionIncreasePct,
  withdrawalIncreasePct,
  stopContributionIncreasesAfterYear,
  monthOptions,
  contributionMonthOptions,
  contributionYearOptions,
  horizonYearOptions,
  onAccountActivityChange,
  onAdvancedClick,
  advancedButtonLabel,
  onTimeHorizonBlur,
  timeHorizonLabel,
  accountActivityTitle,
}: Props) {
  if (inputStep === 1) {
    return (
      <DemographicsForm
        beneficiaryName={beneficiaryName}
        stateOfResidence={beneficiaryStateOfResidence}
        filingStatus={plannerFilingStatus}
        agi={plannerAgi}
        annualReturn={annualReturn}
        isSsiEligible={isSsiEligible}
        fscStatus={fscStatus}
        fscButtonLabel={fscButtonLabel}
        fscDisabled={fscDisabled}
        copy={{
          title: demographicsTitle,
          labels: inputLabels,
        }}
        headerRightSlot={mobileInputsHeaderActions}
        onChange={onDemographicsChange}
        onFscClick={onDemographicsFscClick}
      />
    );
  }

  return (
    <AccountActivityForm
      timeHorizonYears={timeHorizonYears}
      startingBalance={startingBalance}
      monthlyContribution={monthlyContribution}
      contributionEndYear={contributionEndYear}
      contributionEndMonth={contributionEndMonth}
      monthlyWithdrawal={monthlyWithdrawal}
      withdrawalStartYear={withdrawalStartYear}
      withdrawalStartMonth={withdrawalStartMonth}
      contributionIncreaseDisabled={contributionIncreaseDisabledNow}
      contributionIncreaseHelperText={
        hasUserEnteredContributionIncrease ? contributionIncreaseHelperText : undefined
      }
      contributionIncreasePct={contributionIncreasePct}
      withdrawalIncreasePct={withdrawalIncreasePct}
      contributionIncreaseStopYear={stopContributionIncreasesAfterYear}
      monthOptions={monthOptions}
      contributionMonthOptions={contributionMonthOptions}
      contributionYearOptions={contributionYearOptions}
      withdrawalYearOptions={horizonYearOptions}
      onChange={onAccountActivityChange}
      onAdvancedClick={onAdvancedClick}
      advancedButtonLabel={advancedButtonLabel}
      onTimeHorizonBlur={onTimeHorizonBlur}
      timeHorizonLabel={timeHorizonLabel}
      copy={{
        title: accountActivityTitle,
        labels: inputLabels,
      }}
      headerRightSlot={mobileInputsHeaderActions}
    />
  );
}
