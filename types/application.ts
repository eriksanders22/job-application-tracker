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
export type JobEmailType =
  | "application_anchor"
  | "process_update"
  | "non_job"
  | "needs_review";

export type JobEmailClassificationResult = {
  emailType: JobEmailType;
  isApplicationAnchor: boolean;
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
  jobApplicationId?: string | null;
  gmailMessageId: string;
  gmailThreadId: string;
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
  emailType?: JobEmailType | null;
  isApplicationAnchor?: boolean;
  matchStatus?: "attached" | "needs_review" | "skipped" | "ignored";
  matchReason?: string | null;
  needsReviewReason?: string | null;
  suggestedJobApplicationId?: string | null;
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
  gmailThreadId?: string | null;
  company?: string | null;
  role?: string | null;
  normalizedCompany?: string | null;
  normalizedRole?: string | null;
  companySource?: string | null;
  roleSource?: string | null;
  status: ApplicationStatus;
  stage?: string;
  isActive?: boolean;
  lastEmailDate: string;
  latestEmailAt?: string | null;
  latestSubject?: string | null;
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
  relatedEmailCount?: number;
  relatedEmails?: {
    id: string;
    subject: string;
    sender: string;
    receivedAt: string;
    classification: EmailClassification;
    classificationReason?: string | null;
  }[];
  todo?: string;
};
