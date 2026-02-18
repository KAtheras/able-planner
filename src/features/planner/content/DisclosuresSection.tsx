"use client";

import type { ReactNode } from "react";
import DisclosuresView from "@/components/inputs/DisclosuresView";

type Props = {
  assumptionTitle: string;
  assumptionItems: string[];
  disclosuresAssumptionsOverride: string;
  languageToggle: ReactNode;
};

export default function DisclosuresSection({
  assumptionTitle,
  assumptionItems,
  disclosuresAssumptionsOverride,
  languageToggle,
}: Props) {
  return (
    <DisclosuresView
      title={assumptionTitle}
      items={assumptionItems}
      overrideText={disclosuresAssumptionsOverride}
      languageToggle={languageToggle}
    />
  );
}
