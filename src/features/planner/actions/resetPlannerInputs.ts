import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { getClientConfig } from "@/config/clients";
import { EMPTY_FSC } from "@/features/planner/inputs/fscFlow";
import type { ReportWindowOption } from "@/features/planner/report/reportViewModel";

type FscStatus = "idle" | "eligible" | "ineligible";
type MessagesMode = "intro" | "fsc";

type ResetPlannerInputsParams = {
  plannerStateCode: string;
  formatDecimalToPercentString: (value: number) => string;
  resetQualifiedWithdrawalBudget: () => void;
  resetWtaFlow: () => void;
  fscPassedRef: MutableRefObject<boolean>;
  screen1DefaultMessages: string[];
  screen2DefaultMessages: string[];
  setInputStep: Dispatch<SetStateAction<1 | 2>>;
  setBeneficiaryName: Dispatch<SetStateAction<string>>;
  setBeneficiaryStateOfResidence: Dispatch<SetStateAction<string>>;
  setPlannerFilingStatus: Dispatch<SetStateAction<"single" | "married_joint" | "married_separate" | "head_of_household">>;
  setPlannerAgi: Dispatch<SetStateAction<string>>;
  setAnnualReturn: Dispatch<SetStateAction<string>>;
  setAnnualReturnEdited: Dispatch<SetStateAction<boolean>>;
  setAnnualReturnWarningMax: Dispatch<SetStateAction<number | null>>;
  setIsSsiEligible: Dispatch<SetStateAction<boolean>>;
  setStartingBalance: Dispatch<SetStateAction<string>>;
  setMonthlyContribution: Dispatch<SetStateAction<string>>;
  setMonthlyContributionFuture: Dispatch<SetStateAction<string>>;
  setContributionEndYear: Dispatch<SetStateAction<string>>;
  setContributionEndMonth: Dispatch<SetStateAction<string>>;
  setMonthlyWithdrawal: Dispatch<SetStateAction<string>>;
  setWithdrawalStartYear: Dispatch<SetStateAction<string>>;
  setWithdrawalStartMonth: Dispatch<SetStateAction<string>>;
  setNonResidentProceedAck: Dispatch<SetStateAction<boolean>>;
  setFscStatus: Dispatch<SetStateAction<FscStatus>>;
  setFscQ: Dispatch<SetStateAction<typeof EMPTY_FSC>>;
  setSsiIncomeWarningDismissed: Dispatch<SetStateAction<boolean>>;
  setMessagesMode: Dispatch<SetStateAction<MessagesMode>>;
  setAgiGateEligible: Dispatch<SetStateAction<boolean | null>>;
  setScreen1Messages: Dispatch<SetStateAction<string[]>>;
  setContributionIncreasePct: Dispatch<SetStateAction<string>>;
  setHasUserEnteredContributionIncrease: Dispatch<SetStateAction<boolean>>;
  setWithdrawalIncreasePct: Dispatch<SetStateAction<string>>;
  setContributionIncreaseHelperText: Dispatch<SetStateAction<string | undefined>>;
  setContributionBreachYear: Dispatch<SetStateAction<number | null>>;
  setStopContributionIncreasesAfterYear: Dispatch<SetStateAction<number | null>>;
  setWtaAutoPromptedForIncrease: Dispatch<SetStateAction<boolean>>;
  setScreen2Messages: Dispatch<SetStateAction<string[]>>;
  setTimeHorizonYears: Dispatch<SetStateAction<string>>;
  setTimeHorizonEdited: Dispatch<SetStateAction<boolean>>;
  setContributionEndTouched: Dispatch<SetStateAction<boolean>>;
  setWithdrawalStartTouched: Dispatch<SetStateAction<boolean>>;
  setWtaAutoApplied: Dispatch<SetStateAction<boolean>>;
  setWtaDismissed: Dispatch<SetStateAction<boolean>>;
  setReportWindowYears: Dispatch<SetStateAction<ReportWindowOption>>;
};

export function resetPlannerInputs(params: ResetPlannerInputsParams) {
  const {
    plannerStateCode,
    formatDecimalToPercentString,
    resetQualifiedWithdrawalBudget,
    resetWtaFlow,
    fscPassedRef,
    screen1DefaultMessages,
    screen2DefaultMessages,
    setInputStep,
    setBeneficiaryName,
    setBeneficiaryStateOfResidence,
    setPlannerFilingStatus,
    setPlannerAgi,
    setAnnualReturn,
    setAnnualReturnEdited,
    setAnnualReturnWarningMax,
    setIsSsiEligible,
    setStartingBalance,
    setMonthlyContribution,
    setMonthlyContributionFuture,
    setContributionEndYear,
    setContributionEndMonth,
    setMonthlyWithdrawal,
    setWithdrawalStartYear,
    setWithdrawalStartMonth,
    setNonResidentProceedAck,
    setFscStatus,
    setFscQ,
    setSsiIncomeWarningDismissed,
    setMessagesMode,
    setAgiGateEligible,
    setScreen1Messages,
    setContributionIncreasePct,
    setHasUserEnteredContributionIncrease,
    setWithdrawalIncreasePct,
    setContributionIncreaseHelperText,
    setContributionBreachYear,
    setStopContributionIncreasesAfterYear,
    setWtaAutoPromptedForIncrease,
    setScreen2Messages,
    setTimeHorizonYears,
    setTimeHorizonEdited,
    setContributionEndTouched,
    setWithdrawalStartTouched,
    setWtaAutoApplied,
    setWtaDismissed,
    setReportWindowYears,
  } = params;

  setInputStep(1);
  setBeneficiaryName("");
  setBeneficiaryStateOfResidence(plannerStateCode === "default" ? "" : plannerStateCode);
  setPlannerFilingStatus("single");
  setPlannerAgi("");

  const client = getClientConfig(plannerStateCode);
  const candidateAnnualReturn = client?.defaults?.annualReturn;
  const defaultAnnualReturn =
    typeof candidateAnnualReturn === "number" && Number.isFinite(candidateAnnualReturn)
      ? formatDecimalToPercentString(candidateAnnualReturn)
      : "";
  const candidateTimeHorizon = client?.defaults?.timeHorizonYears ?? null;
  const defaultTimeHorizon =
    typeof candidateTimeHorizon === "number" && Number.isFinite(candidateTimeHorizon)
      ? String(Math.round(candidateTimeHorizon))
      : "40";

  setAnnualReturn(defaultAnnualReturn);
  setAnnualReturnEdited(false);
  setAnnualReturnWarningMax(null);
  setIsSsiEligible(false);
  setStartingBalance("");
  setMonthlyContribution("");
  setMonthlyContributionFuture("");
  setContributionEndYear("");
  setContributionEndMonth("");
  setMonthlyWithdrawal("");
  resetQualifiedWithdrawalBudget();
  setWithdrawalStartYear("");
  setWithdrawalStartMonth("");
  setNonResidentProceedAck(false);
  resetWtaFlow();
  setFscStatus("idle");
  setFscQ({ ...EMPTY_FSC });
  fscPassedRef.current = false;
  setSsiIncomeWarningDismissed(false);
  setMessagesMode("intro");
  setAgiGateEligible(null);
  setScreen1Messages([...screen1DefaultMessages]);
  setContributionIncreasePct("");
  setHasUserEnteredContributionIncrease(false);
  setWithdrawalIncreasePct("");
  setContributionIncreaseHelperText(undefined);
  setContributionBreachYear(null);
  setStopContributionIncreasesAfterYear(null);
  setWtaAutoPromptedForIncrease(false);
  setScreen2Messages([...screen2DefaultMessages]);
  setTimeHorizonYears(defaultTimeHorizon);
  setTimeHorizonEdited(false);
  setContributionEndTouched(false);
  setWithdrawalStartTouched(false);
  setWtaAutoApplied(false);
  setWtaDismissed(false);
  setReportWindowYears("max");
}
