"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type BudgetMode = "default" | "qualifiedWithdrawals";

export type QualifiedWithdrawalBudget = {
  housing: string;
  healthcare: string;
  transportation: string;
  education: string;
  other: string;
};

export const EMPTY_QUALIFIED_WITHDRAWAL_BUDGET: QualifiedWithdrawalBudget = {
  housing: "",
  healthcare: "",
  transportation: "",
  education: "",
  other: "",
};

type Args = {
  monthlyWithdrawal: string;
  setMonthlyWithdrawal: (value: string) => void;
  sanitizeAmountInput: (value: string) => string;
};

export function useQualifiedWithdrawalBudget({
  monthlyWithdrawal,
  setMonthlyWithdrawal,
  sanitizeAmountInput,
}: Args) {
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("default");
  const [qualifiedWithdrawalBudget, setQualifiedWithdrawalBudget] =
    useState<QualifiedWithdrawalBudget>({ ...EMPTY_QUALIFIED_WITHDRAWAL_BUDGET });
  const [qualifiedWithdrawalBudgetTouched, setQualifiedWithdrawalBudgetTouched] = useState(false);

  const parseNonNegativeAmount = useCallback(
    (value: string) => {
      const cleaned = sanitizeAmountInput(value);
      const numeric = Number(cleaned || "0");
      if (!Number.isFinite(numeric)) return 0;
      return Math.max(0, numeric);
    },
    [sanitizeAmountInput],
  );

  const formatAmountInput = useCallback((value: number) => {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
  }, []);

  const qualifiedWithdrawalTotal = useMemo(
    () =>
      parseNonNegativeAmount(qualifiedWithdrawalBudget.housing) +
      parseNonNegativeAmount(qualifiedWithdrawalBudget.healthcare) +
      parseNonNegativeAmount(qualifiedWithdrawalBudget.transportation) +
      parseNonNegativeAmount(qualifiedWithdrawalBudget.education) +
      parseNonNegativeAmount(qualifiedWithdrawalBudget.other),
    [parseNonNegativeAmount, qualifiedWithdrawalBudget],
  );
  const isBudgetApplied = qualifiedWithdrawalBudgetTouched;

  useEffect(() => {
    if (!qualifiedWithdrawalBudgetTouched) return;
    const nextWithdrawal = formatAmountInput(qualifiedWithdrawalTotal);
    if (monthlyWithdrawal !== nextWithdrawal) {
      setMonthlyWithdrawal(nextWithdrawal);
    }
  }, [
    formatAmountInput,
    monthlyWithdrawal,
    qualifiedWithdrawalBudgetTouched,
    qualifiedWithdrawalTotal,
    setMonthlyWithdrawal,
  ]);

  const resetQualifiedWithdrawalBudget = useCallback(() => {
    setBudgetMode("default");
    setQualifiedWithdrawalBudget({ ...EMPTY_QUALIFIED_WITHDRAWAL_BUDGET });
    setQualifiedWithdrawalBudgetTouched(false);
  }, []);

  const handleBudgetFieldChange = useCallback(
    (key: keyof QualifiedWithdrawalBudget, value: string) => {
      const sanitized = sanitizeAmountInput(value);
      setQualifiedWithdrawalBudgetTouched(true);
      setQualifiedWithdrawalBudget((prev) => ({ ...prev, [key]: sanitized }));
    },
    [sanitizeAmountInput],
  );

  const handleManualWithdrawalOverride = useCallback(
    (value: string) => {
      setMonthlyWithdrawal(sanitizeAmountInput(value));
      setQualifiedWithdrawalBudget({ ...EMPTY_QUALIFIED_WITHDRAWAL_BUDGET });
      setQualifiedWithdrawalBudgetTouched(false);
    },
    [sanitizeAmountInput, setMonthlyWithdrawal],
  );

  const toggleBudgetMode = useCallback(() => {
    setBudgetMode((prev) => (prev === "qualifiedWithdrawals" ? "default" : "qualifiedWithdrawals"));
  }, []);

  return {
    budgetMode,
    setBudgetMode,
    toggleBudgetMode,
    qualifiedWithdrawalBudget,
    qualifiedWithdrawalTotal,
    isBudgetApplied,
    handleBudgetFieldChange,
    handleManualWithdrawalOverride,
    resetQualifiedWithdrawalBudget,
  };
}
