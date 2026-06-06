export type ApplicationStatus = "rejected" | "needs_action" | "waiting";
export type EmailClassification = ApplicationStatus | "other";

export type JobEmail = {
  id: string;
  userId: string;
  applicationId?: string | null;
  gmailMessageId: string;
  threadId: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  bodyPreview?: string | null;
  receivedAt: string;
  classification: EmailClassification;
  classificationReason?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type JobApplication = {
  id: string;
  userId?: string;
  company: string;
  role: string;
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
  emailSnippet: string;
  todo: string;
};
