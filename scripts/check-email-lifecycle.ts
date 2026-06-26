import {
  isDeterministicApplicationAnchor,
  isSchedulingOrProcessEmail
} from "../lib/job-email-sync";
import type { GmailMessageSummary } from "../lib/gmail";

function message(overrides: Partial<GmailMessageSummary>): GmailMessageSummary {
  return {
    gmailMessageId: "message-id",
    threadId: "thread-id",
    fromEmail: "recruiter@example.com",
    fromName: "Recruiter",
    subject: "",
    snippet: "",
    bodyText: "",
    bodyPreview: "",
    receivedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

const checks = [
  {
    name: "application confirmation anchor",
    actual: isDeterministicApplicationAnchor(
      message({
        subject: "Thank you for applying",
        bodyText: "We received your application for Software Engineer."
      })
    ),
    expected: true
  },
  {
    name: "interview scheduling is process not anchor",
    actual:
      isSchedulingOrProcessEmail(
        message({ subject: "Availability for Virtual Interview" })
      ) &&
      !isDeterministicApplicationAnchor(
        message({ subject: "Availability for Virtual Interview" })
      ),
    expected: true
  },
  {
    name: "cancellation is process not anchor",
    actual:
      isSchedulingOrProcessEmail(
        message({ subject: "Canceled: HR Video Interview" })
      ) &&
      !isDeterministicApplicationAnchor(
        message({ subject: "Canceled: HR Video Interview" })
      ),
    expected: true
  },
  {
    name: "rejection is not an anchor by itself",
    actual: isDeterministicApplicationAnchor(
      message({ subject: "Update on your application", bodyText: "Unfortunately, we are not moving forward." })
    ),
    expected: false
  }
];

for (const check of checks) {
  if (check.actual !== check.expected) {
    throw new Error(
      `${check.name}: expected ${check.expected}, got ${check.actual}`
    );
  }
}

console.log("Email lifecycle checks passed.");
