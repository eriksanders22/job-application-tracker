import type {
  ApplicationStatus,
  DashboardApplication
} from "../types/application";

export const statusLabels: Record<ApplicationStatus, string> = {
  needs_action: "Needs Action",
  rejected: "Rejected",
  waiting: "Waiting"
};

export function countApplicationsByStatus(
  applications: DashboardApplication[],
  status: ApplicationStatus
) {
  return applications.filter((application) => application.status === status).length;
}

export function filterApplicationsByStatus(
  applications: DashboardApplication[],
  status: ApplicationStatus
) {
  return applications.filter((application) => application.status === status);
}
