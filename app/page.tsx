import { headers } from "next/headers";
import { SignInButton } from "../components/AuthButtons";
import { ApplicationTable } from "../components/ApplicationTable";
import { SessionSummary } from "../components/SessionSummary";
import { StatusSummary } from "../components/StatusSummary";
import { SyncGmailButton } from "../components/SyncGmailButton";
import { PreviewSyncPanel } from "../components/PreviewSyncPanel";
import { auth } from "../lib/auth";
import {
  countApplicationsByStatus,
  statusLabels
} from "../lib/application-utils";
import type { DashboardApplication } from "../types/application";

async function getApplications(): Promise<DashboardApplication[]> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const response = await fetch(`${protocol}://${host}/api/applications`, {
    cache: "no-store",
    headers: {
      cookie: requestHeaders.get("cookie") ?? ""
    }
  });

  if (!response.ok) {
    throw new Error("Failed to load applications");
  }

  return response.json();
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="page">
        <section className="intro">
          <h1>Job Application Email Tracker</h1>
          <p>
            Sign in with Google to view your job application dashboard. Gmail
            access is not connected yet.
          </p>
        </section>

        <SignInButton />
      </main>
    );
  }

  const applications = await getApplications();
  const summaryCards = [
    {
      label: statusLabels.needs_action,
      count: countApplicationsByStatus(applications, "needs_action")
    },
    {
      label: statusLabels.rejected,
      count: countApplicationsByStatus(applications, "rejected")
    },
    {
      label: statusLabels.waiting,
      count: countApplicationsByStatus(applications, "waiting")
    }
  ];

  return (
    <main className="page">
      <section className="intro">
        <h1>Job Application Email Tracker</h1>
        <p>
          A local MVP for organizing job application emails by status, showing
          what needs follow-up, what is still pending, and what has been rejected.
        </p>
      </section>

      <SessionSummary session={session} />
      <SyncGmailButton />
      <PreviewSyncPanel />
      <StatusSummary cards={summaryCards} />
      <ApplicationTable
        applications={applications}
        statusLabels={statusLabels}
      />
    </main>
  );
}
