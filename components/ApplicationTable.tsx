"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  ApplicationStatus,
  DashboardApplication
} from "../types/application";

type ApplicationTableProps = {
  applications: DashboardApplication[];
  statusLabels: Record<ApplicationStatus, string>;
};

export function ApplicationTable({
  applications,
  statusLabels
}: ApplicationTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(applications);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  useEffect(() => {
    setRows(applications);
  }, [applications]);

  async function classifyApplication(applicationId: string) {
    setClassifyingId(applicationId);
    setErrorById((currentErrors) => ({
      ...currentErrors,
      [applicationId]: ""
    }));

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/classify`,
        {
          method: "POST"
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Classification failed.");
      }

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === applicationId ? { ...row, ...result } : row
        )
      );
      router.refresh();
    } catch (classifyError) {
      setErrorById((currentErrors) => ({
        ...currentErrors,
        [applicationId]:
          classifyError instanceof Error
            ? classifyError.message
            : "Classification failed."
      }));
    } finally {
      setClassifyingId(null);
    }
  }

  return (
    <section className="table-section">
      <h2>Applications</h2>
      <p className="section-note">
        This simplified view shows Gmail emails that matched basic job
        application phrases. Use Classify on saved unclassified rows to ask
        Gemini for a status.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Sender</th>
              <th>Received</th>
              <th>Preview</th>
              <th>Status</th>
              <th>Filter Debug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((application) => (
              <tr key={application.id}>
                <td>
                  <strong>{application.subject ?? application.role}</strong>
                </td>
                <td>{application.sender}</td>
                <td>{application.lastEmailDate}</td>
                <td>
                  {application.emailSnippet ||
                    application.bodyPreview ||
                    "No preview available."}
                </td>
                <td>
                  <span className={`status status-${application.status}`}>
                    {statusLabels[application.status]}
                  </span>
                  {application.classificationReason ? (
                    <span className="debug-line">
                      AI: {application.classificationReason}
                    </span>
                  ) : null}
                  {application.actionItem ? (
                    <span className="debug-line">
                      Action: {application.actionItem}
                    </span>
                  ) : null}
                  {application.dueDate ? (
                    <span className="debug-line">
                      Due: {application.dueDate.slice(0, 10)}
                    </span>
                  ) : null}
                </td>
                <td>
                  {application.matchedPhrases ? (
                    <span className="debug-line">
                      Matched: {application.matchedPhrases}
                    </span>
                  ) : null}
                  {application.filterReason ? (
                    <span className="debug-line">
                      Reason: {application.filterReason}
                    </span>
                  ) : null}
                </td>
                <td>
                  {application.status === "unclassified" ? (
                    <button
                      className="classify-button"
                      disabled={classifyingId === application.id}
                      onClick={() => classifyApplication(application.id)}
                      type="button"
                    >
                      {classifyingId === application.id
                        ? "Classifying..."
                        : "Classify"}
                    </button>
                  ) : (
                    <span className="debug-line">
                      {application.classifiedAt ? "Classified" : ""}
                    </span>
                  )}
                  {errorById[application.id] ? (
                    <span className="debug-line sync-error">
                      {errorById[application.id]}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
