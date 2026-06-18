"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { listCustomersAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * List view for /customers (task #11, TASKS.md F5: "หน้า list ลูกค้า +
 * ค้นหา/ฟิลเตอร์"). listCustomers (packages/core) has no search/filter
 * params — it just returns the whole team's customer list — so, same
 * reasoning as use-customer-names.ts, search text and the channel filter
 * are applied client-side over the cached ["customers"] query. Fine at this
 * scale (one team's customer list).
 *
 * Row links to /customers/[id] and the header button links to
 * /customers/new even though neither route exists until task #12 — same
 * forward-reference pattern jobs-list.tsx used for /jobs/new ahead of
 * task #10.
 */
export function CustomersList() {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<string>("all");

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomersAction(),
  });

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const customer of customersQuery.data ?? []) {
      if (customer.channel) set.add(customer.channel);
    }
    return Array.from(set).sort();
  }, [customersQuery.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (customersQuery.data ?? []).filter((customer) => {
      if (channel !== "all" && customer.channel !== channel) return false;
      if (!term) return true;
      const haystack = [customer.name, customer.phone, customer.email, customer.lineId, customer.channel, customer.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [customersQuery.data, search, channel]);

  const isFiltered = search.trim() !== "" || channel !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl uppercase text-ink">ลูกค้า</h2>
        <Button asChild variant="primary" size="sm">
          <Link href="/customers/new">+ เพิ่มลูกค้า</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ/เบอร์/อีเมล/Line"
          className="h-9 max-w-xs"
        />

        {channelOptions.length > 0 ? (
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="h-9 rounded-md border-2 border-ink bg-background px-2 text-sm"
          >
            <option value="all">ทุกช่องทาง</option>
            {channelOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {customersQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel flex items-center justify-between gap-3 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : customersQuery.isError ? (
        <p className="text-sm text-destructive">โหลดข้อมูลลูกค้าไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="panel flex flex-col gap-2 p-4 hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-ink">{customer.name}</p>
                    {customer.channel ? (
                      <span className="shrink-0 rounded-full border border-ink px-2 py-0.5 text-xs font-medium text-ink">
                        {customer.channel}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {[customer.phone, customer.email, customer.lineId].filter(Boolean).join(" · ") || "ยังไม่มีข้อมูลติดต่อ"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Users}
          title="ยังไม่มีลูกค้า"
          description={isFiltered ? "ไม่พบลูกค้าที่ตรงกับการค้นหานี้" : "เริ่มเพิ่มลูกค้าคนแรกของคุณ"}
          action={
            <Button asChild variant="primary">
              <Link href="/customers/new">+ เพิ่มลูกค้า</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
