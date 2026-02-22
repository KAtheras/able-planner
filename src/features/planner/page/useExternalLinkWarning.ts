import { useCallback, useState } from "react";

export function useExternalLinkWarning() {
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  const openExternalUrlWithWarning = useCallback((url: string) => {
    if (!url) return;
    setPendingExternalUrl(url);
  }, []);

  const cancelExternalNavigation = useCallback(() => {
    setPendingExternalUrl(null);
  }, []);

  const confirmExternalNavigation = useCallback(() => {
    if (!pendingExternalUrl || typeof window === "undefined") {
      setPendingExternalUrl(null);
      return;
    }
    window.open(pendingExternalUrl, "_blank", "noopener,noreferrer");
    setPendingExternalUrl(null);
  }, [pendingExternalUrl]);

  return {
    pendingExternalUrl,
    openExternalUrlWithWarning,
    cancelExternalNavigation,
    confirmExternalNavigation,
  };
}
