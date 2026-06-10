import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
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

  const applications = await prisma.jobApplication.findMany({
    where: { userId: user.id },
    orderBy: { lastEmailDate: "desc" },
    include: {
      emails: {
        orderBy: { receivedAt: "desc" },
        take: 1
      },
      todos: {
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });

  return NextResponse.json(
    applications.map((application) => ({
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
      sender: application.emails[0]?.fromEmail ?? "",
      subject: application.emails[0]?.subject ?? application.role ?? "",
      emailSnippet: application.emails[0]?.snippet ?? "",
      bodyPreview: application.emails[0]?.bodyPreview ?? "",
      matchedPhrases: application.emails[0]?.matchedJobRules ?? "",
      filterReason: application.emails[0]?.classificationReason ?? ""
    }))
  );
}
