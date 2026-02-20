"use client";

import { useCallback, useMemo, useState } from "react";

type Params = {
  isSsiEligible: boolean;
  ssiContributionStopIndex: number | null;
  ssiForcedWithdrawalStartIndex: number | null;
};

export function useSsiEnforcement({
  isSsiEligible,
  ssiContributionStopIndex,
  ssiForcedWithdrawalStartIndex,
}: Params) {
  const [acknowledgedKey, setAcknowledgedKey] = useState<string | null>(null);

  const warningKey = useMemo(() => {
    if (!isSsiEligible) return null;
    if (ssiContributionStopIndex == null && ssiForcedWithdrawalStartIndex == null) return null;
    return `ssi-stop-${ssiContributionStopIndex ?? "none"}-withdraw-${ssiForcedWithdrawalStartIndex ?? "none"}`;
  }, [isSsiEligible, ssiContributionStopIndex, ssiForcedWithdrawalStartIndex]);

  const warningAcknowledged = warningKey !== null && acknowledgedKey === warningKey;
  const hasPendingAcknowledgement = warningKey !== null && !warningAcknowledged;

  const acknowledgeWarning = useCallback(() => {
    if (warningKey) {
      setAcknowledgedKey(warningKey);
    }
  }, [warningKey]);

  const resetAcknowledgement = useCallback(() => {
    setAcknowledgedKey(null);
  }, []);

  return {
    warningKey,
    warningAcknowledged,
    hasPendingAcknowledgement,
    acknowledgeWarning,
    resetAcknowledgement,
  };
}
