import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { JobForm } from "../job-form";

/**
 * /jobs/new — create job page (task #10, TASKS.md: "form สร้าง/แก้คิว +
 * auto-save draft"). Session + team-context checks already happen in
 * app/jobs/layout.tsx.
 */
export default function NewJobPage() {
  return (
    <div className="space-y-4">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        กลับไปที่คิวถ่าย
      </Link>

      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">สร้างคิวถ่ายใหม่</h2>
        <JobForm mode="create" />
      </div>
    </div>
  );
}
