"use server";

// Thin Server Actions for revenue-split assignments — P4 F3 (TASKS.md).
// Lives under app/jobs because every assignment is reached through its job
// (JobAssignment has no teamId of its own — see packages/core/src/job-assignments).

import { headers } from "next/headers";

import {
  listJobAssignments as listJobAssignmentsService,
  getJobRevenueSplit as getJobRevenueSplitService,
  createJobAssignment as createJobAssignmentService,
  updateJobAssignment as updateJobAssignmentService,
  deleteJobAssignment as deleteJobAssignmentService,
} from "@snapdesk/core";
import { toTeamMember } from "@snapdesk/auth";
import type {
  JobAssignment,
  JobAssignmentInput,
  UpdateJobAssignmentInput,
  RevenueSplit,
} from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";
import { auth } from "@/lib/auth";

export async function listJobAssignmentsAction(jobId: string): Promise<JobAssignment[]> {
  const context = await requireActionContext();
  return listJobAssignmentsService(context, jobId);
}

export async function getJobRevenueSplitAction(jobId: string): Promise<RevenueSplit> {
  const context = await requireActionContext();
  return getJobRevenueSplitService(context, jobId);
}

export async function createJobAssignmentAction(
  input: JobAssignmentInput
): Promise<JobAssignment> {
  const context = await requireActionContext();
  return createJobAssignmentService(context, input);
}

export async function updateJobAssignmentAction(
  input: UpdateJobAssignmentInput
): Promise<JobAssignment | null> {
  const context = await requireActionContext();
  return updateJobAssignmentService(context, input);
}

export async function deleteJobAssignmentAction(id: string): Promise<boolean> {
  const context = await requireActionContext();
  return deleteJobAssignmentService(context, id);
}

export type AssignableTeamMember = {
  userId: string;
  name: string | null;
  email: string | null;
};

/**
 * Member picker for the "assign สมาชิก" UI. No @snapdesk/core service
 * exposes this — team-member enumeration goes through Better Auth's
 * organization plugin (same getFullOrganization() call as
 * app/team/members/page.tsx), and @snapdesk/core must never import
 * @snapdesk/auth/Better Auth directly, so this lives at the apps/web layer.
 */
export async function listTeamMembersAction(): Promise<AssignableTeamMember[]> {
  const context = await requireActionContext();

  const org = await auth.api.getFullOrganization({
    query: { organizationId: context.teamId, membersLimit: 100 },
    headers: await headers(),
  });
  if (!org) return [];

  type RawMember = Parameters<typeof toTeamMember>[0] & {
    user?: { name?: string | null; email?: string | null };
  };
  const rawMembers = (org.members ?? []) as RawMember[];

  return rawMembers.map((m) => {
    const mapped = toTeamMember(m);
    return {
      userId: mapped.userId,
      name: m.user?.name ?? null,
      email: m.user?.email ?? null,
    };
  });
}
