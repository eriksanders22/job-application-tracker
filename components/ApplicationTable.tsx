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
  return (
    <section className="table-section">
      <h2>Applications</h2>
      <p className="section-note">
        This simplified view shows Gmail emails that matched basic job
        application phrases. Status is temporary until classification is added
        back deliberately.
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
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
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
                  <span
                    className={`status status-${
                      application.temporaryStatus ?? application.status
                    }`}
                  >
                    {application.temporaryStatus ??
                      statusLabels[application.status]}
                  </span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
