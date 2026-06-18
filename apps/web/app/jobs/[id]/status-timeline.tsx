"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";

import type { Job, JobStatus } from "@snapdesk/types";
import { updateJobStatusAction } from "../actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER } from "@/lib/job-status";

// Active workflow steps shown as a stepper. CANCELLED is a separate terminal
// branch (any step can be cancelled), so it's excluded from the row itself
// and exposed as its own "ยกเลิกงาน" button instead — putting it inline in
// the stepper would make an 8-step row read as "after COMPLETED comes
// CANCELLED", which isn't the workflow.
const STEPS: JobStatus[] = JOB_STATUS_ORDER.filter((s) => s !== "CANCELLED");

/**
 * P4 F3 — "timeline สถานะงาน (เปลี่ยน JobStatus)". Clicking any step sets the
 * job to that status directly (not strictly forward-only) since photographers
 * sometimes need to back out a step (e.g. client reschedules after CONFIRMED).
 */
export function StatusTimeline({ job }: { job: Job }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: JobStatus) => updateJobStatusAction({ teamId: job.teamId, jobId: job.id, status }),
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(["job", job.id], updated);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const currentIndex = STEPS.indexOf(job.status);
  const isCancelled = job.status === "CANCELLED";

  return (
    <div className="panel space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg uppercase text-ink">สถานะงาน</h3>
        {!isCancelled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={statusMutation.isPending}
            onClick={() => {
              if (window.confirm("ยืนยันยกเลิกงานนี้?")) statusMutation.mutate("CANCELLED");
            }}
          >
            <X className="mr-1 h-4 w-4" />
            ยกเลิกงาน
          </Button>
        ) : null}
      </div>

      {isCancelled ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full border border-destructive px-3 py-1 text-xs font-medium text-destructive">
            ยกเลิกแล้ว
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate("INQUIRY")}
          >
            กู้คืนงาน (เริ่มใหม่)
          </Button>
        </div>
      ) : (
        <ol className="flex flex-wrap items-center gap-1 text-xs sm:gap-2">
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <li key={step} className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  disabled={statusMutation.isPending || isCurrent}
                  onClick={() => statusMutation.mutate(step)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-medium transition-colors",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isDone && !isCurrent && "border-ink/40 bg-surface text-muted-foreground hover:border-ink",
                    !isDone && !isCurrent && "border-ink/20 bg-surface text-muted-foreground hover:border-ink",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : null}
                  {JOB_STATUS_LABEL[step]}
                </button>
                {index < STEPS.length - 1 ? <span className="text-ink/30">→</span> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
