import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Shared list/calendar toggle for /jobs and /jobs/calendar (tasks #7/#8). */
export function JobsViewTabs({ active }: { active: "list" | "calendar" }) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant={active === "list" ? "primary" : "outline"}>
        <Link href="/jobs">รายการ</Link>
      </Button>
      <Button asChild size="sm" variant={active === "calendar" ? "primary" : "outline"}>
        <Link href="/jobs/calendar">ปฏิทิน</Link>
      </Button>
    </div>
  );
}
