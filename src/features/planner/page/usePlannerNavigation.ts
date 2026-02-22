import { useCallback } from "react";

import type { NavKey } from "@/components/layout/Sidebar";
import type { ReportView } from "@/components/reports/ReportsHeader";

type UsePlannerNavigationParams = {
  active: NavKey;
  inputStep: 1 | 2;
  reportViewIndex: number;
  defaultLastReportView: ReportView;
  defaultReportView: ReportView;
  enabledReportViews: ReportView[];
  amortizationView: "able" | "taxable";
  hasPendingSsiAcknowledgement: boolean;
  isInputNextDisabled: boolean;
  timeHorizonYears: string;
  parseIntegerInput: (value: string) => number | null;
  getTimeHorizonLimits: () => { minYears: number; maxYears: number };
  setActive: (next: NavKey) => void;
  setInputStep: (next: 1 | 2) => void;
  setReportView: (next: ReportView) => void;
  setAmortizationView: (next: "able" | "taxable") => void;
  setTimeHorizonYears: (next: string) => void;
};

export function usePlannerNavigation({
  active,
  inputStep,
  reportViewIndex,
  defaultLastReportView,
  defaultReportView,
  enabledReportViews,
  amortizationView,
  hasPendingSsiAcknowledgement,
  isInputNextDisabled,
  timeHorizonYears,
  parseIntegerInput,
  getTimeHorizonLimits,
  setActive,
  setInputStep,
  setReportView,
  setAmortizationView,
  setTimeHorizonYears,
}: UsePlannerNavigationParams) {
  const goToPreviousInputStep = useCallback(() => {
    if (inputStep === 2) {
      setInputStep(1);
    }
  }, [inputStep, setInputStep]);

  const goToMobileBack = useCallback(() => {
    if (active === "inputs") {
      goToPreviousInputStep();
      return;
    }

    if (active === "reports") {
      if (reportViewIndex <= 0) {
        setActive("inputs");
        setInputStep(2);
        return;
      }
      setReportView(enabledReportViews[reportViewIndex - 1]);
      return;
    }

    if (active === "schedule") {
      if (amortizationView === "taxable") {
        setAmortizationView("able");
        return;
      }
      setActive("reports");
      setReportView(defaultLastReportView);
      return;
    }

    if (active === "resources") {
      setActive("schedule");
      return;
    }

    if (active === "disclosures") {
      setActive("resources");
    }
  }, [
    active,
    goToPreviousInputStep,
    reportViewIndex,
    setActive,
    setInputStep,
    setReportView,
    enabledReportViews,
    amortizationView,
    setAmortizationView,
    defaultLastReportView,
  ]);

  const goToMobileNext = useCallback(() => {
    if (active === "inputs") {
      if (isInputNextDisabled || (inputStep === 2 && hasPendingSsiAcknowledgement)) {
        return;
      }
      if (inputStep === 1) {
        setInputStep(2);
        return;
      }
      const { minYears, maxYears } = getTimeHorizonLimits();
      if (timeHorizonYears !== "") {
        const parsed = parseIntegerInput(timeHorizonYears);
        if (parsed !== null) {
          let next = parsed;
          if (next < minYears) next = minYears;
          if (next > maxYears) next = maxYears;
          if (String(next) !== timeHorizonYears) {
            setTimeHorizonYears(String(next));
          }
        }
      }
      setActive("reports");
      setReportView(defaultReportView);
      return;
    }

    if (active === "reports") {
      if (reportViewIndex < enabledReportViews.length - 1) {
        setReportView(enabledReportViews[reportViewIndex + 1]);
        return;
      }
      setActive("schedule");
      setAmortizationView("able");
      return;
    }

    if (active === "schedule") {
      if (amortizationView === "able") {
        setAmortizationView("taxable");
        return;
      }
      setActive("resources");
      return;
    }

    if (active === "resources") {
      setActive("disclosures");
    }
  }, [
    active,
    isInputNextDisabled,
    inputStep,
    hasPendingSsiAcknowledgement,
    setInputStep,
    getTimeHorizonLimits,
    timeHorizonYears,
    parseIntegerInput,
    setTimeHorizonYears,
    setActive,
    setReportView,
    defaultReportView,
    reportViewIndex,
    enabledReportViews,
    setAmortizationView,
    amortizationView,
  ]);

  return {
    goToMobileBack,
    goToMobileNext,
  };
}
