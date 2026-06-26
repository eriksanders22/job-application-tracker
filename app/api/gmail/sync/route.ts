import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import {
  createGmailClient,
  fetchRecentJobMessageSummaries
} from "../../../../lib/gmail";
import { syncJobEmailMessages } from "../../../../lib/job-email-sync";
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
  const syncSummary = await syncJobEmailMessages({
    userId: user.id,
    messages
  });

  console.info("Gmail sync summary", {
    totalFetched: syncSummary.totalFetched,
    savedJobApplicationEmails: syncSummary.savedJobEmails,
    alreadySavedEmails: syncSummary.skippedExistingEmails,
    skippedEmails: syncSummary.skippedNonJobEmails,
    createdFromApplicationAnchor: syncSummary.createdFromApplicationAnchor,
    attachedToExistingApplication: syncSummary.attachedToExistingApplication,
    needsReviewUnmatchedProcessEmail:
      syncSummary.needsReviewUnmatchedProcessEmail,
    matchedBySingleActiveCompanyScheduling:
      syncSummary.matchedBySingleActiveCompanyScheduling,
    needsReviewMultipleCompanyApplications:
      syncSummary.needsReviewMultipleCompanyApplications
  });

  return NextResponse.json({
    totalFetched: syncSummary.totalFetched,
    savedJobApplicationEmails: syncSummary.savedJobEmails,
    alreadySavedEmails: syncSummary.skippedExistingEmails,
    skippedEmails: syncSummary.skippedNonJobEmails,
    matchedByThreadId: syncSummary.matchedByThreadId,
    matchedByExistingJobEmailThreadId:
      syncSummary.matchedByExistingJobEmailThreadId,
    matchedByExactCompanyRole: syncSummary.matchedByExactCompanyRole,
    matchedByCompanyRole: syncSummary.matchedByCompanyRole,
    matchedByCompanyRoleSimilarity: syncSummary.matchedByCompanyRoleSimilarity,
    matchedBySingleActiveCompanyScheduling:
      syncSummary.matchedBySingleActiveCompanyScheduling,
    needsReviewMultipleCompanyApplications:
      syncSummary.needsReviewMultipleCompanyApplications,
    createdFromApplicationAnchor: syncSummary.createdFromApplicationAnchor,
    attachedToExistingApplication: syncSummary.attachedToExistingApplication,
    needsReviewUnmatchedProcessEmail:
      syncSummary.needsReviewUnmatchedProcessEmail,
    skippedNonAnchorWithoutMatch: syncSummary.skippedNonAnchorWithoutMatch,
    createdApplications: syncSummary.createdApplications,
    updatedApplications: syncSummary.updatedApplications,
    savedJobEmails: syncSummary.savedJobEmails,
    updatedJobEmails: syncSummary.updatedJobEmails
  });
}
