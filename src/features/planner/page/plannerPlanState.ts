type PlanLevelEntry = {
  name?: string;
  residencyRequired?: boolean;
  maxAccountBalance?: number;
};

type PlanLevelInfoMap = Record<string, PlanLevelEntry>;

type ResolvePlannerPlanStateParams = {
  planStateCodeFromClient: string | undefined;
  plannerStateCode: string;
  beneficiaryStateOfResidence: string;
  nonResidentProceedAck: boolean;
  planInfoMap: PlanLevelInfoMap;
};

export function resolvePlannerPlanState({
  planStateCodeFromClient,
  plannerStateCode,
  beneficiaryStateOfResidence,
  nonResidentProceedAck,
  planInfoMap,
}: ResolvePlannerPlanStateParams) {
  const planStateOverride = planStateCodeFromClient?.toUpperCase();
  const planStateFallback = /^[A-Z]{2}$/.test(plannerStateCode) ? plannerStateCode.toUpperCase() : undefined;
  const planState = planStateOverride ?? planStateFallback ?? "";

  const planInfoEntry = planInfoMap[planState];
  const planName = planInfoEntry?.name ?? planState;
  const planLabel = `${planName} Able`;
  const planResidencyRequired = Boolean(planInfoEntry?.residencyRequired);
  const planMaxBalance = planInfoMap[planState]?.maxAccountBalance ?? planInfoMap.default?.maxAccountBalance ?? null;

  const residencyMismatch =
    Boolean(beneficiaryStateOfResidence) &&
    Boolean(planState) &&
    beneficiaryStateOfResidence.toUpperCase() !== planState;
  const residencyBlocking = residencyMismatch && (planResidencyRequired || !nonResidentProceedAck);

  return {
    planState,
    planName,
    planLabel,
    planResidencyRequired,
    planMaxBalance,
    residencyMismatch,
    residencyBlocking,
  };
}
