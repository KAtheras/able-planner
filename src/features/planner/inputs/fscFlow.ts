export type FscQuestionKey = "hasTaxLiability" | "isOver18" | "isStudent" | "isDependent";

export type FscAnswers = Record<FscQuestionKey, boolean | null>;

export const EMPTY_FSC: FscAnswers = {
  hasTaxLiability: null,
  isOver18: null,
  isStudent: null,
  isDependent: null,
};

const FSC_REQUIRED_ANSWERS: Record<FscQuestionKey, boolean> = {
  hasTaxLiability: true,
  isOver18: true,
  isStudent: false,
  isDependent: false,
};

export type FscQuestion = { key: FscQuestionKey; label: string };

export function buildFscQuestions(labels: {
  taxLiability: string;
  age18: string;
  student: string;
  dependent: string;
}): FscQuestion[] {
  return [
    { key: "hasTaxLiability", label: labels.taxLiability },
    { key: "isOver18", label: labels.age18 },
    { key: "isStudent", label: labels.student },
    { key: "isDependent", label: labels.dependent },
  ];
}

export function getVisibleFscQuestions(
  questions: FscQuestion[],
  answers: FscAnswers,
): FscQuestion[] {
  const currentQuestionIndexRaw = questions.findIndex((question) => answers[question.key] === null);
  const visibleQuestionCount = currentQuestionIndexRaw === -1 ? questions.length : currentQuestionIndexRaw + 1;
  return questions.slice(0, visibleQuestionCount);
}

export function shouldDisqualifyFscAnswer(key: FscQuestionKey, value: boolean) {
  return value !== FSC_REQUIRED_ANSWERS[key];
}

export function isLastFscQuestion(key: FscQuestionKey, questions: FscQuestion[]) {
  const answeredQuestionIndex = questions.findIndex((question) => question.key === key);
  return answeredQuestionIndex >= questions.length - 1;
}

export function getFscButtonLabel(params: {
  agiGateEligible: boolean | null;
  fscStatus: "idle" | "eligible" | "ineligible";
  labels: {
    enterAgiToTestEligibility: string;
    notEligibleBasedOnAgi: string;
    eligibleRetest: string;
    notEligibleRetest: string;
    eligibleToEvaluate: string;
  };
}) {
  const { agiGateEligible, fscStatus, labels } = params;
  if (agiGateEligible === null) return labels.enterAgiToTestEligibility;
  if (agiGateEligible === false) return labels.notEligibleBasedOnAgi;
  if (fscStatus === "eligible") return labels.eligibleRetest;
  if (fscStatus === "ineligible") return labels.notEligibleRetest;
  return labels.eligibleToEvaluate;
}
