import {
  areLikelySameRole,
  normalizeCompany,
  normalizeRole
} from "./application-normalization";
import { classifyJobEmail } from "./classify-job-email";
import { filterJobApplicationEmail } from "./classifier";
import type { GmailMessageSummary } from "./gmail";
import { prisma } from "./prisma";
import type { JobEmailType } from "../types/application";

type ApplicationMatchInput = {
  userId: string;
  gmailThreadId: string | null;
  normalizedCompany?: string | null;
  normalizedRole?: string | null;
  isSchedulingProcessEmail?: boolean;
};

type ClassificationResult = Awaited<ReturnType<typeof classifyJobEmail>>;

export type SyncDebugEmail = {
  subject: string;
  gmailThreadId: string;
  baselineFilterResult: {
    isJobApplicationEmail: boolean;
    filterReason: string;
    matchedSubjectPhrases: string[];
    matchedStrongPhrases: string[];
    excludedPhrases: string[];
  };
  extractedCompany: string | null;
  extractedRole: string | null;
  normalizedCompany: string | null;
  normalizedRole: string | null;
  status: string | null;
  matchedExistingApplication: boolean;
  matchReason: string;
  emailType: JobEmailType | null;
  isApplicationAnchor: boolean;
  shouldCreateApplication: boolean;
  shouldAttachEmail: boolean;
  shouldMarkNeedsReview: boolean;
  needsReviewReason: string | null;
  possibleApplicationIds?: string[];
  isSchedulingProcessEmail?: boolean;
};

export type JobEmailSyncSummary = {
  totalFetched: number;
  skippedExistingEmails: number;
  skippedNonJobEmails: number;
  classifiedWithGemini: number;
  geminiFailures: number;
  createdFromApplicationAnchor: number;
  attachedToExistingApplication: number;
  needsReviewUnmatchedProcessEmail: number;
  skippedNonAnchorWithoutMatch: number;
  createdApplications: number;
  updatedApplications: number;
  savedJobEmails: number;
  updatedJobEmails: number;
  matchedByThreadId: number;
  matchedByExistingJobEmailThreadId: number;
  matchedByExactCompanyRole: number;
  matchedByCompanyRole: number;
  matchedByCompanyRoleSimilarity: number;
  matchedBySingleActiveCompanyScheduling: number;
  needsReviewMultipleCompanyApplications: number;
  debugEmails: SyncDebugEmail[];
};

const schedulingProcessPhrases = [
  "interview",
  "availability",
  "schedule",
  "reschedule",
  "canceled",
  "cancelled",
  "calendar invite",
  "bookings page",
  "hr video interview",
  "meeting",
  "accept this invitation"
];
const applicationAnchorPhrases = [
  "thank you for applying",
  "thanks for applying",
  "we received your application",
  "we've received your application",
  "your application has been received",
  "your application was received",
  "application submitted",
  "application is complete",
  "application was sent",
  "your application was sent",
  "your resume has been submitted",
  "resume has been submitted",
  "confirmation that your resume has been submitted",
  "thank you for your interest",
  "your application for",
  "application confirmation",
  "submitted application"
];

function isActiveForStatus(status: string, currentValue = true) {
  if (status === "rejected") {
    return false;
  }

  if (status === "waiting" || status === "needs_action") {
    return true;
  }

  return currentValue;
}

function buildSearchText(message: GmailMessageSummary) {
  return [
    message.subject,
    message.fromEmail,
    message.fromName,
    message.snippet,
    message.bodyPreview,
    message.bodyText
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function includesAnyPhrase(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

export function isDeterministicApplicationAnchor(message: GmailMessageSummary) {
  return includesAnyPhrase(buildSearchText(message), applicationAnchorPhrases);
}

function determineEmailLifecycleType({
  message,
  classification
}: {
  message: GmailMessageSummary;
  classification: ClassificationResult;
}) {
  const isSchedulingProcessEmail = isSchedulingOrProcessEmail(message);
  const isApplicationAnchor =
    isDeterministicApplicationAnchor(message) ||
    classification.isApplicationAnchor ||
    classification.emailType === "application_anchor";

  if (isApplicationAnchor) {
    return {
      emailType: "application_anchor" as JobEmailType,
      isApplicationAnchor: true,
      isSchedulingProcessEmail
    };
  }

  if (
    isSchedulingProcessEmail ||
    classification.emailType === "process_update"
  ) {
    return {
      emailType: "process_update" as JobEmailType,
      isApplicationAnchor: false,
      isSchedulingProcessEmail
    };
  }

  return {
    emailType:
      classification.emailType === "non_job"
        ? ("non_job" as JobEmailType)
        : ("needs_review" as JobEmailType),
    isApplicationAnchor: false,
    isSchedulingProcessEmail
  };
}

async function findApplicationForEmail({
  userId,
  gmailThreadId,
  normalizedCompany,
  normalizedRole,
  isSchedulingProcessEmail = false
}: ApplicationMatchInput) {
  if (gmailThreadId) {
    const threadApplication = await prisma.jobApplication.findUnique({
      where: {
        userId_gmailThreadId: {
          userId,
          gmailThreadId
        }
      }
    });

    if (threadApplication) {
      return {
        application: threadApplication,
        matchReason: "threadId" as const
      };
    }

    const threadEmail = await prisma.jobEmail.findFirst({
      where: {
        userId,
        gmailThreadId,
        jobApplicationId: { not: null }
      },
      include: { application: true },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }]
    });

    if (threadEmail?.application) {
      return {
        application: threadEmail.application,
        matchReason: "existingJobEmailThreadId" as const
      };
    }
  }

  if (normalizedCompany && normalizedRole) {
    const companyRoleApplication = await prisma.jobApplication.findFirst({
      where: {
        userId,
        normalizedCompany,
        normalizedRole
      },
      orderBy: [{ latestEmailAt: "desc" }, { createdAt: "asc" }]
    });

    if (companyRoleApplication) {
      return {
        application: companyRoleApplication,
        matchReason: "exactCompanyRole" as const
      };
    }

    const sameCompanyApplications = await prisma.jobApplication.findMany({
      where: {
        userId,
        normalizedCompany,
        normalizedRole: { not: null }
      },
      orderBy: [{ latestEmailAt: "desc" }, { createdAt: "asc" }]
    });
    const similarRoleApplication = sameCompanyApplications.find((application) =>
      areLikelySameRole(normalizedRole, application.normalizedRole)
    );

    if (similarRoleApplication) {
      return {
        application: similarRoleApplication,
        matchReason: "companyRoleSimilarity" as const
      };
    }
  }

  if (normalizedCompany && isSchedulingProcessEmail) {
    const activeCompanyApplications = await prisma.jobApplication.findMany({
      where: {
        userId,
        normalizedCompany,
        isActive: true
      },
      orderBy: [{ latestEmailAt: "desc" }, { createdAt: "asc" }]
    });

    if (activeCompanyApplications.length === 1) {
      return {
        application: activeCompanyApplications[0],
        matchReason: "singleActiveCompanySchedulingMatch" as const
      };
    }

    if (activeCompanyApplications.length > 1) {
      return {
        application: null,
        matchReason: "needsReviewMultipleCompanyApplications" as const,
        possibleApplicationIds: activeCompanyApplications.map(
          (application) => application.id
        )
      };
    }
  }

  return {
    application: null,
    matchReason: "noMatch" as const
  };
}

function shouldUseEmailForApplicationSummary(
  latestEmailAt: Date | null,
  receivedAt: Date
) {
  return !latestEmailAt || receivedAt >= latestEmailAt;
}

function parseDueDate(dueDate: string | null) {
  return dueDate ? new Date(dueDate) : null;
}

function buildMatchedJobRules(
  filterResult: ReturnType<typeof filterJobApplicationEmail>
) {
  return [
    ...filterResult.matchedSubjectPhrases.map((phrase) => `subject: ${phrase}`),
    ...filterResult.matchedStrongPhrases.map((phrase) => `strong: ${phrase}`)
  ].join(", ");
}

function buildApplicationSummaryData({
  classification,
  receivedAt,
  subject
}: {
  classification: ClassificationResult;
  receivedAt: Date;
  subject: string;
}) {
  return {
    status: classification.status,
    isActive: isActiveForStatus(classification.status),
    actionItem: classification.actionItem,
    dueDate: parseDueDate(classification.dueDate),
    confidenceScore: classification.confidence,
    classificationReason: classification.reason,
    classificationSource: "gemini",
    classifiedAt: new Date(),
    lastEmailDate: receivedAt,
    latestEmailAt: receivedAt,
    latestSubject: subject
  };
}

export function decideEmailAction({
  emailType,
  isApplicationAnchor,
  application,
  matchReason
}: {
  emailType: JobEmailType;
  isApplicationAnchor: boolean;
  application: { id: string } | null;
  matchReason: string;
}) {
  if (application) {
    return {
      shouldCreateApplication: false,
      shouldAttachEmail: true,
      shouldMarkNeedsReview: false,
      matchReason,
      needsReviewReason: null
    };
  }

  if (matchReason === "needsReviewMultipleCompanyApplications") {
    return {
      shouldCreateApplication: false,
      shouldAttachEmail: false,
      shouldMarkNeedsReview: true,
      matchReason,
      needsReviewReason:
        "Multiple active applications exist for this company; not safe to attach by company alone."
    };
  }

  if (isApplicationAnchor) {
    return {
      shouldCreateApplication: true,
      shouldAttachEmail: true,
      shouldMarkNeedsReview: false,
      matchReason: "createdFromApplicationAnchor",
      needsReviewReason: null
    };
  }

  return {
    shouldCreateApplication: false,
    shouldAttachEmail: false,
    shouldMarkNeedsReview: true,
    matchReason:
      emailType === "non_job"
        ? "geminiNonJobAfterBaseline"
        : "needsReviewUnmatchedProcessEmail",
    needsReviewReason:
      "Job-process email did not confidently match an existing application and is not an application anchor."
  };
}

export function isSchedulingOrProcessEmail(message: GmailMessageSummary) {
  return includesAnyPhrase(buildSearchText(message), schedulingProcessPhrases);
}

function toBaselineDebug(
  filterResult: ReturnType<typeof filterJobApplicationEmail>
) {
  return {
    isJobApplicationEmail: filterResult.isJobApplicationEmail,
    filterReason: filterResult.filterReason,
    matchedSubjectPhrases: filterResult.matchedSubjectPhrases,
    matchedStrongPhrases: filterResult.matchedStrongPhrases,
    excludedPhrases: filterResult.excludedPhrases
  };
}

function createSummary(totalFetched: number): JobEmailSyncSummary {
  return {
    totalFetched,
    skippedExistingEmails: 0,
    skippedNonJobEmails: 0,
    classifiedWithGemini: 0,
    geminiFailures: 0,
    createdFromApplicationAnchor: 0,
    attachedToExistingApplication: 0,
    needsReviewUnmatchedProcessEmail: 0,
    skippedNonAnchorWithoutMatch: 0,
    createdApplications: 0,
    updatedApplications: 0,
    savedJobEmails: 0,
    updatedJobEmails: 0,
    matchedByThreadId: 0,
    matchedByExistingJobEmailThreadId: 0,
    matchedByExactCompanyRole: 0,
    matchedByCompanyRole: 0,
    matchedByCompanyRoleSimilarity: 0,
    matchedBySingleActiveCompanyScheduling: 0,
    needsReviewMultipleCompanyApplications: 0,
    debugEmails: []
  };
}

export async function syncJobEmailMessages({
  userId,
  messages
}: {
  userId: string;
  messages: GmailMessageSummary[];
}) {
  const summary = createSummary(messages.length);

  for (const message of messages) {
    const filterResult = filterJobApplicationEmail({
      subject: message.subject,
      fromEmail: message.fromEmail,
      fromName: message.fromName,
      snippet: message.snippet,
      bodyText: message.bodyText
    });

    const schedulingProcessEmail = isSchedulingOrProcessEmail(message);
    const debugEmail: SyncDebugEmail = {
      subject: message.subject,
      gmailThreadId: message.threadId,
      baselineFilterResult: toBaselineDebug(filterResult),
      emailType: null,
      isApplicationAnchor: false,
      extractedCompany: null,
      extractedRole: null,
      normalizedCompany: null,
      normalizedRole: null,
      status: null,
      matchedExistingApplication: false,
      matchReason: "not_processed",
      shouldCreateApplication: false,
      shouldAttachEmail: false,
      shouldMarkNeedsReview: false,
      needsReviewReason: null,
      isSchedulingProcessEmail: schedulingProcessEmail
    };

    if (!filterResult.isJobApplicationEmail) {
      summary.skippedNonJobEmails += 1;
      debugEmail.emailType = "non_job";
      debugEmail.matchReason = "skipped_non_job";
      summary.debugEmails.push(debugEmail);
      continue;
    }

    const existingEmail = await prisma.jobEmail.findUnique({
      where: { gmailMessageId: message.gmailMessageId }
    });

    if (existingEmail) {
      summary.skippedExistingEmails += 1;
      debugEmail.matchReason = "skipped_existing_gmail_message";
      summary.debugEmails.push(debugEmail);
      continue;
    }

    let classification: ClassificationResult;

    try {
      classification = await classifyJobEmail({
        subject: message.subject,
        fromEmail: message.fromEmail,
        fromName: message.fromName,
        snippet: message.snippet,
        bodyText: message.bodyText || message.bodyPreview
      });
      summary.classifiedWithGemini += 1;
    } catch {
      summary.geminiFailures += 1;
      debugEmail.matchReason = "gemini_failed";
      summary.debugEmails.push(debugEmail);
      continue;
    }

    const normalizedCompany = normalizeCompany(classification.company);
    const normalizedRole = normalizeRole(classification.role);
    const lifecycle = determineEmailLifecycleType({
      message,
      classification
    });
    debugEmail.extractedCompany = classification.company;
    debugEmail.extractedRole = classification.role;
    debugEmail.normalizedCompany = normalizedCompany;
    debugEmail.normalizedRole = normalizedRole;
    debugEmail.status = classification.status;
    debugEmail.emailType = lifecycle.emailType;
    debugEmail.isApplicationAnchor = lifecycle.isApplicationAnchor;

    const gmailThreadId = message.threadId || null;
    const { application, matchReason, possibleApplicationIds } =
      await findApplicationForEmail({
        userId,
        gmailThreadId,
        normalizedCompany,
        normalizedRole,
        isSchedulingProcessEmail: lifecycle.isSchedulingProcessEmail
      });
    const decision = decideEmailAction({
      emailType: lifecycle.emailType,
      isApplicationAnchor: lifecycle.isApplicationAnchor,
      application,
      matchReason
    });
    debugEmail.matchedExistingApplication = Boolean(application);
    debugEmail.matchReason = decision.matchReason;
    debugEmail.shouldCreateApplication = decision.shouldCreateApplication;
    debugEmail.shouldAttachEmail = decision.shouldAttachEmail;
    debugEmail.shouldMarkNeedsReview = decision.shouldMarkNeedsReview;
    debugEmail.needsReviewReason = decision.needsReviewReason;

    let targetApplication = application;

    if (decision.shouldCreateApplication) {
      targetApplication = await prisma.jobApplication.create({
        data: {
          id: `gmail-${message.gmailMessageId}`,
          userId,
          gmailThreadId,
          company: classification.company,
          role: classification.role,
          normalizedCompany,
          normalizedRole,
          ...buildApplicationSummaryData({
            classification,
            receivedAt: message.receivedAt,
            subject: message.subject
          })
        }
      });
      summary.createdApplications += 1;
      summary.createdFromApplicationAnchor += 1;
    }

    if (decision.shouldMarkNeedsReview) {
      if (decision.matchReason === "needsReviewMultipleCompanyApplications") {
        summary.needsReviewMultipleCompanyApplications += 1;
        debugEmail.possibleApplicationIds = possibleApplicationIds;
      } else {
        summary.needsReviewUnmatchedProcessEmail += 1;
        summary.skippedNonAnchorWithoutMatch += 1;
      }
    }

    const shouldAttachEmail =
      decision.shouldAttachEmail && Boolean(targetApplication);
    const shouldUpdateSummary =
      shouldAttachEmail &&
      targetApplication &&
      shouldUseEmailForApplicationSummary(
        targetApplication.latestEmailAt,
        message.receivedAt
      );
    const matchedPhrase =
      filterResult.matchedSubjectPhrases[0] ??
      filterResult.matchedStrongPhrases[0] ??
      null;

    await prisma.$transaction([
      prisma.jobEmail.create({
        data: {
          userId,
          jobApplicationId: shouldAttachEmail
            ? targetApplication?.id ?? null
            : null,
          gmailMessageId: message.gmailMessageId,
          gmailThreadId: message.threadId,
          fromEmail: message.fromEmail,
          fromName: message.fromName,
          subject: message.subject,
          snippet: message.snippet,
          bodyText: message.bodyText,
          bodyPreview: message.bodyPreview,
          receivedAt: message.receivedAt,
          classification: classification.status,
          classificationSource: "gemini",
          classificationReason: classification.reason,
          emailType: lifecycle.emailType,
          isApplicationAnchor: lifecycle.isApplicationAnchor,
          matchStatus: decision.shouldMarkNeedsReview
            ? "needs_review"
            : "attached",
          matchReason: decision.matchReason,
          needsReviewReason: decision.needsReviewReason,
          suggestedJobApplicationId:
            possibleApplicationIds?.length === 1
              ? possibleApplicationIds[0]
              : null,
          matchedPhrase,
          matchedJobRules: buildMatchedJobRules(filterResult),
          matchedStatusRule: classification.status,
          jobRelatedScore: null,
          confidenceScore: classification.confidence
        }
      }),
      ...(shouldAttachEmail &&
      targetApplication &&
      application &&
      !decision.shouldCreateApplication
        ? [
            prisma.jobApplication.update({
              where: { id: targetApplication.id },
              data: {
                company: classification.company ?? targetApplication.company,
                role: classification.role ?? targetApplication.role,
                normalizedCompany:
                  normalizedCompany ?? targetApplication.normalizedCompany,
                normalizedRole:
                  normalizedRole ?? targetApplication.normalizedRole,
                ...(shouldUpdateSummary
                  ? buildApplicationSummaryData({
                      classification,
                      receivedAt: message.receivedAt,
                      subject: message.subject
                    })
                  : {})
              }
            })
          ]
        : [])
    ]);

    if (decision.shouldAttachEmail && !decision.shouldCreateApplication) {
      summary.attachedToExistingApplication += 1;
      summary.updatedApplications += 1;
    }

    if (matchReason === "threadId") {
      summary.matchedByThreadId += 1;
    } else if (matchReason === "existingJobEmailThreadId") {
      summary.matchedByExistingJobEmailThreadId += 1;
    } else if (matchReason === "exactCompanyRole") {
      summary.matchedByExactCompanyRole += 1;
      summary.matchedByCompanyRole += 1;
    } else if (matchReason === "companyRoleSimilarity") {
      summary.matchedByCompanyRoleSimilarity += 1;
    } else if (matchReason === "singleActiveCompanySchedulingMatch") {
      summary.matchedBySingleActiveCompanyScheduling += 1;
    }

    summary.savedJobEmails += 1;
    summary.debugEmails.push(debugEmail);
  }

  return summary;
}
