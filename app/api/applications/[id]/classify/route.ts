import { NextResponse } from "next/server";
import { classifyJobEmail } from "../../../../../lib/classify-job-email";
import {
  areLikelySameRole,
  normalizeCompany,
  normalizeRole
} from "../../../../../lib/application-normalization";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeApplication(application: {
  id: string;
  gmailThreadId: string | null;
  company: string | null;
  role: string | null;
  normalizedCompany: string | null;
  normalizedRole: string | null;
  status: string;
  stage: string;
  isActive: boolean;
  lastEmailDate: Date;
  latestEmailAt: Date | null;
  latestSubject: string | null;
  confidenceScore: number | null;
  classificationReason: string | null;
  classificationSource: string | null;
  actionItem: string | null;
  dueDate: Date | null;
  classifiedAt: Date | null;
  emails: {
    id: string;
    fromEmail: string;
    fromName: string | null;
    subject: string;
    receivedAt: Date;
    classification: string;
    snippet: string;
    bodyText: string | null;
    bodyPreview: string | null;
    matchedJobRules: string | null;
    classificationReason: string | null;
  }[];
  _count: {
    emails: number;
  };
}) {
  const email = application.emails[0];

  return {
    id: application.id,
    gmailThreadId: application.gmailThreadId,
    company: application.company,
    role: application.role,
    normalizedCompany: application.normalizedCompany,
    normalizedRole: application.normalizedRole,
    status: application.status,
    stage: application.stage,
    isActive: application.isActive,
    lastEmailDate: application.lastEmailDate.toISOString().slice(0, 10),
    latestEmailAt: application.latestEmailAt?.toISOString() ?? null,
    latestSubject: application.latestSubject,
    confidenceScore: application.confidenceScore,
    classificationReason: application.classificationReason,
    classificationSource: application.classificationSource,
    actionItem: application.actionItem,
    dueDate: application.dueDate?.toISOString() ?? null,
    classifiedAt: application.classifiedAt?.toISOString() ?? null,
    sender: email?.fromEmail ?? "",
    subject: email?.subject ?? application.role ?? "",
    emailSnippet: email?.snippet ?? "",
    bodyPreview: email?.bodyPreview ?? "",
    matchedPhrases: email?.matchedJobRules ?? "",
    filterReason: email?.classificationReason ?? "",
    relatedEmailCount: application._count.emails,
    relatedEmails: application.emails.map((relatedEmail) => ({
      id: relatedEmail.id,
      subject: relatedEmail.subject,
      sender: relatedEmail.fromEmail,
      receivedAt: relatedEmail.receivedAt.toISOString(),
      classification: relatedEmail.classification,
      classificationReason: relatedEmail.classificationReason
    }))
  };
}

function isActiveForStatus(status: string, currentValue: boolean) {
  if (status === "rejected") {
    return false;
  }

  if (status === "waiting" || status === "needs_action") {
    return true;
  }

  return currentValue;
}

function shouldUseNewerEmailSummary(
  currentLatestEmailAt: Date | null,
  receivedAt: Date
) {
  return !currentLatestEmailAt || receivedAt >= currentLatestEmailAt;
}

async function findMatchingApplication({
  userId,
  applicationId,
  normalizedCompany,
  normalizedRole
}: {
  userId: string;
  applicationId: string;
  normalizedCompany: string | null;
  normalizedRole: string | null;
}) {
  if (!normalizedCompany || !normalizedRole) {
    return null;
  }

  const exactApplication = await prisma.jobApplication.findFirst({
    where: {
      userId,
      id: { not: applicationId },
      normalizedCompany,
      normalizedRole
    },
    orderBy: [{ latestEmailAt: "desc" }, { createdAt: "asc" }]
  });

  if (exactApplication) {
    return exactApplication;
  }

  const sameCompanyApplications = await prisma.jobApplication.findMany({
    where: {
      userId,
      id: { not: applicationId },
      normalizedCompany,
      normalizedRole: { not: null }
    },
    orderBy: [{ latestEmailAt: "desc" }, { createdAt: "asc" }]
  });

  return (
    sameCompanyApplications.find((candidateApplication) =>
      areLikelySameRole(normalizedRole, candidateApplication.normalizedRole)
    ) ?? null
  );
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const application = await prisma.jobApplication.findFirst({
    where: {
      id,
      userId: user.id
    },
    include: {
      emails: {
        orderBy: { receivedAt: "desc" },
        take: 1
      }
    }
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  const email = application.emails[0];

  if (!email) {
    return NextResponse.json(
      { error: "Application has no saved email to classify" },
      { status: 400 }
    );
  }

  let classification;

  try {
    classification = await classifyJobEmail({
      subject: email.subject,
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      snippet: email.snippet,
      bodyText: email.bodyText ?? email.bodyPreview
    });
  } catch (classificationError) {
    return NextResponse.json(
      {
        error:
          classificationError instanceof Error
            ? classificationError.message
            : "Gemini classification failed."
      },
      { status: 500 }
    );
  }
  const classifiedAt = new Date();
  const dueDate = classification.dueDate
    ? new Date(classification.dueDate)
    : null;
  const company = classification.company ?? application.company;
  const role = classification.role ?? application.role;
  const extractedNormalizedCompany = normalizeCompany(classification.company);
  const extractedNormalizedRole = normalizeRole(classification.role);
  const normalizedCompany =
    extractedNormalizedCompany ?? application.normalizedCompany;
  const normalizedRole = extractedNormalizedRole ?? application.normalizedRole;
  const matchingApplication = await findMatchingApplication({
    userId: user.id,
    applicationId: application.id,
    normalizedCompany: extractedNormalizedCompany,
    normalizedRole: extractedNormalizedRole
  });

  const targetApplication = matchingApplication ?? application;
  const latestEmailData = shouldUseNewerEmailSummary(
    targetApplication.latestEmailAt,
    email.receivedAt
  )
    ? {
        lastEmailDate: email.receivedAt,
        latestEmailAt: email.receivedAt,
        latestSubject: email.subject
      }
    : {};

  if (matchingApplication) {
    await prisma.$transaction([
      prisma.jobEmail.updateMany({
        where: { jobApplicationId: application.id },
        data: { jobApplicationId: matchingApplication.id }
      }),
      prisma.todo.updateMany({
        where: { applicationId: application.id },
        data: { applicationId: matchingApplication.id }
      }),
      prisma.jobEmail.update({
        where: { id: email.id },
        data: {
          classification: classification.status,
          classificationSource: "gemini",
          classificationReason: classification.reason,
          confidenceScore: classification.confidence,
          matchedStatusRule: classification.status
        }
      }),
      prisma.jobApplication.update({
        where: { id: matchingApplication.id },
        data: {
          status: classification.status,
          company: company ?? matchingApplication.company,
          role: role ?? matchingApplication.role,
          normalizedCompany:
            normalizedCompany ?? matchingApplication.normalizedCompany,
          normalizedRole: normalizedRole ?? matchingApplication.normalizedRole,
          isActive: isActiveForStatus(
            classification.status,
            matchingApplication.isActive
          ),
          confidenceScore: classification.confidence,
          classificationReason: classification.reason,
          classificationSource: "gemini",
          actionItem: classification.actionItem,
          dueDate,
          classifiedAt,
          ...latestEmailData
        }
      }),
      prisma.jobApplication.delete({
        where: { id: application.id }
      })
    ]);
  } else {
    await prisma.jobApplication.update({
      where: { id: application.id },
      data: {
        status: classification.status,
        company,
        role,
        normalizedCompany,
        normalizedRole,
        isActive: isActiveForStatus(classification.status, application.isActive),
        confidenceScore: classification.confidence,
        classificationReason: classification.reason,
        classificationSource: "gemini",
        actionItem: classification.actionItem,
        dueDate,
        classifiedAt,
        ...latestEmailData,
        emails: {
          update: {
            where: { id: email.id },
            data: {
              classification: classification.status,
              classificationSource: "gemini",
              classificationReason: classification.reason,
              confidenceScore: classification.confidence,
              matchedStatusRule: classification.status
            }
          }
        }
      }
    });
  }

  const updatedApplication = await prisma.jobApplication.findUniqueOrThrow({
    where: { id: targetApplication.id },
    include: {
      emails: {
        orderBy: { receivedAt: "desc" },
        take: 10
      },
      _count: {
        select: { emails: true }
      }
    }
  });

  return NextResponse.json(serializeApplication(updatedApplication));
}
