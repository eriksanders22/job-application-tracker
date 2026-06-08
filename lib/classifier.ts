export type JobApplicationEmailInput = {
  subject: string;
  fromEmail: string;
  fromName?: string;
  snippet: string;
  bodyText: string;
};

export const subjectOnlyPhrases = [
  "application",
  "apply",
  "applied",
  "applying",
  "next steps",
  "next step",
  "assessment",
  "interview",
];

export const strongApplicationPhrases = [
  "thank you for applying",
  "thanks for applying",
  "we received your application",
  "we've received your application",
  "your application has been received",
  "application submitted",
  "application is complete",
  "application was sent",
  "resume has been submitted",
  "confirmation that your resume has been submitted",
  "your application for",
  "regarding your application",
  "status of your application",
  "your application has been reviewed",
  "job application",
  "interview invitation",
  "schedule your interview",
  "complete your assessment",
  "complete the assessment",
  "hirevue",
  "not moving forward",
  "not selected",
  "no longer being considered",
  "offer letter",
  "candidate self-service",
  "candidate portal",
  "recruiting team",
  "talent acquisition"
];

export const exclusionPhrases = [
  "top job matches",
  "recommended jobs",
  "new jobs matching your search",
  "jobs you may be interested in",
  "weekly job alert",
  "daily job alert",
  "job recommendations"
];

function buildFullText(input: JobApplicationEmailInput) {
  return [
    input.subject,
    input.fromEmail,
    input.fromName,
    input.snippet,
    input.bodyText
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function includesAnyPhrase(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function findIncludedPhrases(text: string, phrases: string[]) {
  return phrases.filter((phrase) => text.includes(phrase));
}

export function filterJobApplicationEmail(input: JobApplicationEmailInput) {
  const subjectText = input.subject.toLowerCase();
  const fullText = buildFullText(input);
  const matchedSubjectPhrases = findIncludedPhrases(
    subjectText,
    subjectOnlyPhrases
  );
  const matchedStrongPhrases = findIncludedPhrases(
    fullText,
    strongApplicationPhrases
  );
  const excludedPhrases = findIncludedPhrases(fullText, exclusionPhrases);
  const hasApplicationPhrase =
    matchedSubjectPhrases.length > 0 || matchedStrongPhrases.length > 0;

  if (excludedPhrases.length > 0 && !hasApplicationPhrase) {
    return {
      isJobApplicationEmail: false,
      matchedSubjectPhrases,
      matchedStrongPhrases,
      excludedPhrases,
      filterReason:
        `Skipped because it matched non-application phrase(s): ${excludedPhrases.join(
          ", "
        )}; no subject or strong application phrase matched.`
    };
  }

  if (hasApplicationPhrase) {
    return {
      isJobApplicationEmail: true,
      matchedSubjectPhrases,
      matchedStrongPhrases,
      excludedPhrases,
      filterReason: `Saved because subject phrase(s) matched: ${matchedSubjectPhrases.join(", ") || "none"
        }; strong phrase(s) matched: ${matchedStrongPhrases.join(", ") || "none"
        }.`
    };
  }

  return {
    isJobApplicationEmail: false,
    matchedSubjectPhrases,
    matchedStrongPhrases,
    excludedPhrases,
    filterReason:
      "Skipped because no subject or strong job application phrase matched."
  };
}

export function isJobApplicationEmail(input: JobApplicationEmailInput) {
  return filterJobApplicationEmail(input).isJobApplicationEmail;
}
