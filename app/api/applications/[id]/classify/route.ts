import { NextResponse } from "next/server";
import { classifyJobEmail } from "../../../../../lib/classify-job-email";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function serializeApplication(application: {
  id: string;
  company: string | null;
  role: string | null;
  status: string;
  lastEmailDate: Date;
  confidenceScore: number | null;
  classificationReason: string | null;
  classificationSource: string | null;
  actionItem: string | null;
  dueDate: Date | null;
  classifiedAt: Date | null;
  emails: {
    fromEmail: string;
    fromName: string | null;
    subject: string;
    snippet: string;
    bodyText: string | null;
    bodyPreview: string | null;
    matchedJobRules: string | null;
    classificationReason: string | null;
  }[];
}) {
  const email = application.emails[0];

  return {
    id: application.id,
    company: application.company,
    role: application.role,
    status: application.status,
    lastEmailDate: application.lastEmailDate.toISOString().slice(0, 10),
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
    filterReason: email?.classificationReason ?? ""
  };
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

  const updatedApplication = await prisma.jobApplication.update({
    where: { id: application.id },
    data: {
      status: classification.status,
      company: classification.company,
      role: classification.role,
      confidenceScore: classification.confidence,
      classificationReason: classification.reason,
      classificationSource: "gemini",
      actionItem: classification.actionItem,
      dueDate,
      classifiedAt,
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
    },
    include: {
      emails: {
        orderBy: { receivedAt: "desc" },
        take: 1
      }
    }
  });

  return NextResponse.json(serializeApplication(updatedApplication));
}
