"use server";

// Thin Server Actions for quotation packages — P4 F2 (TASKS.md).
// Same pattern as app/customers/actions.ts.

import {
  listPackages as listPackagesService,
  getPackage as getPackageService,
  createPackage as createPackageService,
  updatePackage as updatePackageService,
  deletePackage as deletePackageService,
} from "@snapdesk/core";
import type { Package, PackageInput, UpdatePackageInput } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

export async function listPackagesAction(): Promise<Package[]> {
  const context = await requireActionContext();
  return listPackagesService(context);
}

export async function getPackageAction(id: string): Promise<Package | null> {
  const context = await requireActionContext();
  return getPackageService(context, id);
}

export async function createPackageAction(input: PackageInput): Promise<Package> {
  const context = await requireActionContext();
  return createPackageService(context, input);
}

export async function updatePackageAction(input: UpdatePackageInput): Promise<Package | null> {
  const context = await requireActionContext();
  return updatePackageService(context, input);
}

export async function deletePackageAction(id: string): Promise<boolean> {
  const context = await requireActionContext();
  return deletePackageService(context, id);
}
