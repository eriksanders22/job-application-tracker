"use client";

import { useState } from "react";

type PreviewEmail = {
  gmailMessageId: string;
  subject: string;
  fromEmail: string;
  receivedAt: string;
  snippet: string;
  wouldSave: boolean;
  matchedSubjectPhrases: string[];
  matchedStrongPhrases: string[];
  excludedPhrases: string[];
  filterReason: string;
};

type PreviewResult = {
  totalFetched: number;
  wouldSave: number;
  wouldSkip: number;
  emails: PreviewEmail[];
};

type DebugFilter = "all" | "yes" | "no";

export function PreviewSyncPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugFilter, setDebugFilter] = useState<DebugFilter>("all");

  const visibleEmails =
    result?.emails.filter((email) => {
      if (debugFilter === "yes") {
        return email.wouldSave;
      }

      if (debugFilter === "no") {
        return !email.wouldSave;
      }

      return true;
    }) ?? [];

  async function previewRecentEmails() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gmail/preview-sync");
      const previewResult = await response.json();

      if (!response.ok) {
        throw new Error(previewResult.error ?? "Preview failed.");
      }

      setResult(previewResult as PreviewResult);
    } catch (previewError) {
      setError(
        previewError instanceof Error ? previewError.message : "Preview failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="preview-panel" aria-label="Gmail filter preview">
      <div className="preview-actions">
        <button
          className="auth-button secondary"
          disabled={isLoading}
          onClick={previewRecentEmails}
          type="button"
        >
          {isLoading ? "Previewing..." : "Preview Recent Emails"}
        </button>
        <p>
          Preview only. This checks recent Gmail messages without saving them.
        </p>
      </div>

      {error ? <p className="sync-error">{error}</p> : null}

      {result ? (
        <div className="preview-results">
          <p className="section-note">
            Fetched {result.totalFetched}. Would save {result.wouldSave}. Would
            skip {result.wouldSkip}.
          </p>
          <div className="debug-filters" aria-label="Preview result filter">
            <button
              className={debugFilter === "all" ? "active" : ""}
              onClick={() => setDebugFilter("all")}
              type="button"
            >
              All ({result.totalFetched})
            </button>
            <button
              className={debugFilter === "yes" ? "active" : ""}
              onClick={() => setDebugFilter("yes")}
              type="button"
            >
              Yes ({result.wouldSave})
            </button>
            <button
              className={debugFilter === "no" ? "active" : ""}
              onClick={() => setDebugFilter("no")}
              type="button"
            >
              No ({result.wouldSkip})
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Sender</th>
                  <th>Received</th>
                  <th>Would Save</th>
                  <th>Matched Phrases</th>
                  <th>Filter Reason</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmails.map((email) => (
                  <tr key={email.gmailMessageId}>
                    <td>
                      <strong>{email.subject || "No subject"}</strong>
                      <span className="debug-line">{email.snippet}</span>
                    </td>
                    <td>{email.fromEmail}</td>
                    <td>{email.receivedAt}</td>
                    <td>{email.wouldSave ? "Yes" : "No"}</td>
                    <td>
                      {email.matchedSubjectPhrases.length ? (
                        <span className="debug-line">
                          Subject: {email.matchedSubjectPhrases.join(", ")}
                        </span>
                      ) : null}
                      {email.matchedStrongPhrases.length ? (
                        <span className="debug-line">
                          Strong: {email.matchedStrongPhrases.join(", ")}
                        </span>
                      ) : null}
                      {!email.matchedSubjectPhrases.length &&
                      !email.matchedStrongPhrases.length
                        ? "None"
                        : null}
                      {email.excludedPhrases.length ? (
                        <span className="debug-line">
                          Excluded: {email.excludedPhrases.join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td>{email.filterReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
