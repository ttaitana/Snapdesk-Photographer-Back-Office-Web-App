"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listCustomersAction } from "@/app/customers/actions";

/**
 * Shared customer-id → name lookup for /jobs pages (list + calendar, tasks
 * #7/#8). `listJobs` (packages/core) doesn't join the Customer relation —
 * see jobs.test.ts's exact `where` assertions, which we don't want to
 * disturb — so every job view that needs a customer name fetches the
 * customer list separately via listCustomersAction and joins client-side.
 * Fine at this scale (one team's customer list, cached by TanStack Query).
 */
export function useCustomerNames() {
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomersAction(),
  });

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.data ?? []) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.data]);

  return { customerNameById, isLoading: customersQuery.isLoading };
}
