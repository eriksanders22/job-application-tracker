import { decideEmailAction } from "../lib/job-email-sync";

const checks = [
  {
    name: "application anchor creates when no match exists",
    decision: decideEmailAction({
      emailType: "application_anchor",
      isApplicationAnchor: true,
      application: null,
      matchReason: "noMatch"
    }),
    expected: {
      shouldCreateApplication: true,
      shouldAttachEmail: true,
      shouldMarkNeedsReview: false
    }
  },
  {
    name: "process email attaches when matched by thread",
    decision: decideEmailAction({
      emailType: "process_update",
      isApplicationAnchor: false,
      application: { id: "app-1" },
      matchReason: "threadId"
    }),
    expected: {
      shouldCreateApplication: false,
      shouldAttachEmail: true,
      shouldMarkNeedsReview: false
    }
  },
  {
    name: "multiple active company applications need review",
    decision: decideEmailAction({
      emailType: "process_update",
      isApplicationAnchor: false,
      application: null,
      matchReason: "needsReviewMultipleCompanyApplications"
    }),
    expected: {
      shouldCreateApplication: false,
      shouldAttachEmail: false,
      shouldMarkNeedsReview: true
    }
  },
  {
    name: "cancellation does not create without match",
    decision: decideEmailAction({
      emailType: "process_update",
      isApplicationAnchor: false,
      application: null,
      matchReason: "noMatch"
    }),
    expected: {
      shouldCreateApplication: false,
      shouldAttachEmail: false,
      shouldMarkNeedsReview: true
    }
  },
  {
    name: "rejection does not create unless anchor",
    decision: decideEmailAction({
      emailType: "process_update",
      isApplicationAnchor: false,
      application: null,
      matchReason: "noMatch"
    }),
    expected: {
      shouldCreateApplication: false,
      shouldAttachEmail: false,
      shouldMarkNeedsReview: true
    }
  }
];

for (const check of checks) {
  for (const [key, expectedValue] of Object.entries(check.expected)) {
    const actualValue = check.decision[key as keyof typeof check.expected];

    if (actualValue !== expectedValue) {
      throw new Error(
        `${check.name}: ${key} expected ${expectedValue}, got ${actualValue}`
      );
    }
  }
}

console.log("Sync decision checks passed.");
