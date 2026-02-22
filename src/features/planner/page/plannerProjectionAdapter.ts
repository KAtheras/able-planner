import {
  buildPlannerProjectionData,
  type PlannerProjectionDataParams,
  type PlannerProjectionDataResult,
} from "@/features/planner/page/plannerProjectionData";

export type PlannerProjectionSource = "local" | "api";

type BuildPlannerProjectionOptions = {
  source?: PlannerProjectionSource;
};

export function buildPlannerProjection(
  params: PlannerProjectionDataParams,
  options?: BuildPlannerProjectionOptions,
): PlannerProjectionDataResult {
  const source = options?.source ?? "local";

  if (source === "api") {
    // API-backed projection source will be wired in a follow-up slice.
    return buildPlannerProjectionData(params);
  }

  return buildPlannerProjectionData(params);
}
