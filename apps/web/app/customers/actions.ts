"use server";

// Thin Server Actions for customers — P2 Core Data Layer (TASKS.md).
// Each action resolves the caller's TeamContext, then delegates straight to
// @snapdesk/core; no Prisma import here and no business logic. P3 ("F5
// CRM") is where the actual list/search/form pages that call these land.

import {
  listCustomers as listCustomersService,
  getCustomer as getCustomerService,
  createCustomer as createCustomerService,
  updateCustomer as updateCustomerService,
  deleteCustomer as deleteCustomerService,
} from "@snapdesk/core";
import type { Customer, CustomerInput, UpdateCustomerInput } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

export async function listCustomersAction(): Promise<Customer[]> {
  const context = await requireActionContext();
  return listCustomersService(context);
}

export async function getCustomerAction(id: string): Promise<Customer | null> {
  const context = await requireActionContext();
  return getCustomerService(context, id);
}

export async function createCustomerAction(input: CustomerInput): Promise<Customer> {
  const context = await requireActionContext();
  return createCustomerService(context, input);
}

export async function updateCustomerAction(
  input: UpdateCustomerInput,
): Promise<Customer | null> {
  const context = await requireActionContext();
  return updateCustomerService(context, input);
}

export async function deleteCustomerAction(id: string): Promise<boolean> {
  const context = await requireActionContext();
  return deleteCustomerService(context, id);
}
