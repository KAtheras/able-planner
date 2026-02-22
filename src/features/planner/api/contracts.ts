export type FscCriteria = {
  hasTaxLiability?: boolean;
  isOver18?: boolean;
  isStudent?: boolean;
  isDependent?: boolean;
};

export type ProjectionWindow = {
  year?: number;
  month?: number;
};

export type ProjectionInput = {
  startingBalance?: number;
  monthlyContribution?: number;
  contributionEnd?: ProjectionWindow;
  monthlyWithdrawal?: number;
  withdrawalStart?: ProjectionWindow;
};

export type CalculateRequest = {
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

export type CalculateResponse = {
  ok: boolean;
  error?: string;
  input?: unknown;
  echo?: {
    clientId: string;
    planStateCode: string;
    beneficiaryStateCode: string | null;
    isSsiBeneficiary: boolean | null;
    projection: {
      startingBalance: number | null;
      monthlyContribution: number | null;
      contributionEnd: ProjectionWindow | null;
      monthlyWithdrawal: number | null;
      withdrawalStart: ProjectionWindow | null;
    };
    projectionNotes: string[];
  };
  state?: {
    code: string;
    name: string | null;
    maxAccountBalance: number | null;
    residencyRequired: boolean | null;
  };
  tax?: {
    stateRate: unknown;
    stateDeduction: unknown;
  };
  federalSaversCredit?: {
    eligible: boolean | null;
    agiGateEligible: boolean;
    status: string;
    reasons: string[];
    agiUsed: number;
    filingStatusUsed: string;
    creditPercent: number | null;
    maxQualifyingContribution: number | null;
    notes: string[];
  };
  assumptions?: {
    annualReturn: {
      value: number;
      source: "override" | "client_default" | "fallback_default" | "hardcoded_fallback";
    };
    timeHorizonYears: {
      value: number;
      source: "override" | "client_default" | "fallback";
      notes?: string[];
    };
  };
  projectionWindowMonths?: number | null;
};
