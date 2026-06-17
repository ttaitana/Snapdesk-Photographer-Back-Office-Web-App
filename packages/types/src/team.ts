import { z } from "zod";
import { cuidSchema } from "./common";
import { teamRoleSchema } from "./enums";

export const teamSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1),
  businessName: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  taxId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});
export type Team = z.infer<typeof teamSchema>;

export const createTeamInputSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อทีม"),
  businessName: z.string().optional(),
  taxId: z.string().optional(),
});
export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;

export const updateTeamInputSchema = createTeamInputSchema.partial().extend({
  teamId: cuidSchema,
  logoUrl: z.string().url().optional(),
});
export type UpdateTeamInput = z.infer<typeof updateTeamInputSchema>;

export const teamMemberSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  userId: cuidSchema,
  role: teamRoleSchema,
  joinedAt: z.coerce.date(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamInviteStatusSchema = z.enum(["pending", "accepted", "rejected", "canceled"]);
export type TeamInviteStatus = z.infer<typeof teamInviteStatusSchema>;

export const teamInviteSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  email: z.string().email(),
  role: teamRoleSchema,
  status: teamInviteStatusSchema,
  expiresAt: z.coerce.date(),
});
export type TeamInvite = z.infer<typeof teamInviteSchema>;

export const inviteMemberInputSchema = z.object({
  teamId: cuidSchema,
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  role: teamRoleSchema.default("member"),
});
export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;

export const acceptInviteInputSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>;

export const updateMemberRoleInputSchema = z.object({
  teamId: cuidSchema,
  memberId: cuidSchema,
  role: teamRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>;
