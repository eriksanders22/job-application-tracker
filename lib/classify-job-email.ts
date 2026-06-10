import { GoogleGenAI, Type } from "@google/genai";
import type {
  ApplicationStatus,
  JobEmailClassificationResult
} from "../types/application";

export type ClassifyJobEmailInput = {
  subject: string;
  fromEmail: string;
  fromName?: string | null;
  snippet: string;
  bodyText?: string | null;
};

const allowedStatuses = new Set<ApplicationStatus>([
  "waiting",
  "needs_action",
  "rejected",
  "unclassified"
]);

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      format: "enum",
      enum: ["waiting", "needs_action", "rejected", "unclassified"]
    },
    company: { type: Type.STRING, nullable: true },
    role: { type: Type.STRING, nullable: true },
    actionItem: { type: Type.STRING, nullable: true },
    dueDate: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
    reason: { type: Type.STRING }
  },
  required: [
    "status",
    "company",
    "role",
    "actionItem",
    "dueDate",
    "confidence",
    "reason"
  ],
  propertyOrdering: [
    "status",
    "company",
    "role",
    "actionItem",
    "dueDate",
    "confidence",
    "reason"
  ]
};

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeDueDate(value: unknown) {
  const dueDate = toNullableString(value);

  if (!dueDate) {
    return null;
  }

  const parsedDate = new Date(dueDate);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function unclassifiedResult(reason: string): JobEmailClassificationResult {
  return {
    status: "unclassified",
    company: null,
    role: null,
    actionItem: null,
    dueDate: null,
    confidence: 0,
    reason
  };
}

function parseJsonResponse(text: string | undefined) {
  if (!text) {
    return null;
  }

  const trimmedText = text.trim();
  const jsonText = trimmedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function validateClassification(
  parsedResponse: Record<string, unknown> | null
): JobEmailClassificationResult {
  if (!parsedResponse) {
    return unclassifiedResult(
      "Gemini returned an empty or unparsable classification response."
    );
  }

  const status =
    typeof parsedResponse.status === "string" &&
    allowedStatuses.has(parsedResponse.status as ApplicationStatus)
      ? (parsedResponse.status as ApplicationStatus)
      : "unclassified";

  const confidence =
    typeof parsedResponse.confidence === "number" &&
    parsedResponse.confidence >= 0 &&
    parsedResponse.confidence <= 1
      ? parsedResponse.confidence
      : 0;

  if (
    status === "unclassified" ||
    typeof parsedResponse.status !== "string" ||
    !allowedStatuses.has(parsedResponse.status as ApplicationStatus)
  ) {
    return {
      ...unclassifiedResult(
        toNullableString(parsedResponse.reason) ??
          "Gemini could not confidently classify this email."
      ),
      confidence
    };
  }

  return {
    status,
    company: toNullableString(parsedResponse.company),
    role: toNullableString(parsedResponse.role),
    actionItem: toNullableString(parsedResponse.actionItem),
    dueDate: normalizeDueDate(parsedResponse.dueDate),
    confidence,
    reason:
      toNullableString(parsedResponse.reason) ??
      "Gemini returned a valid classification without a reason."
  };
}

function buildPrompt(input: ClassifyJobEmailInput) {
  const sender = [input.fromName, input.fromEmail].filter(Boolean).join(" ");
  const emailContent = {
    subject: input.subject,
    sender,
    snippet: input.snippet,
    bodyText: (input.bodyText ?? "").slice(0, 4000)
  };

  return `You are classifying emails from a job application tracker.

Classify this job application email into exactly one status:
waiting, needs_action, rejected, or unclassified.

Definitions:
waiting:
The email confirms an application was submitted, received, reviewed, or says the company will contact the candidate later.

needs_action:
The email asks the candidate to do something, such as schedule an interview, complete an assessment, respond, upload documents, select a time, check for an invite, or provide more information.

rejected:
The email says the candidate was not selected, will not be moving forward, was unsuccessful, declined, or is no longer being considered.

unclassified:
The email is job-related but there is not enough information to confidently classify it.

Extract:

* status
* company
* role
* actionItem
* dueDate
* confidence
* reason

Rules:

* Do not invent missing information.
* If company is unclear, return null.
* If role is unclear, return null.
* If no action is required, actionItem should be null.
* If no due date is provided, dueDate should be null.
* If unsure, use unclassified.
* Return only valid JSON.

Expected JSON shape:
{
"status": "waiting",
"company": "string or null",
"role": "string or null",
"actionItem": "string or null",
"dueDate": "ISO date string or null",
"confidence": 0.0,
"reason": "short explanation"
}

Email:
${JSON.stringify(emailContent, null, 2)}`;
}

export async function classifyJobEmail(
  input: ClassifyJobEmailInput
): Promise<JobEmailClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_CLASSIFICATION_MODEL ?? "gemini-2.0-flash",
    contents: buildPrompt(input),
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.1
    }
  });

  return validateClassification(parseJsonResponse(response.text));
}
