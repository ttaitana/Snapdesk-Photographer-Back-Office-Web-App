// Packages service — P4 ใบเสนอราคา (F2): reusable quotation packages a team
// can pick from when building a Job's quotation.
//
// Same teamId-scoping convention as customers/jobs (see ../customers):
// every query filters by context.teamId directly, updateMany/deleteMany
// instead of bare update/delete.

import { prisma } from "@snapdesk/db";
import {
  packageSchema,
  packageInputSchema,
  updatePackageInputSchema,
  type Package,
  type PackageInput,
  type UpdatePackageInput,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { decimalToNumber } from "../lib/decimal";

function toPackage(row: {
  id: string;
  teamId: string;
  name: string;
  price: { toNumber(): number };
  description: string | null;
  items: unknown;
  createdAt: Date;
}): Package {
  return packageSchema.parse({
    ...row,
    price: decimalToNumber(row.price),
    items: row.items,
  });
}

export async function listPackages(context: TeamContext): Promise<Package[]> {
  const rows = await prisma.package.findMany({
    where: { teamId: context.teamId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toPackage);
}

export async function getPackage(
  context: TeamContext,
  id: string
): Promise<Package | null> {
  const row = await prisma.package.findFirst({
    where: { id, teamId: context.teamId },
  });

  return row ? toPackage(row) : null;
}

export async function createPackage(
  context: TeamContext,
  input: PackageInput
): Promise<Package> {
  const parsed = packageInputSchema.parse({ ...input, teamId: context.teamId });

  const row = await prisma.package.create({
    data: {
      teamId: context.teamId,
      name: parsed.name,
      price: parsed.price,
      description: parsed.description || null,
      items: parsed.items ?? undefined,
    },
  });

  return toPackage(row);
}

export async function updatePackage(
  context: TeamContext,
  input: UpdatePackageInput
): Promise<Package | null> {
  const parsed = updatePackageInputSchema.parse({ ...input, teamId: context.teamId });

  const result = await prisma.package.updateMany({
    where: { id: parsed.id, teamId: context.teamId },
    data: {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.price !== undefined && { price: parsed.price }),
      ...(parsed.description !== undefined && { description: parsed.description || null }),
      ...(parsed.items !== undefined && { items: parsed.items }),
    },
  });

  if (result.count === 0) return null;
  return getPackage(context, parsed.id);
}

export async function deletePackage(context: TeamContext, id: string): Promise<boolean> {
  const result = await prisma.package.deleteMany({
    where: { id, teamId: context.teamId },
  });

  return result.count > 0;
}
