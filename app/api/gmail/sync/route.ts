import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { classifyJobEmail } from "../../../../lib/classifier";
import {
  createGmailClient,
  fetchRecentJobMessageSummaries
} from "../../../../lib/gmail";
import { prisma } from "../../../../lib/prisma";
import type {
  ApplicationStatus,
  EmailClassification
} from "../../../../types/application";

function inferCompany(fromEmail: string) {
  const emailMatch = fromEmail.match(/<([^>]+)>/);
  const email = emailMatch?.[1] ?? fromEmail;
  const domain = email.split("@")[1]?.split(".")[0];

  if (!domain) {
    return "Unknown Company";
  }

  return domain
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferRole(subject: string) {
  const roleMatch = subject.match(/(?:for|your)\s+(.+?)(?:\s+application|$)/i);

  return roleMatch?.[1]?.trim() || "Unknown Role";
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      accounts: {
        where: { provider: "google" },
        take: 1
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const googleAccount = user.accounts[0];

  if (!googleAccount?.access_token) {
    return NextResponse.json(
      { error: "Google access token not found. Please sign in again." },
      { status: 400 }
    );
  }

  if (!googleAccount.scope?.includes("https://www.googleapis.com/auth/gmail.readonly")) {
    return NextResponse.json(
      {
        error:
          "Gmail readonly permission is missing. Please sign out and sign in again."
      },
      { status: 400 }
    );
  }

  const gmail = createGmailClient({
    access_token: googleAccount.access_token,
    refresh_token: googleAccount.refresh_token,
    expires_at: googleAccount.expires_at
  });
  const messages = await fetchRecentJobMessageSummaries(gmail);
  const classificationCounts: Record<EmailClassification, number> = {
    needs_action: 0,
    rejected: 0,
    waiting: 0,
    other: 0
  };
  let applicationsCreated = 0;
  let applicationsUpdated = 0;
  let todosCreated = 0;

  for (const message of messages) {
    const classificationText = [
      message.subject,
      message.fromEmail,
      message.snippet,
      message.bodyText
    ]
      .filter(Boolean)
      .join("\n\n");
    const classification = classifyJobEmail(classificationText);
    classificationCounts[classification.status] += 1;
    const company = inferCompany(message.fromEmail);
    const role = inferRole(message.subject);
    const existingEmail = await prisma.jobEmail.findUnique({
      where: { gmailMessageId: message.gmailMessageId },
      select: { applicationId: true }
    });
    let applicationId = existingEmail?.applicationId ?? null;

    if (classification.status === "other") {
      await prisma.jobEmail.upsert({
        where: { gmailMessageId: message.gmailMessageId },
        update: {
          fromEmail: message.fromEmail,
          subject: message.subject,
          snippet: message.snippet,
          bodyPreview: message.bodyPreview,
          receivedAt: message.receivedAt,
          classification: classification.status,
          classificationReason: classification.reason
        },
        create: {
          userId: user.id,
          applicationId: null,
          gmailMessageId: message.gmailMessageId,
          threadId: message.threadId,
          fromEmail: message.fromEmail,
          subject: message.subject,
          snippet: message.snippet,
          bodyPreview: message.bodyPreview,
          receivedAt: message.receivedAt,
          classification: classification.status,
          classificationReason: classification.reason
        }
      });
      continue;
    }

    if (!applicationId) {
      const existingApplication = await prisma.jobApplication.findFirst({
        where: {
          userId: user.id,
          company,
          role
        }
      });

      const application =
        existingApplication ??
        (await prisma.jobApplication.create({
          data: {
            userId: user.id,
            company,
            role,
            status: classification.status,
            lastEmailDate: message.receivedAt,
            confidenceScore: classification.confidenceScore
          }
        }));

      if (existingApplication) {
        applicationsUpdated += 1;
      } else {
        applicationsCreated += 1;
      }

      applicationId = application.id;
    } else {
      applicationsUpdated += 1;
    }

    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: classification.status as ApplicationStatus,
        lastEmailDate: message.receivedAt,
        confidenceScore: classification.confidenceScore
      }
    });

    await prisma.jobEmail.upsert({
      where: { gmailMessageId: message.gmailMessageId },
      update: {
        applicationId,
        fromEmail: message.fromEmail,
        subject: message.subject,
        snippet: message.snippet,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
        classification: classification.status,
        classificationReason: classification.reason
      },
      create: {
        userId: user.id,
        applicationId,
        gmailMessageId: message.gmailMessageId,
        threadId: message.threadId,
        fromEmail: message.fromEmail,
        subject: message.subject,
        snippet: message.snippet,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
        classification: classification.status,
        classificationReason: classification.reason
      }
    });

    if (classification.status === "needs_action" && classification.todo) {
      const existingTodo = await prisma.todo.findFirst({
        where: {
          userId: user.id,
          applicationId,
          task: classification.todo
        }
      });

      if (!existingTodo) {
        await prisma.todo.create({
          data: {
            userId: user.id,
            applicationId,
            task: classification.todo
          }
        });
        todosCreated += 1;
      }
    }
  }

  console.info("Gmail sync summary", {
    totalMessages: messages.length,
    rejected: classificationCounts.rejected,
    needsAction: classificationCounts.needs_action,
    waiting: classificationCounts.waiting,
    other: classificationCounts.other,
    applicationsCreated,
    applicationsUpdated
  });

  return NextResponse.json({
    syncedMessages: messages.length,
    applicationsChanged: applicationsCreated + applicationsUpdated,
    applicationsCreated,
    applicationsUpdated,
    ignoredMessages: classificationCounts.other,
    todosCreated
  });
}
