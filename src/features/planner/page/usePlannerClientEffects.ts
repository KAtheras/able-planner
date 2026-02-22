import { useEffect } from "react";

import { getClientConfig } from "@/config/clients";

type UsePlannerClientEffectsParams = {
  plannerStateCode: string;
  beneficiaryStateOfResidence: string;
  planState: string;
  timeHorizonEdited: boolean;
  setBeneficiaryStateOfResidence: (next: string) => void;
  setTimeHorizonYears: (next: string) => void;
  setNonResidentProceedAck: (next: boolean) => void;
};

export function usePlannerClientEffects({
  plannerStateCode,
  beneficiaryStateOfResidence,
  planState,
  timeHorizonEdited,
  setBeneficiaryStateOfResidence,
  setTimeHorizonYears,
  setNonResidentProceedAck,
}: UsePlannerClientEffectsParams) {
  useEffect(() => {
    const client = getClientConfig(plannerStateCode);
    const brand = client.brand;
    const typography = client.typography;
    if (!brand && !typography) return;

    const root = document.documentElement.style;
    if (brand) {
      root.setProperty("--brand-primary", brand.primary);
      root.setProperty("--brand-primary-hover", brand.primaryHover);
      root.setProperty("--brand-on-primary", brand.onPrimary);
      root.setProperty("--brand-ring", brand.ring);
    }

    if (typography?.fontFamily) {
      root.setProperty("--app-font-family", typography.fontFamily);
    }
    const baseFontSize = typography?.baseFontSizePx;
    if (Number.isFinite(baseFontSize ?? NaN)) {
      root.setProperty("--app-font-size", `${baseFontSize}px`);
    }
    const lineHeight = typography?.lineHeight;
    if (Number.isFinite(lineHeight ?? NaN)) {
      root.setProperty("--app-line-height", `${lineHeight}`);
    }
  }, [plannerStateCode]);

  useEffect(() => {
    if (!beneficiaryStateOfResidence && plannerStateCode !== "default") {
      setBeneficiaryStateOfResidence(plannerStateCode);
    }
  }, [plannerStateCode, beneficiaryStateOfResidence, setBeneficiaryStateOfResidence]);

  useEffect(() => {
    if (timeHorizonEdited) return;
    const client = getClientConfig(plannerStateCode);
    const candidate =
      client?.defaults?.timeHorizonYears ??
      null;
    const fallback = typeof candidate === "number" && Number.isFinite(candidate)
      ? String(Math.round(candidate))
      : "40";
    setTimeHorizonYears(fallback);
  }, [plannerStateCode, timeHorizonEdited, setTimeHorizonYears]);

  useEffect(() => {
    if (!beneficiaryStateOfResidence || beneficiaryStateOfResidence === planState) {
      setNonResidentProceedAck(false);
    }
  }, [beneficiaryStateOfResidence, planState, setNonResidentProceedAck]);
}
