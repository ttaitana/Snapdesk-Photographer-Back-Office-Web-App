/**
 * @snapdesk/core — domain/service layer.
 *
 * team-context lands in P1 (this file's export below); customers/jobs/
 * payments services land starting P2 per TASKS.md. Keep this package free
 * of any `apps/*` or Next.js import — see README.md.
 */

export const CORE_PACKAGE_NAME = "@snapdesk/core" as const;

export {
  resolveTeamContext,
  requireTeamContext,
  requireRole,
  TeamContextError,
  type TeamContext,
} from "./team-context";
