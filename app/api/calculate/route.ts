import { NextResponse } from "next/server";

import federalTaxBrackets from "@/config/rules/federalTaxBrackets.json";
import federalSaversContributionLimits from "@/config/rules/federalSaversContributionLimits.json";
import federalSaversCreditBrackets from "@/config/rules/federalSaversCreditBrackets.json";
import planLevelInfo from "@/config/rules/planLevelInfo.json";
import stateTaxDeductions from "@/config/rules/stateTaxDeductions.json";
import stateTaxRates from "@/config/rules/stateTaxRates.json";
import { getClientConfig, normalizeClientId } from "@/config/clients";

type FscCriteria = {
  hasTaxLiability?: boolean;
  isOver18?: boolean;
  isStudent?: boolean;
  isDependent?: boolean;
};

type ProjectionWindow = {
  year?: number;
  month?: number;
};

type ProjectionInput = {
  startingBalance?: number;
  monthlyContribution?: number;
  contributionEnd?: ProjectionWindow;
  monthlyWithdrawal?: number;
  withdrawalStart?: ProjectionWindow;
};

type CalculateRequest = {
  stateCode?: string;
  planStateCode?: string;
  beneficiaryStateCode?: string;
  filingStatus?: string;
  agi?: number;
  clientId?: string;
  annualReturnOverride?: number;
  timeHorizonYearsOverride?: number;
  isSsiBeneficiary?: boolean;
  fscCriteria?: FscCriteria;
  projection?: ProjectionInput;
};

type StateInfo = {
  name?: string | null;
  maxAccountBalance?: number | null;
  residencyRequired?: boolean | null;
};

type ClientConfig = {
  clientId: string;
  defaults?: {
    annualReturn?: number;
    timeHorizonYears?: number;
  };
};




const MIN_HORIZON_YEARS = 1;
const MAX_HORIZON_YEARS = 75;
const DEFAULT_ANNUAL_RETURN = 0.05;
const DEFAULT_TIME_HORIZON = 40;

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const getDefaultValue = (
  config: ClientConfig | undefined,
  key: keyof NonNullable<ClientConfig["defaults"]>,
): number | null => {
  const candidate = config?.defaults?.[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : null;
};

const clampHorizonValue = (value: number) => {
  const rounded = Math.round(value);
  const clamped = Math.min(MAX_HORIZON_YEARS, Math.max(MIN_HORIZON_YEARS, rounded));
  const notes =
    clamped !== rounded
      ? [`timeHorizonYearsOverride clamped to ${clamped}`]
      : [];
  return { value: clamped, notes };
};

const validateNonNegative = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

const validateProjectionWindow = (
  window: ProjectionWindow | undefined,
  label: string,
  notes: string[],
): ProjectionWindow | null => {
  if (!window) return null;
  const { year, month } = window;
  const validYear =
    typeof year === "number" &&
    Number.isFinite(year) &&
    year >= MIN_YEAR &&
    year <= MAX_YEAR;
  const validMonth =
    typeof month === "number" &&
    Number.isFinite(month) &&
    month >= 1 &&
    month <= 12;
  if (!validYear) {
    notes.push(`${label}.year must be ${MIN_YEAR}-${MAX_YEAR}`);
  }
  if (!validMonth) {
    notes.push(`${label}.month must be 1-12`);
  }
  if (!validYear || !validMonth) {
    return null;
  }
  return { year: year!, month: month! };
};

export async function POST(request: Request) {
  let parsed: CalculateRequest;

  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const planStateCodeRaw = parsed.planStateCode ?? "UT";
  const planStateCode = planStateCodeRaw.toUpperCase();
  const planState = (planLevelInfo as Record<string, StateInfo>)[planStateCode];

  const residencyStateCodeRaw = parsed.stateCode ?? "UT";
  const residencyStateCode = residencyStateCodeRaw.toUpperCase();
  const stateRate =
    (stateTaxRates as Record<string, unknown>)[residencyStateCode] ?? null;
  const stateDeduction =
    (stateTaxDeductions as Record<string, unknown>)[residencyStateCode] ?? null;

  const meta: Record<string, unknown> & { rulesLoaded: Record<string, number> } = {
    rulesLoaded: {
      federalTaxBrackets: Object.keys(federalTaxBrackets).length,
      stateTaxRates: Object.keys(stateTaxRates).length,
      stateTaxDeductions: Object.keys(stateTaxDeductions).length,
      planLevelInfo: Object.keys(planLevelInfo).length,
      federalSaversCreditBrackets: Object.keys(
        federalSaversCreditBrackets,
      ).length,
      federalSaversContributionLimits: Object.keys(
        federalSaversContributionLimits,
      ).length,
    },
  };

  if (!planState) {
    meta.warning = "Unknown stateCode";
  }

  const statePayload = planState
    ? {
        code: planStateCode,
        name: planState.name ?? null,
        maxAccountBalance: planState.maxAccountBalance ?? null,
        residencyRequired: planState.residencyRequired ?? null,
      }
    : {
        code: planStateCode,
        name: null,
        maxAccountBalance: null,
        residencyRequired: null,
      };

  const resolvedClientId = normalizeClientId(
  normalizeClientId(parsed.clientId),
);
  const beneficiaryStateCodeNormalized =
    parsed.beneficiaryStateCode?.toUpperCase() ?? null;
  const projectionInput = parsed.projection ?? {};
  const projectionNotes: string[] = [];
  const startingBalance =
    projectionInput.startingBalance === undefined
      ? null
      : validateNonNegative(projectionInput.startingBalance);
  if (
    projectionInput.startingBalance !== undefined &&
    startingBalance === null
  ) {
    projectionNotes.push("startingBalance must be >= 0");
  }
  const monthlyContribution =
    projectionInput.monthlyContribution === undefined
      ? null
      : validateNonNegative(projectionInput.monthlyContribution);
  if (
    projectionInput.monthlyContribution !== undefined &&
    monthlyContribution === null
  ) {
    projectionNotes.push("monthlyContribution must be >= 0");
  }
  const monthlyWithdrawal =
    projectionInput.monthlyWithdrawal === undefined
      ? null
      : validateNonNegative(projectionInput.monthlyWithdrawal);
  if (
    projectionInput.monthlyWithdrawal !== undefined &&
    monthlyWithdrawal === null
  ) {
    projectionNotes.push("monthlyWithdrawal must be >= 0");
  }
  const contributionEnd = validateProjectionWindow(
    projectionInput.contributionEnd,
    "contributionEnd",
    projectionNotes,
  );
  const withdrawalStart = validateProjectionWindow(
    projectionInput.withdrawalStart,
    "withdrawalStart",
    projectionNotes,
  );
  const projectionEcho = {
    startingBalance,
    monthlyContribution,
    contributionEnd,
    monthlyWithdrawal,
    withdrawalStart,
  };
  const echo = {
    clientId: resolvedClientId,
    planStateCode: planStateCode,
    beneficiaryStateCode: beneficiaryStateCodeNormalized,
    isSsiBeneficiary:
      typeof parsed.isSsiBeneficiary === "boolean"
        ? parsed.isSsiBeneficiary
        : null,
    projection: projectionEcho,
    projectionNotes,
  };
  const requestedConfig = getClientConfig(resolvedClientId);
  const overrideValue =
    typeof parsed.annualReturnOverride === "number" &&
    Number.isFinite(parsed.annualReturnOverride)
      ? parsed.annualReturnOverride
      : null;

  const overrideRawTimeHorizon =
    typeof parsed.timeHorizonYearsOverride === "number" &&
    Number.isFinite(parsed.timeHorizonYearsOverride)
      ? parsed.timeHorizonYearsOverride
      : null;
  const overrideTimeHorizonInfo =
    overrideRawTimeHorizon !== null ? clampHorizonValue(overrideRawTimeHorizon) : null;

  const clientAnnualReturn = getDefaultValue(requestedConfig, "annualReturn");
  const fallbackAnnualReturn = getDefaultValue(
  getClientConfig("default"),
  "annualReturn",
);
  const clientTimeHorizon = getDefaultValue(requestedConfig, "timeHorizonYears");
  const fallbackTimeHorizon = getDefaultValue(
    getClientConfig("default"),
    "timeHorizonYears",
  );

  let annualReturnSource:
    | "override"
    | "client_default"
    | "fallback_default"
    | "hardcoded_fallback" = "client_default";
  let annualReturnValue: number;

  if (overrideValue !== null) {
    annualReturnValue = overrideValue;
    annualReturnSource = "override";
  } else if (clientAnnualReturn !== null) {
    annualReturnValue = clientAnnualReturn;
    annualReturnSource = "client_default";
  } else if (fallbackAnnualReturn !== null) {
    annualReturnValue = fallbackAnnualReturn;
    annualReturnSource = "fallback_default";
  } else {
    annualReturnValue = DEFAULT_ANNUAL_RETURN;
    annualReturnSource = "hardcoded_fallback";
  }

  let timeHorizonValue: number;
  let timeHorizonSource: "override" | "client_default" | "fallback" = "fallback";
  const timeHorizonNotes: string[] = [];

  if (overrideTimeHorizonInfo !== null) {
    timeHorizonValue = overrideTimeHorizonInfo.value;
    timeHorizonSource = "override";
    if (overrideTimeHorizonInfo.notes.length) {
      timeHorizonNotes.push(...overrideTimeHorizonInfo.notes);
    }
  } else if (clientTimeHorizon !== null) {
    timeHorizonValue = clientTimeHorizon;
    timeHorizonSource = "client_default";
  } else if (fallbackTimeHorizon !== null) {
    timeHorizonValue = fallbackTimeHorizon;
    timeHorizonSource = "fallback";
  } else {
    timeHorizonValue = DEFAULT_TIME_HORIZON;
    timeHorizonSource = "fallback";
  }

  const filingStatus =
    parsed.filingStatus && parsed.filingStatus in federalSaversContributionLimits
      ? parsed.filingStatus
      : "single";
  const agiValue =
    typeof parsed.agi === "number" && !Number.isNaN(parsed.agi)
      ? parsed.agi
      : undefined;
  const fscCriteria = parsed.fscCriteria;
  const matchedBracket = federalSaversCreditBrackets.find((entry) => {
    const bracket = entry.brackets[filingStatus as keyof typeof entry.brackets];
    if (!bracket || agiValue === undefined) {
      return false;
    }
    switch (bracket.type) {
      case "max":
        if (typeof bracket.value !== "number") {
          return false;
        }
        return agiValue <= bracket.value;
      case "range":
        if (
          typeof bracket.min !== "number" ||
          typeof bracket.max !== "number"
        ) {
          return false;
        }
        return agiValue >= bracket.min && agiValue <= bracket.max;
      case "min":
        if (typeof bracket.value !== "number") {
          return false;
        }
        return agiValue > bracket.value;
      default:
        return false;
    }
  });
  const bracketFound = Boolean(matchedBracket);
  const contributionLimit =
    (federalSaversContributionLimits as Record<string, number>)[filingStatus] ??
    null;
  const creditPercent = matchedBracket?.creditRate ?? null;
  const agiGateEligible = creditPercent !== null && creditPercent > 0;

  const criteriaFailures: string[] = [];
  const reasons: string[] = agiGateEligible ? [] : ["income_or_filing_status"];
  let eligible: boolean | null = agiGateEligible ? null : false;
  let status = agiGateEligible ? "needs_more_inputs" : "ineligible_income";

  if (agiGateEligible && fscCriteria) {
    if (fscCriteria.hasTaxLiability !== true) {
      criteriaFailures.push("no_tax_liability");
    }
    if (fscCriteria.isOver18 !== true) {
      criteriaFailures.push("under_18");
    }
    if (fscCriteria.isStudent === true) {
      criteriaFailures.push("student");
    }
    if (fscCriteria.isDependent === true) {
      criteriaFailures.push("dependent");
    }

    eligible = criteriaFailures.length === 0;
    status = eligible ? "eligible" : "ineligible_other";
    reasons.push(...criteriaFailures);
  }

  const notes: string[] = [];
  if (agiValue === undefined) {
    notes.push("AGI not provided or invalid");
  }
  if (!bracketFound) {
    notes.push("No matching credit bracket found for filing status");
  }
  if (contributionLimit === null) {
    notes.push("No contribution limit configured for filing status");
  }

  const timeHorizonAssumption = {
    value: timeHorizonValue,
    source: timeHorizonSource,
    ...(timeHorizonNotes.length ? { notes: timeHorizonNotes } : {}),
  };

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 1;
  const startTotalMonths = startYear * 12 + (startMonth - 1);

  const horizonYearsValue =
    typeof timeHorizonAssumption.value === "number" &&
    Number.isFinite(timeHorizonAssumption.value)
      ? timeHorizonAssumption.value
      : null;

  let projectionWindowMonths: number | null = null;
  if (horizonYearsValue === null) {
    projectionNotes.push("assumptions.timeHorizonYears.value missing");
  } else {
    const horizonMonths = Math.round(horizonYearsValue) * 12;
    const horizonEndMonths = startTotalMonths + horizonMonths;
    let targetEndMonths = horizonEndMonths;
    if (contributionEnd) {
      if (
        typeof contributionEnd.year !== "number" ||
        typeof contributionEnd.month !== "number"
      ) {
        projectionNotes.push("contributionEnd invalid after validation");
      } else {
      const candidateMonths =
        contributionEnd.year * 12 + (contributionEnd.month - 1);
      targetEndMonths = Math.min(candidateMonths, horizonEndMonths);
      }
    }
    if (targetEndMonths < startTotalMonths) {
      projectionWindowMonths = 0;
      projectionNotes.push("projection end precedes start");
    } else {
      projectionWindowMonths = targetEndMonths - startTotalMonths;
    }
  }

  return NextResponse.json({
    ok: true,
    input: parsed,
    echo,
    state: statePayload,
    tax: {
      stateRate,
      stateDeduction,
    },
    meta,
    federalSaversCredit: {
      eligible,
      agiGateEligible,
      status,
      reasons,
      agiUsed: agiValue ?? 0,
      filingStatusUsed: filingStatus,
      creditPercent,
      maxQualifyingContribution: contributionLimit,
      notes,
    },
    assumptions: {
      annualReturn: {
        value: annualReturnValue,
        source: annualReturnSource,
      },
      timeHorizonYears: timeHorizonAssumption,
    },
    projectionWindowMonths,
  });
}

// Example curls for verifying projectionWindowMonths:
// no projection provided
// curl -s -X POST "http://localhost:3000/api/calculate" -H "Content-Type: application/json" -d '{"clientId":"ut","planStateCode":"UT","beneficiaryStateCode":"UT"}' | jq '.projectionWindowMonths,.assumptions.timeHorizonYears'
// contributionEnd within horizon
// curl -s -X POST "http://localhost:3000/api/calculate" -H "Content-Type: application/json" -d '{"clientId":"ut","planStateCode":"UT","beneficiaryStateCode":"UT","projection":{"contributionEnd":{"year":2030,"month":12}}}' | jq '.projectionWindowMonths,.echo.projectionNotes'
// contributionEnd beyond horizon (capped)
// curl -s -X POST "http://localhost:3000/api/calculate" -H "Content-Type: application/json" -d '{"clientId":"ut","planStateCode":"UT","beneficiaryStateCode":"UT","projection":{"contributionEnd":{"year":2100,"month":12}}}' | jq '.projectionWindowMonths,.echo.projectionNotes'
