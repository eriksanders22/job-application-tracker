import type { EmailClassification } from "../types/application";

type ClassificationResult = {
  status: EmailClassification;
  confidenceScore: number;
  todo: string | null;
  reason: string;
};

const rejectedPhrases = [
  "unfortunately",
  "not selected",
  "not be moving forward",
  "decided to pursue other candidates",
  "after careful consideration",
  "we are pursuing other candidates",
  "regret to inform you",
  "other candidates"
];

const needsActionPhrases = [
  "please reply",
  "schedule",
  "availability",
  "complete",
  "assessment",
  "take-home",
  "next round",
  "interview"
];

const waitingPhrases = [
  "received your application",
  "reviewing",
  "next steps soon",
  "still being reviewed",
  "update for you"
];

function includesAnyPhrase(text: string, phrases: string[]) {
  const normalizedText = text.toLowerCase();

  return phrases.some((phrase) => normalizedText.includes(phrase));
}

export function classifyJobEmail(text: string): ClassificationResult {
  if (includesAnyPhrase(text, rejectedPhrases)) {
    return {
      status: "rejected",
      confidenceScore: 0.9,
      todo: null,
      reason: "Matched a rejection phrase."
    };
  }

  if (includesAnyPhrase(text, needsActionPhrases)) {
    return {
      status: "needs_action",
      confidenceScore: 0.82,
      todo: "Review this email and respond to the requested next step.",
      reason: "Matched a requested next-step phrase."
    };
  }

  if (includesAnyPhrase(text, waitingPhrases)) {
    return {
      status: "waiting",
      confidenceScore: 0.75,
      todo: null,
      reason: "Matched a waiting or review phrase."
    };
  }

  return {
    status: "other",
    confidenceScore: 0.55,
    todo: null,
    reason: "No job-application status phrase matched."
  };
}
