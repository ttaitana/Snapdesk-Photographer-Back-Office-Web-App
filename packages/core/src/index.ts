/**
 * @snapdesk/core — domain/service layer.
 *
 * team-context lands in P1; customers/jobs/payments services land in P2
 * (both below) per TASKS.md. Keep this package free of any `apps/*` or
 * Next.js import — see README.md.
 */

export const CORE_PACKAGE_NAME = "@snapdesk/core" as const;

export {
  resolveTeamContext,
  requireTeamContext,
  requireRole,
  TeamContextError,
  type TeamContext,
} from "./team-context";

export {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./customers";

export {
  listJobs,
  getJob,
  createJob,
  updateJob,
  updateJobStatus,
  sendQuotation,
  deleteJob,
} from "./jobs";

export {
  listPayments,
  getPayment,
  createPayment,
  deletePayment,
  getJobFinancialSummary,
  getTeamOutstandingSummary,
} from "./payments";

export {
  listPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
} from "./packages";

export {
  listJobAssignments,
  getJobRevenueSplit,
  createJobAssignment,
  updateJobAssignment,
  deleteJobAssignment,
  calculateRevenueSplit,
  JobAssignmentValidationError,
} from "./job-assignments";

export { getMonthlyIncomeComparison, getFollowUpJobs } from "./dashboard";
