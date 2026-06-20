"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Root error boundary (task #6, TASKS.md) — Next requires this to be a
 * Client Component. Catches uncaught render/render-time errors anywhere
 * under the root layout that isn't already handled by a page's own
 * isError branch (most data-fetch errors already show an inline EmptyState
 * — see job-detail.tsx, jobs-list.tsx, etc. — so this is the backstop for
 * genuine bugs, not the everyday "query failed" path).
 *
 * Deliberately NOT app/global-error.tsx: this file renders nested inside
 * app/layout.tsx (which keeps running), so it must NOT render its own
 * <html>/<body> — doing so would duplicate the document shell and drop the
 * ThemeProvider/font-variable context the real layout already provides.
 * global-error.tsx is the one that needs <html>/<body>, for the rarer case
 * where the root layout itself throws.
 *
 * Logged to console only — no analytics/error-reporting service is wired
 * up in this project yet, so swallowing it silently would make these
 * harder to notice during QA.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error in apps/web:", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <EmptyState
          icon={AlertTriangle}
          title="เกิดข้อผิดพลาดบางอย่าง"
          description="ลองอีกครั้ง หากยังพบปัญหาอยู่ กรุณาติดต่อผู้ดูแลระบบ"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="primary" onClick={() => reset()}>
                ลองใหม่
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">กลับสู่หน้าหลัก</Link>
              </Button>
            </div>
          }
        />
      </div>
    </main>
  );
}
