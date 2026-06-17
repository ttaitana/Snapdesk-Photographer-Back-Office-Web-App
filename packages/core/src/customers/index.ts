// Customers service — P2 Core Data Layer (TASKS.md).
//
// Every function takes an already-resolved `TeamContext` (see
// ../team-context) and scopes every Prisma query by `context.teamId`.
// Callers (Server Actions in apps/web) are responsible for resolving the
// context first via requireTeamContext — this layer never trusts a
// client-supplied teamId.

import { prisma } from "@snapdesk/db";
import {
  customerSchema,
  customerInputSchema,
  updateCustomerInputSchema,
  type Customer,
  type CustomerInput,
  type UpdateCustomerInput,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";

export async function listCustomers(context: TeamContext): Promise<Customer[]> {
  const rows = await prisma.customer.findMany({
    where: { teamId: context.teamId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => customerSchema.parse(row));
}

export async function getCustomer(
  context: TeamContext,
  id: string
): Promise<Customer | null> {
  const row = await prisma.customer.findFirst({
    where: { id, teamId: context.teamId },
  });

  return row ? customerSchema.parse(row) : null;
}

export async function createCustomer(
  context: TeamContext,
  input: CustomerInput
): Promise<Customer> {
  const parsed = customerInputSchema.parse({ ...input, teamId: context.teamId });

  const row = await prisma.customer.create({
    data: {
      teamId: context.teamId,
      name: parsed.name,
      phone: parsed.phone || null,
      email: parsed.email || null,
      lineId: parsed.lineId || null,
      channel: parsed.channel || null,
      note: parsed.note || null,
    },
  });

  return customerSchema.parse(row);
}

export async function updateCustomer(
  context: TeamContext,
  input: UpdateCustomerInput
): Promise<Customer | null> {
  const parsed = updateCustomerInputSchema.parse({ ...input, teamId: context.teamId });

  // updateMany + a team-scoped where, rather than update-by-id, so a
  // customer belonging to another team can never be modified even if its id
  // leaked into a request — see TeamContext security note in schema.prisma.
  const result = await prisma.customer.updateMany({
    where: { id: parsed.id, teamId: context.teamId },
    data: {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.phone !== undefined && { phone: parsed.phone || null }),
      ...(parsed.email !== undefined && { email: parsed.email || null }),
      ...(parsed.lineId !== undefined && { lineId: parsed.lineId || null }),
      ...(parsed.channel !== undefined && { channel: parsed.channel || null }),
      ...(parsed.note !== undefined && { note: parsed.note || null }),
    },
  });

  if (result.count === 0) return null;
  return getCustomer(context, parsed.id);
}

export async function deleteCustomer(context: TeamContext, id: string): Promise<boolean> {
  const result = await prisma.customer.deleteMany({
    where: { id, teamId: context.teamId },
  });

  return result.count > 0;
}
