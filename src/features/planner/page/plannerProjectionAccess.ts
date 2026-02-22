type PlannerProjectionAccessParams = {
  calcStartingBalanceInput: string;
  calcMonthlyContributionInput: string;
  calcPlannerAgiInput: string;
  residencyBlocking: boolean;
};

export function getPlannerProjectionAccessState({
  calcStartingBalanceInput,
  calcMonthlyContributionInput,
  calcPlannerAgiInput,
  residencyBlocking,
}: PlannerProjectionAccessParams) {
  const startingBalanceNum = Number((calcStartingBalanceInput ?? "").replace(".00", "")) || 0;
  const monthlyContributionNum = Number((calcMonthlyContributionInput ?? "").replace(".00", "")) || 0;
  const hasProjectionDriver = startingBalanceNum > 0 || monthlyContributionNum > 0;

  const agiValueForSsiWarning = Number(calcPlannerAgiInput);
  const agiValidForSsiWarning =
    calcPlannerAgiInput !== "" &&
    !Number.isNaN(agiValueForSsiWarning) &&
    (agiValueForSsiWarning > 0 || agiValueForSsiWarning === 0);

  const canAccessProjectionViews = agiValidForSsiWarning && !residencyBlocking && hasProjectionDriver;

  return {
    startingBalanceNum,
    monthlyContributionNum,
    hasProjectionDriver,
    agiValueForSsiWarning,
    agiValidForSsiWarning,
    canAccessProjectionViews,
  };
}
