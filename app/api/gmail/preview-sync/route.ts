import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { filterJobApplicationEmail } from "../../../../lib/classifier";
import {
  createGmailClient,
  fetchRecentJobMessageSummaries
} from "../../../../lib/gmail";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
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

  if (
    !googleAccount.scope?.includes(
      "https://www.googleapis.com/auth/gmail.readonly"
    )
  ) {
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
  const emails = messages.map((message) => {
    const filterResult = filterJobApplicationEmail({
      subject: message.subject,
      fromEmail: message.fromEmail,
      fromName: message.fromName,
      snippet: message.snippet,
      bodyText: message.bodyText
    });

    return {
      gmailMessageId: message.gmailMessageId,
      subject: message.subject,
      fromEmail: message.fromEmail,
      receivedAt: message.receivedAt.toISOString().slice(0, 10),
      snippet: message.snippet,
      wouldSave: filterResult.isJobApplicationEmail,
      matchedSubjectPhrases: filterResult.matchedSubjectPhrases,
      matchedStrongPhrases: filterResult.matchedStrongPhrases,
      excludedPhrases: filterResult.excludedPhrases,
      filterReason: filterResult.filterReason
    };
  });
  const wouldSave = emails.filter((email) => email.wouldSave).length;

  return NextResponse.json({
    totalFetched: emails.length,
    wouldSave,
    wouldSkip: emails.length - wouldSave,
    emails
  });
}
