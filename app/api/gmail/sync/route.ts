import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { filterJobApplicationEmail } from "../../../../lib/classifier";
import {
  createGmailClient,
  fetchRecentJobMessageSummaries
} from "../../../../lib/gmail";
import { prisma } from "../../../../lib/prisma";

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
  let savedJobApplicationEmails = 0;
  let skippedEmails = 0;

  for (const message of messages) {
    const filterResult = filterJobApplicationEmail({
      subject: message.subject,
      fromEmail: message.fromEmail,
      fromName: message.fromName,
      snippet: message.snippet,
      bodyText: message.bodyText
    });

    console.info("Gmail filter result", {
      subject: message.subject,
      saved: filterResult.isJobApplicationEmail,
      matchedSubjectPhrases: filterResult.matchedSubjectPhrases,
      matchedStrongPhrases: filterResult.matchedStrongPhrases,
      excludedPhrases: filterResult.excludedPhrases
    });

    if (!filterResult.isJobApplicationEmail) {
      skippedEmails += 1;
      continue;
    }

    const application = await prisma.jobApplication.upsert({
      where: { id: `gmail-${message.gmailMessageId}` },
      update: {
        role: message.subject || "Unknown Role",
        status: "unclassified",
        lastEmailDate: message.receivedAt,
        confidenceScore: 0
      },
      create: {
        id: `gmail-${message.gmailMessageId}`,
        userId: user.id,
        company: "Unknown Company",
        role: message.subject || "Unknown Role",
        status: "unclassified",
        lastEmailDate: message.receivedAt,
        confidenceScore: 0
      }
    });

    await prisma.jobEmail.upsert({
      where: { gmailMessageId: message.gmailMessageId },
      update: {
        applicationId: application.id,
        fromEmail: message.fromEmail,
        fromName: message.fromName,
        subject: message.subject,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
        classification: "unclassified",
        classificationSource: "simple_phrase_filter",
        classificationReason: filterResult.filterReason,
        matchedPhrase:
          filterResult.matchedSubjectPhrases[0] ??
          filterResult.matchedStrongPhrases[0] ??
          null,
        matchedJobRules: [
          ...filterResult.matchedSubjectPhrases.map(
            (phrase) => `subject: ${phrase}`
          ),
          ...filterResult.matchedStrongPhrases.map(
            (phrase) => `strong: ${phrase}`
          )
        ].join(", "),
        matchedStatusRule: null,
        jobRelatedScore: null,
        confidenceScore: null
      },
      create: {
        userId: user.id,
        applicationId: application.id,
        gmailMessageId: message.gmailMessageId,
        threadId: message.threadId,
        fromEmail: message.fromEmail,
        fromName: message.fromName,
        subject: message.subject,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
        classification: "unclassified",
        classificationSource: "simple_phrase_filter",
        classificationReason: filterResult.filterReason,
        matchedPhrase:
          filterResult.matchedSubjectPhrases[0] ??
          filterResult.matchedStrongPhrases[0] ??
          null,
        matchedJobRules: [
          ...filterResult.matchedSubjectPhrases.map(
            (phrase) => `subject: ${phrase}`
          ),
          ...filterResult.matchedStrongPhrases.map(
            (phrase) => `strong: ${phrase}`
          )
        ].join(", "),
        matchedStatusRule: null,
        jobRelatedScore: null,
        confidenceScore: null
      }
    });

    savedJobApplicationEmails += 1;
  }

  console.info("Gmail sync summary", {
    totalFetched: messages.length,
    savedJobApplicationEmails,
    skippedEmails
  });

  return NextResponse.json({
    totalFetched: messages.length,
    savedJobApplicationEmails,
    skippedEmails
  });
}
