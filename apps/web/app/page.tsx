import { CORE_PACKAGE_NAME } from "@snapdesk/core";
import { jobStatusSchema } from "@snapdesk/types";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder landing page — proves the P0 foundation (monorepo wiring,
// Tailwind tokens, shadcn/ui, fonts, theme provider) is working end to end.
// Real screens (Dashboard, จาก F8 etc.) start at P1+ per TASKS.md.
export default function HomePage() {
  const wiredPackages = [CORE_PACKAGE_NAME, "@snapdesk/types"];
  const statuses = jobStatusSchema.options;

  return (
    <main className="relative min-h-screen bg-bg p-6 md:p-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-heading text-3xl uppercase text-ink md:text-4xl">Snapdesk</h1>
          <ThemeToggle />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>P0 — Foundation OK</CardTitle>
            <CardDescription>
              Monorepo, Tailwind tokens, shadcn/ui, fonts และ theme provider พร้อมใช้งานแล้ว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Workspace packages ที่เชื่อมต่อแล้ว:{" "}
              <span className="font-medium text-primary">{wiredPackages.join(", ")}</span>
            </p>
            <p>
              JobStatus enum (จาก <code>@snapdesk/types</code>):{" "}
              <span className="font-medium">{statuses.join(" → ")}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">ปุ่มหลัก</Button>
              <Button variant="default">ปุ่ม Accent</Button>
              <Button variant="outline">ปุ่ม Outline</Button>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded border-2 border-ink bg-danger px-2 py-1 text-white">ยอดค้าง</span>
              <span className="rounded border-2 border-ink bg-success px-2 py-1 text-white">จ่ายครบ</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ฟีเจอร์จริง (Auth, ทีม, คิวถ่าย, ใบเสนอราคา ฯลฯ) เริ่มจาก P1 เป็นต้นไป — ดู TASKS.md
        </p>
      </div>
    </main>
  );
}
