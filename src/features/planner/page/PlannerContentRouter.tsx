import type { ReactNode } from "react";

import type { NavKey } from "@/components/layout/Sidebar";

type PlannerContentRouterProps = {
  active: NavKey;
  reportsContent: ReactNode;
  scheduleContent: ReactNode;
  disclosuresContent: ReactNode;
  resourcesContent: ReactNode;
  inputsContent: ReactNode;
};

export default function PlannerContentRouter({
  active,
  reportsContent,
  scheduleContent,
  disclosuresContent,
  resourcesContent,
  inputsContent,
}: PlannerContentRouterProps) {
  if (active === "reports") return <>{reportsContent}</>;
  if (active === "schedule") return <>{scheduleContent}</>;
  if (active === "disclosures") return <>{disclosuresContent}</>;
  if (active === "resources") return <>{resourcesContent}</>;
  return <>{inputsContent}</>;
}
