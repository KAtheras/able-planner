type PlannerSsiIncomeWarningParams = {
  isSsiEligible: boolean;
  agiValidForSsiWarning: boolean;
  agiValueForSsiWarning: number;
  ssiWarningThreshold: number | undefined;
};

export function getSsiIncomeWarningState({
  isSsiEligible,
  agiValidForSsiWarning,
  agiValueForSsiWarning,
  ssiWarningThreshold,
}: PlannerSsiIncomeWarningParams) {
  const showSsiIncomeEligibilityWarning =
    isSsiEligible &&
    agiValidForSsiWarning &&
    Number.isFinite(ssiWarningThreshold ?? NaN) &&
    agiValueForSsiWarning > Number(ssiWarningThreshold);

  return {
    showSsiIncomeEligibilityWarning,
    showSsiSelectionPlannerMessage: isSsiEligible && !showSsiIncomeEligibilityWarning,
  };
}
