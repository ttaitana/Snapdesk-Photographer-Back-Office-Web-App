import Link from "next/link";
import { Calendar, FileText, QrCode, Wallet } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Calendar,
    title: "คิวงาน",
    description: "ดูคิวถ่ายวันนี้/สัปดาห์นี้ อัปเดตสถานะงานได้ในไม่กี่แตะ",
  },
  {
    icon: FileText,
    title: "ใบเสนอราคา",
    description: "สร้างใบเสนอราคา ส่งให้ลูกค้า แล้วติดตามการตอบรับ",
  },
  {
    icon: Wallet,
    title: "ติดตามเงิน",
    description: "บันทึกมัดจำ/ยอดคงเหลือ คำนวณภาษีหัก ณ ที่จ่ายอัตโนมัติ",
  },
  {
    icon: QrCode,
    title: "ส่งงานด้วย QR",
    description: "สร้าง QR ให้ลูกค้าสแกนรับไฟล์งานจริงได้ทันที",
  },
];

// Public landing page (P10 polish, TASKS.md) — replaces the P0 "Foundation
// OK" debug screen that used to sit at this route. "/" is in middleware's
// PUBLIC_PATHS, so this is genuinely what an unauthenticated visitor sees
// first; it stayed as internal scaffolding far longer than the rest of the
// app, which is why it's last to get the real design pass. Copy is pulled
// straight from SPEC.md §1 (overview + user groups) — no new claims invented
// here. Illustration: public/illustrations/desk-hero.svg (hand-drawn, task
// #5 — see that file's header comment).
export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-bg p-6 md:p-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl space-y-12">
        <header className="flex items-center justify-between">
          <span className="font-heading text-2xl uppercase text-ink md:text-3xl">Snapdesk</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="space-y-5">
            <h1 className="font-heading text-3xl uppercase leading-tight text-ink md:text-4xl">
              ผู้ช่วยหลังบ้าน
              <br />
              สำหรับช่างภาพ
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              จัดคิวงาน ทำใบเสนอราคา ติดตามมัดจำ/ยอดคงเหลือ ส่งมอบงานด้วย QR
              และสรุปรายรับเพื่อเตรียมภาษี — ทุกอย่างอยู่ที่เดียว ใช้งานลื่นบนมือถือระหว่างออกกอง
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/register">เริ่มใช้งานฟรี</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              สำหรับช่างภาพฟรีแลนซ์และสตูดิโอขนาดเล็ก — ทำงานร่วมกันเป็นทีมได้
            </p>
          </div>

          <div className="panel overflow-hidden p-0">
            {/* Plain <img>, not next/image — next/image's default loader
                blocks local SVGs unless images.dangerouslyAllowSVG is set in
                next.config.mjs, which isn't worth turning on for one trusted,
                hand-drawn, hard-coded asset (task #5, TASKS.md). */}
            <img
              src="/illustrations/desk-hero.svg"
              alt="โต๊ะทำงานช่างภาพ มีกล้อง คลิปบอร์ดเช็คลิสต์งาน คิวอาร์โค้ดสำหรับส่งงาน และเหรียญแทนรายรับ"
              width={480}
              height={360}
              className="h-auto w-full"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-accent text-accent-foreground">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.description}</CardContent>
            </Card>
          ))}
        </section>

        <footer className="border-t border-ink/10 pt-6 text-center text-xs text-muted-foreground">
          Snapdesk — ผู้ช่วยจัดการงานหลังบ้านสำหรับช่างภาพ
        </footer>
      </div>
    </main>
  );
}
