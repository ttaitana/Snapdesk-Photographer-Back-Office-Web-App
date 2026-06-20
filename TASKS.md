# ✅ Snapdesk — Task Checklist

> แตกงานจาก `SPEC.md` เป็น task ย่อยตาม phase
> ใช้เป็น backlog ได้เลย — แต่ละ `[ ]` คือ 1 task/ticket
> Label phase: `P0`–`P10` ตามลำดับ build, integration ทำท้ายเพราะต้องตั้ง OAuth

---

## P0 — Setup Monorepo & Foundation

- [x] ตั้ง monorepo ด้วย pnpm workspaces + Turborepo (`turbo.json`, `pnpm-workspace.yaml`)
- [x] สร้าง `apps/web` (Next.js 14 App Router + TypeScript)
- [x] สร้าง `packages/db` — Prisma + connect PostgreSQL
- [x] สร้าง `packages/core`, `packages/types` (โครงเปล่า + tsconfig path)
- [x] ตั้ง dependency rule (lint/eslint boundaries): `core` ห้าม import จาก `apps/*`
- [x] ตั้ง Tailwind CSS + CSS variables (color tokens light/dark จาก spec)
- [x] ทำ theme provider + toggle light/dark/system + จำค่าไว้
- [x] ติดตั้ง shadcn/ui + ตั้ง base components
- [x] ตั้งฟอนต์ (หัวข้อ industrial + IBM Plex Sans Thai)
- [x] ทำ `packages/types` validation ด้วย zod (shared schemas)
- [x] สร้าง `.env.example` + `lib/env.ts` validate ตอน startup
- [ ] ตั้ง CI พื้นฐาน (lint + typecheck + build ผ่าน Turborepo) — ยังไม่ได้ตั้ง CI pipeline จริง

## P1 — Auth & Teams (Feature 0)

**Auth**
- [x] ตั้ง Auth.js (NextAuth) + Auth.js standard tables (Account/Session/VerificationToken) ใน Prisma — ใช้ Better Auth แทน NextAuth
- [x] Credentials provider (email + password) — hash ด้วย bcrypt/argon2
- [x] Google OAuth provider (สร้าง account อัตโนมัติครั้งแรก)
- [ ] (optional) Microsoft OAuth provider
- [x] หน้า login / register / logout
- [x] middleware ป้องกัน route ที่ต้อง login

**Teams**
- [x] Prisma models: `Team`, `TeamMember` (role OWNER/ADMIN/MEMBER), `TeamInvite`
- [x] service: สร้างทีม, แก้ข้อมูลทีม (ชื่อ/โลโก้/เลขผู้เสียภาษี)
- [x] เชิญสมาชิกทางอีเมล (gen token + หมดอายุ) + หน้า `invite/[token]` รับเชิญ
- [x] จัดการสมาชิก: เปลี่ยน role, ลบสมาชิก (เฉพาะ OWNER/ADMIN)
- [x] รองรับ 1 user หลายทีม (many-to-many ผ่าน TeamMember)

**Team context & security**
- [x] `packages/core` team-context: resolve active team + เช็ค membership
- [x] บันทึก `User.activeTeamId` + team switcher UI (header desktop / เมนู mobile)
- [x] **บังคับทุก service/query scope ด้วย `teamId`** + authorize ฝั่ง server ทุก endpoint
- [x] เขียน test กันข้อมูลรั่วข้ามทีม

## P2 — Core Data Layer

- [x] Prisma models: `Customer`, `Job` (+ enum `JobStatus`), `Payment` (+ WHT fields)
- [x] service layer ใน `@snapdesk/core`: customers / jobs / payments (CRUD, scope teamId)
- [x] บันทึก `createdById` ใน Job (audit)
- [x] route handlers / Server Actions บางๆ เรียก service
- [x] data fetching ด้วย TanStack Query + refetch on focus
- [x] skeleton loading + empty states (มิตร + ปุ่มเริ่มต้น) — components พร้อมใช้ (`Skeleton`, `EmptyState`), ยังไม่ได้ใช้จริงในหน้า list (รอ P3)

## P3 — คิวถ่าย (F1) + CRM (F5)

**F1 คิวถ่าย**
- [x] หน้า list คิวถ่าย (เรียงตามวัน/เวลา) + ฟิลเตอร์ (วันนี้/สัปดาห์นี้/สถานะ)
- [x] มุมมอง calendar (เดือน/สัปดาห์) — เดือนแล้ว, มุมมองสัปดาห์ใช้ grid เดียวกันได้ถ้าต้องการ
- [x] หน้ารายละเอียดงาน: ถ่ายอะไร/แบบไหน
- [x] checklist ของที่ต้องใช้ (เพิ่ม/ลบ/ติ๊ก)
- [x] เก็บพิกัดสถานที่ + ปุ่มเปิด Google Maps นำทาง (deep link) — ใช้ lat/lng ก่อน, fallback เป็น locationUrl ถ้ามี
- [x] form สร้าง/แก้คิว + auto-save draft

**F5 CRM**
- [x] หน้า list ลูกค้า + ค้นหา/ฟิลเตอร์
- [x] form เพิ่ม/แก้ลูกค้า (เบอร์/อีเมล/Line/IG/ช่องทางหลัก/โน้ต)
- [x] หน้าลูกค้า: ประวัติงานทั้งหมด + ยอดใช้จ่ายรวม
- [x] ปุ่มลัดติดต่อ (โทร/Line/IG) + สร้างงานใหม่จากหน้าลูกค้า

## P4 — ใบเสนอราคา (F2) + Tracking & แบ่งรายได้ (F3)

**F2 ใบเสนอราคา**
- [x] Prisma model `Package` + CRUD แพ็กเกจ
- [x] form สร้างใบเสนอราคา (เลือกลูกค้า + package หรือกรอกเอง)
- [x] คำนวณราคารวม + ส่วนลด + มัดจำที่เสนอ อัตโนมัติ
- [x] export PDF (โลโก้/ชื่อร้าน/เลขผู้เสียภาษี/วันหมดอายุ) — `@react-pdf/renderer`
- [x] generate ข้อความสรุป (text) สำหรับก็อปส่ง chat
- [x] ส่งใบเสนอราคา → อัปเดตสถานะงานเป็น QUOTED

**F3 tracking + แบ่งรายได้**
- [x] timeline สถานะงาน (เปลี่ยน JobStatus)
- [x] สถานะการเงินต่องาน: ราคารวม/จ่ายแล้ว/ยอดค้าง (สี) + ประวัติการจ่าย
- [x] ปุ่มบันทึกรับเงินเร็ว (deposit/balance/full)
- [x] สรุปยอดค้างรวมทุกงาน
- [x] Prisma model `JobAssignment` (+ enum `ShareType`)
- [x] assign สมาชิก + role ในงาน
- [x] กำหนดสัดส่วน % หรือ fixed + คำนวณยอดต่อคนสด
- [x] validate ผลรวมไม่เกินยอดงาน + แสดงส่วนของทีม (team pool)

## P5 — Dashboard (F8)

- [x] การ์ดคิวถ่ายวันนี้ / สัปดาห์นี้
- [x] ยอดค้างรับทั้งหมด
- [x] กราฟรายรับเดือนนี้ vs เดือนก่อน (Recharts)
- [x] งานที่ต้องตามต่อ (ยังไม่ส่งงาน / ใบเสนอราคารอตอบ)
- [x] quick actions: + งานใหม่ / + ลูกค้า / + บันทึกรับเงิน
- [x] responsive: bottom nav (mobile) / sidebar (desktop)

## P6 — รายรับรายจ่าย + ภาษีไทย (F7)

**รายรับ-รายจ่าย**
- [x] Prisma model `Expense` (+ createdById) + CRUD + แนบรูปใบเสร็จ (ลิงก์ URL — ไม่มี file upload infra ในโปรเจกต์นี้ เหมือน `Team.logoUrl`)
- [x] สรุปตามช่วงเวลา (เดือน/ไตรมาส/ปี): รายรับ/รายจ่าย/กำไรสุทธิ + กราฟตามหมวด
- [x] 2 มุมมองสลับได้: ทีม (team total) / รายคน (per member)
- [x] revenue recognition config: cash basis (default) / accrual — settings UI in team/settings (toggle, owner/admin only)
- [x] สิทธิ์การเห็น: MEMBER เห็นของตัวเอง+ยอดทีม, OWNER/ADMIN เห็นทุกคน

**ภาษี (`packages/tax-th` — pure functions + unit test)**
- [x] Prisma models: `TaxSetting` (VAT ทีม) + `MemberTaxProfile` (PIT รายคน)
- [x] VAT ระดับทีม: on/off + อัตรา + แยกราคาก่อน/หลัง VAT + เตือนใกล้ 1.8 ล้าน
- [x] WHT: ตั้งต่อรายการรับเงิน (3%/2%/0%) + คำนวณยอดสุทธิ + แบ่งเครดิตตามส่วนแบ่ง
- [x] PIT รายคน: 40(2)/40(8), หักเหมา/ตามจริง, ค่าลดหย่อน, ขั้นบันได 0–35%
- [x] ประมาณการภาษีปลายปีรายคน = ภาษี − WHT ที่เครดิต
- [x] หน้า settings ภาษี (ทีม + รายคน) + แก้ bracket ได้
- [x] disclaimer ในแอป (ตัวเลขประมาณการ)

**Export**
- [x] export สรุปภาษี (PDF/Excel) เลือกระดับทีม/รายคน
- [x] export raw CSV (ทุก field + คอลัมน์ส่วนแบ่ง) + ใส่ BOM (`﻿`)

## P7 — QR Delivery (F6)

- [x] Prisma model `DeliveryQr`
- [x] วาง link Google Drive / OneDrive ในหน้างาน
- [x] generate QR + เก็บค่าใน DB — `packages/core/src/delivery-qr` (ไม่มี `packages/integrations` จริงในโปรเจกต์นี้ ใช้แนวทางเดียวกับ PDF/Excel ของ P4/P6 ที่ฝัง logic ไว้ใน core/apps ตรงๆ แทน)
- [x] ดึง link กลับมา / ดาวน์โหลด QR / ก็อป link ส่ง chat
- [x] (optional) นับจำนวนสแกน — ทำใน P8: QR เปลี่ยนไป encode redirect endpoint ของเราเอง (`/api/qr/[jobId]`) แทน sourceUrl ตรงๆ แล้ว enqueue job ให้ worker เพิ่ม `scanCount`
- [ ] (optional) file picker จาก Drive ถ้าเชื่อม account แล้ว — รอ P9 (ยังไม่มี Google/Microsoft OAuth integration ให้ผูก)

## P8 — Worker & Queue

- [x] สร้าง `apps/worker` + `packages/queue` (BullMQ + Redis)
- [x] producer ฝั่ง web (`enqueue`, `apps/web/lib/queue.ts`) + consumer ฝั่ง worker (`apps/worker/src/index.ts`)
- [x] retry policy + dead-letter handling (5 attempts, exponential backoff; failed jobs retained + logged, ดู `packages/queue/src/index.ts`)
- [x] job: reminder ก่อนวันถ่าย (24 ชม. ก่อน `shootDate`, ส่งอีเมลผ่าน Resend ถ้ามี `customerEmail` + `RESEND_API_KEY`)
- [x] job: QR scan count
- [x] job: รับ/ประมวลผล webhook จาก Google/MS — **รับและ enqueue จริง** (รวม MS `validationToken` handshake) แต่ **ฝั่งประมวลผลยัง no-op โดยตั้งใจ**: ยังไม่มี Calendar OAuth/token storage/`calendarEventId` mapping (รอ P9) ให้ sync จริงได้ ดู `apps/worker/src/jobs/calendar-webhook.ts`

## P9 — Calendar Sync (F4)

- [ ] integration service: Google Calendar (`calendar.events`)
- [ ] integration service: Outlook (`Calendars.ReadWrite`)
- [ ] settings → integrations: เชื่อม/ตัดแต่ละ provider แยก + แสดงสถานะ
- [ ] เลือก default calendar (เลือกได้มากกว่า 1)
- [ ] sync งาน → สร้าง/แก้/ลบ event (เก็บ `calendarEventIds` per provider)
- [ ] sync/retry ผ่าน worker + handle token หมดอายุ (refresh)
- [ ] graceful degrade ถ้ายังไม่เชื่อม provider

## P10 — Polish & Release

- [ ] ตั้ง PWA (manifest + service worker + ดูคิววันนี้แบบ offline)
- [ ] QA responsive ครบ mobile / desktop / iPad ทุก breakpoint
- [ ] ตรวจ 3-tap rule กับ flow ที่ใช้บ่อย
- [ ] micro-interaction ปุ่ม + halftone texture (subtle)
- [ ] ออกแบบ asset/illustration เอง (ห้ามใช้ภาพลิขสิทธิ์)
- [ ] error/loading/empty states ครบทุกหน้า
- [ ] เขียน README + setup guide
- [ ] deploy (web + worker + Postgres + Redis)

---

### Definition of Done (ต่อ task)
- [ ] scope ด้วย teamId + authorize ครบ
- [ ] type ผ่าน (no `any` ที่ไม่จำเป็น)
- [ ] logic หลักอยู่ใน `packages/core` / `packages/tax-th` (ไม่ผูก Next.js)
- [ ] โค้ด minimal/readable ตามแนวทางในโปรเจกต์
