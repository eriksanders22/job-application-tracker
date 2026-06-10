export type ApplicationStatus =
  | "rejected"
  | "needs_action"
  | "waiting"
  | "unclassified";
export type EmailClassification = ApplicationStatus | "other";
export type ClassificationSource =
  | "job_filter"
  | "rules"
  | "ai_placeholder"
  | "simple_phrase_filter"
  | "gemini";

export type JobEmailClassificationResult = {
  status: ApplicationStatus;
  company: string | null;
  role: string | null;
  actionItem: string | null;
  dueDate: string | null;
  confidence: number;
  reason: string;
};

export type JobEmail = {
  id: string;
  userId: string;
  applicationId?: string | null;
  gmailMessageId: string;
  threadId: string;
  fromEmail: string;
  fromName?: string | null;
  subject: string;
  snippet: string;
  bodyText?: string | null;
  bodyPreview?: string | null;
  receivedAt: string;
  classification: EmailClassification;
  classificationSource?: ClassificationSource | null;
  classificationReason?: string | null;
  matchedPhrase?: string | null;
  matchedJobRules?: string | null;
  matchedStatusRule?: string | null;
  jobRelatedScore?: number | null;
  confidenceScore?: number | null;
  createdAt: string;
  updatedAt?: string;
};

export type JobApplication = {
  id: string;
  userId?: string;
  company?: string | null;
  role?: string | null;
  companySource?: string | null;
  roleSource?: string | null;
  status: ApplicationStatus;
  lastEmailDate: string;
  confidenceScore?: number | null;
  classificationReason?: string | null;
  classificationSource?: ClassificationSource | null;
  actionItem?: string | null;
  dueDate?: string | null;
  classifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TodoItem = {
  id: string;
  userId: string;
  applicationId: string;
  task: string;
  dueDate?: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardApplication = JobApplication & {
  sender?: string;
  subject?: string;
  emailSnippet: string;
  bodyPreview?: string;
  temporaryStatus?: string;
  matchedPhrases?: string;
  filterReason?: string;
  classificationReason?: string | null;
  actionItem?: string | null;
  dueDate?: string | null;
  todo?: string;
};
