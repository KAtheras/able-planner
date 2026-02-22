import { buildPlannerProjection, type PlannerProjectionSource } from "@/features/planner/page/plannerProjectionAdapter";
import type {
  PlannerProjectionDataParams,
  PlannerProjectionDataResult,
} from "@/features/planner/page/plannerProjectionData";

export function getPlannerProjectionData(
  params: PlannerProjectionDataParams,
  source: PlannerProjectionSource,
): PlannerProjectionDataResult {
  return buildPlannerProjection(params, { source });
}
