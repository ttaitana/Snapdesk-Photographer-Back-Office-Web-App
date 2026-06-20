import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// Global 404 (task #6, TASKS.md "error/loading/empty states ครบทุกหน้า") —
// triggered by any unmatched route, or by a page calling notFound() (e.g. a
// dynamic [id] segment for a record that doesn't exist / isn't in the
// caller's team). Styled like the rest of the app rather than Next's
// default blank page, since an unauthenticated visitor can hit this too
// (e.g. a stale/typo'd link) — links to "/" rather than "/dashboard" so it
// never bounces a logged-out visitor into another redirect.
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <EmptyState
          icon={Compass}
          title="ไม่พบหน้านี้"
          description="ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายไปแล้ว"
          action={
            <Button asChild variant="primary">
              <Link href="/">กลับสู่หน้าแรก</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
