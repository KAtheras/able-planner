import { useMemo } from "react";

import type { PlannerProjectionSource } from "@/features/planner/page/plannerProjectionAdapter";

const ALLOWED_SOURCES: PlannerProjectionSource[] = ["local", "api"];

function normalizeProjectionSource(value: string | undefined): PlannerProjectionSource {
  const normalized = (value ?? "").trim().toLowerCase();
  return ALLOWED_SOURCES.includes(normalized as PlannerProjectionSource)
    ? (normalized as PlannerProjectionSource)
    : "local";
}

export function usePlannerProjectionSource() {
  const projectionSource = useMemo(
    () => normalizeProjectionSource(process.env.NEXT_PUBLIC_PLANNER_PROJECTION_SOURCE),
    [],
  );

  return {
    projectionSource,
    isApiSourceEnabled: projectionSource === "api",
  };
}
