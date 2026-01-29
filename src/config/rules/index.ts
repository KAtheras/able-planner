// src/config/rules/index.ts
// Centralized exports + tiny helpers for rule JSONs.
// No business logic here—just loading + typed accessors.

import federalTaxBrackets from "./federalTaxBrackets.json";
import stateTaxRates from "./stateTaxRates.json";
import stateTaxDeductions from "./stateTaxDeductions.json";
import planLevelInfo from "./planLevelInfo.json";
import federalSaversCreditBrackets from "./federalSaversCreditBrackets.json";
import federalSaversContributionLimits from "./federalSaversContributionLimits.json";

export const rules = {
  federalTaxBrackets,
  stateTaxRates,
  stateTaxDeductions,
  planLevelInfo,
  federalSaversCreditBrackets,
  federalSaversContributionLimits,
} as const;

// ---- Minimal structural types (keep loose for now; we’ll tighten after we inspect shapes) ----

export type StateCode = string;

export type PlanLevelInfo = typeof planLevelInfo;
export type StateTaxRates = typeof stateTaxRates;
export type StateTaxDeductions = typeof stateTaxDeductions;
export type FederalTaxBrackets = typeof federalTaxBrackets;
export type FederalSaversCreditBrackets = typeof federalSaversCreditBrackets;
export type FederalSaversContributionLimits = typeof federalSaversContributionLimits;

// ---- Convenience getters (safe, non-throwing) ----

export function getPlanInfo(stateCode: StateCode) {
  const anyPlanInfo = planLevelInfo as Record<string, unknown>;
  const value = anyPlanInfo?.[stateCode];
  return value ?? null;
}

export function getStateTaxRateInfo(stateCode: StateCode) {
  const anyRates = stateTaxRates as Record<string, unknown>;
  const value = anyRates?.[stateCode];
  return value ?? null;
}

export function getStateTaxDeductionInfo(stateCode: StateCode) {
  const anyDeductions = stateTaxDeductions as Record<string, unknown>;
  const value = anyDeductions?.[stateCode];
  return value ?? null;
}

// NOTE: Federal rules are typically keyed by filing status / year / income bracket.
// We’ll add proper typed selectors once we confirm your exact JSON shapes.