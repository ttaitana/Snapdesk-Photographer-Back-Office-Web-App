"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { organizationApi, useActiveOrganization, useListOrganizations } from "@/lib/auth-client";

/**
 * Lets a user who belongs to more than one team (e.g. they accepted an
 * invite while already having their own personal team — see the comment in
 * packages/auth/src/auth.ts's databaseHooks) pick which one is active.
 * Hidden entirely if they only have one team, since there's nothing to
 * switch between.
 */
export function TeamSwitcher() {
  const router = useRouter();
  const { data: organizations, isPending: listPending } = useListOrganizations();
  const { data: activeOrganization } = useActiveOrganization();
  const [switching, setSwitching] = useState(false);

  if (listPending || !organizations || organizations.length < 2) {
    return null;
  }

  async function handleChange(organizationId: string) {
    if (organizationId === activeOrganization?.id) return;
    setSwitching(true);
    await organizationApi.setActive({ organizationId });
    setSwitching(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <select
      className="h-9 rounded-md border-2 border-ink bg-background px-2 text-sm"
      value={activeOrganization?.id ?? ""}
      disabled={switching}
      onChange={(e) => handleChange(e.target.value)}
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
