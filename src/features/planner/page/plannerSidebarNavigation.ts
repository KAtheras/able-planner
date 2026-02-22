import type { NavKey } from "@/components/layout/Sidebar";

type SidebarNavigationParams = {
  next: NavKey;
  canAccessProjectionViews: boolean;
  agiValidForSsiWarning: boolean;
  residencyBlocking: boolean;
};

type SidebarNavigationResult = {
  nextActive: NavKey;
  nextInputStep: 1 | 2 | null;
  shouldResetMessagesMode: boolean;
};

export function resolveSidebarNavigation({
  next,
  canAccessProjectionViews,
  agiValidForSsiWarning,
  residencyBlocking,
}: SidebarNavigationParams): SidebarNavigationResult {
  const isProjectionDestination = next === "reports" || next === "schedule";

  if (isProjectionDestination && !canAccessProjectionViews) {
    return {
      nextActive: "inputs",
      nextInputStep: !agiValidForSsiWarning || residencyBlocking ? 1 : 2,
      shouldResetMessagesMode: true,
    };
  }

  return {
    nextActive: next,
    nextInputStep: null,
    shouldResetMessagesMode: false,
  };
}
