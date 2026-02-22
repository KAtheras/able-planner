import { useCallback } from "react";

import { getClientConfig } from "@/config/clients";
import {
  clampNumber,
  getStartMonthIndex,
  parseIntegerInput,
} from "@/features/planner/page/plannerTimeUtils";

type UsePlannerHorizonParams = {
  plannerStateCode: string;
  timeHorizonYears: string;
};

export function usePlannerHorizon({ plannerStateCode, timeHorizonYears }: UsePlannerHorizonParams) {
  const getTimeHorizonLimits = useCallback(() => {
    const client = getClientConfig(plannerStateCode);
    const maxYears = client?.constraints?.timeHorizonYearsHardMax ?? 75;
    return {
      minYears: client?.constraints?.timeHorizonYearsHardMin ?? 1,
      maxYears,
    };
  }, [plannerStateCode]);

  const getHorizonConfig = useCallback(() => {
    const limits = getTimeHorizonLimits();
    const parsed = parseIntegerInput(timeHorizonYears);
    const safeYears = clampNumber(parsed ?? limits.minYears, limits.minYears, limits.maxYears);
    const startIndex = getStartMonthIndex();
    const horizonEndIndex = startIndex + safeYears * 12 - 1;
    return {
      minYears: limits.minYears,
      maxYears: limits.maxYears,
      safeYears,
      startIndex,
      horizonEndIndex: Math.max(startIndex, horizonEndIndex),
    };
  }, [getTimeHorizonLimits, timeHorizonYears]);

  return {
    getTimeHorizonLimits,
    getHorizonConfig,
  };
}
