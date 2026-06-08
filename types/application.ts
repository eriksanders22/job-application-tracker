export type ApplicationStatus = "rejected" | "needs_action" | "waiting";
export type EmailClassification = ApplicationStatus | "other";
export type ClassificationSource =
  | "job_filter"
  | "rules"
  | "ai_placeholder";

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
  company: string;
  role: string;
  companySource?: string | null;
  roleSource?: string | null;
  status: ApplicationStatus;
  lastEmailDate: string;
  confidenceScore?: number;
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
  todo?: string;
};
