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
        Applications are loaded from PostgreSQL through the local applications
        API route.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Email Date</th>
              <th>Email Snippet</th>
              <th>Todo</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={`${application.company}-${application.role}`}>
                <td>{application.company}</td>
                <td>{application.role}</td>
                <td>
                  <span className={`status status-${application.status}`}>
                    {statusLabels[application.status]}
                  </span>
                </td>
                <td>{application.lastEmailDate}</td>
                <td>{application.emailSnippet}</td>
                <td>{application.todo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
