import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import {
  createGmailClient,
  fetchGmailMessageSummaries
} from "../../../../lib/gmail";
import { syncJobEmailMessages } from "../../../../lib/job-email-sync";
import { prisma } from "../../../../lib/prisma";

const testLabelQuery = "label:job-tracker-test";
const testLabelMaxResults = 20;

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

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
  const messages = await fetchGmailMessageSummaries(gmail, {
    query: testLabelQuery,
    maxResults: testLabelMaxResults
  });
  const syncSummary = await syncJobEmailMessages({
    userId: user.id,
    messages
  });

  return NextResponse.json({
    query: testLabelQuery,
    maxResults: testLabelMaxResults,
    ...syncSummary
  });
}
