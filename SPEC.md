# 📸 Snapdesk — Photographer Back-Office Web App

> **Build Spec สำหรับ Cowork**
> เอกสารนี้คือ requirement ที่ใช้สั่งสร้าง web app จริง ตั้งแต่ data model, API จริง ไปจนถึง UI/UX
> สร้างให้ครบทั้ง 8 features โดยต่อ API จริง แต่แยก credentials ทั้งหมดออกเป็นไฟล์ `.env`
>
> *ชื่อ "Snapdesk" เปลี่ยนได้ — ตัวเลือกอื่น: Callsheet / Shotlist / Onset / Framewise*

---

## 1. ภาพรวม (Overview)

**Snapdesk** คือ web app ผู้ช่วยช่างภาพสำหรับจัดการ "งานหลังบ้าน" ทุกอย่างที่ไม่ใช่การถ่ายและแต่งภาพ — ตั้งแต่จัดคิวงาน, ทำใบเสนอราคา, ติดตามสถานะงาน/การจ่ายเงิน, ฐานข้อมูลลูกค้า, ส่งมอบงานผ่าน QR, ไปจนถึงสรุปรายรับรายจ่ายเพื่อจัดการภาษี

**เป้าหมายหลัก:** ลดเวลางาน admin ของช่างภาพฟรีแลนซ์/สตูดิโอเล็ก ให้ทุกอย่างอยู่ในที่เดียว ใช้งานง่ายบนมือถือระหว่างออกกอง

### กลุ่มผู้ใช้
- ช่างภาพฟรีแลนซ์ (งานแต่งงาน, พรีเวดดิ้ง, event, สินค้า, portrait)
- สตูดิโอ/ทีมขนาดเล็ก — **หลาย user ทำงานร่วมกันเป็นทีม** ข้อมูลในทีม share กัน
- 1 user อยู่ได้หลายทีม และสลับทีมที่ใช้งานได้

### Platform
- **Responsive web app** ใช้งานได้ลื่นทั้ง **mobile / desktop / iPad**
- ทำเป็น **PWA** (ติดตั้งลงหน้าจอได้, ใช้ offline ได้บางส่วน เช่นดูคิวงานวันนี้)
- Mobile-first design — เพราะช่างภาพใช้งานหลักตอนออกกอง

---

## 2. Tech Stack (แนะนำ)

เลือกให้ตรงกับ ecosystem TypeScript และ deploy ง่าย:

| ส่วน | เทคโนโลยี | เหตุผล |
|------|-----------|--------|
| Framework | **Next.js 14+ (App Router) + TypeScript** | Full-stack, PWA, API routes ในตัว |
| Styling | **Tailwind CSS** + CSS variables | คุม theme/dark mode ได้สะอาด |
| UI Components | **shadcn/ui** (Radix-based) | accessible, แต่งธีมได้ |
| Database | **PostgreSQL** | relational เหมาะกับ job/customer/payment |
| ORM | **Prisma** | type-safe, migration ง่าย |
| Auth | **Auth.js (NextAuth)** — Credentials + Google + Microsoft | login ได้ทั้ง email/password ในระบบ และ OAuth; token ใช้ต่อ Calendar/Drive ได้ |
| Multi-tenancy | scope ข้อมูลด้วย `teamId` ทุก query | คนในทีมเดียวกันเห็นข้อมูลชุดเดียวกัน (sync อัตโนมัติ) |
| โครงสร้างโค้ด | **Monorepo (pnpm workspaces + Turborepo)** | แยก package ชัด, build/test เฉพาะส่วนที่เปลี่ยน, เผื่อแยก service อนาคต |
| สถาปัตยกรรม | **Modular monolith** — service layer ไม่ผูกกับ Next.js | route/Server Action เป็น layer บาง เรียก service; ถอดไป backend แยกได้โดยไม่เขียนใหม่ |
| Background jobs | **Worker แยก process (BullMQ + Redis)** | calendar sync/retry, reminder, webhook, QR scan count — งาน async ไม่บล็อก web |
| PDF | **@react-pdf/renderer** หรือ **pdfmake** | generate ใบเสนอราคา |
| QR | **qrcode** (npm) | สร้าง QR ฝั่ง server/client |
| State (client) | React hooks + **TanStack Query** | จัดการ data fetching/cache |
| Charts | **Recharts** | dashboard + กราฟการเงิน |

> **หลักการเขียนโค้ด:** เน้น minimal และ readable ไม่ over-engineer ทำ defensive code เท่าที่จำเป็น แยก logic เป็น module/service ที่ reuse ได้

---

## 3. Design Direction (ธีม & UX)

### 3.1 อารมณ์ภาพรวม
ดึงแรงบันดาลใจจาก **retro-tech / instruction-manual / comic-panel** — สดใส ขี้เล่น แต่ยังดู professional และ clean
> ⚠️ ใช้เป็น "ทิศทางสไตล์" เท่านั้น **ห้าม** ลอกตัวละครหรือภาพที่มีลิขสิทธิ์ใดๆ ให้สร้าง asset/illustration เองทั้งหมด

### 3.2 Color Tokens
ใช้ CSS variables เพื่อ swap light/dark ได้

```css
/* Light mode */
--bg:            #DCE9F5;   /* ฟ้าพาสเทลอ่อน */
--surface:       #FFFFFF;
--ink:           #16202B;   /* น้ำเงินเข้มเกือบดำ */
--primary:       #2E7DC4;   /* ฟ้าหลัก */
--accent:        #FFD21E;   /* เหลืองสด — ปุ่ม/ไฮไลต์สำคัญ */
--danger:        #E23B3B;   /* แดง accent — เตือน/ยอดค้าง */
--success:       #2FA46A;   /* เขียว — จ่ายครบ/เสร็จ */
--muted:         #7A8794;

/* Dark mode */
--bg:            #0E1620;
--surface:       #182430;
--ink:           #E8EEF4;
--primary:       #4FA3E3;
--accent:        #FFD21E;   /* เหลืองคงเดิม ให้ pop บนพื้นเข้ม */
```

### 3.3 Typography
- หัวข้อใหญ่: ฟอนต์ **หนา condensed industrial** (เช่น *Archivo Expanded*, *Anton*) ตัวพิมพ์ใหญ่ ให้ความรู้สึก manual/poster
- เนื้อหา: ฟอนต์ sans-serif อ่านง่าย (เช่น *Inter*, หรือ *IBM Plex Sans Thai* สำหรับภาษาไทย)
- ต้องรองรับภาษาไทยเต็มรูปแบบ

### 3.4 องค์ประกอบสไตล์
- การ์ดแบบ **panel** ขอบหนา มี border ชัด เงาแบบ hard-shadow (offset เล็กน้อย)
- **Halftone dots** เป็น texture พื้นหลังบางๆ (subtle เท่านั้น อย่ารก)
- ป้าย/badge สถานะใช้สีจัด มีกรอบ
- ใช้ rounded corner กลางๆ (8–12px) อย่าให้ดูแข็งเกินไป
- มี micro-interaction เล็กน้อยตอนกดปุ่ม (haptic-feel)

### 3.5 หลัก UX (สำคัญที่สุด)
1. **3-tap rule** — งานที่ทำบ่อย (ดูคิววันนี้, อัปเดตสถานะ, บันทึกรับเงิน) ต้องทำเสร็จภายใน 3 แตะ
2. **Bottom nav บนมือถือ** — Dashboard / คิวงาน / ลูกค้า / การเงิน / เพิ่ม(+); **team switcher** อยู่บน header/เมนูโปรไฟล์
3. ปุ่ม action หลักใช้สี accent (เหลือง) ให้หาเจอง่าย
4. แสดง empty state ที่เป็นมิตร + ปุ่มเริ่มต้นชัดเจน
5. ฟอร์มยาวต้อง auto-save draft
6. ทุกหน้าโหลดเร็ว มี skeleton loading

---

## 4. Data Model (Prisma Schema – แนวทาง)

```prisma
// ── บัญชีผู้ใช้ (คน 1 คน) ──
model User {
  id            String       @id @default(cuid())
  name          String
  email         String       @unique
  emailVerified DateTime?
  passwordHash  String?      // null ถ้า login ด้วย OAuth อย่างเดียว
  image         String?
  theme         String       @default("system") // light | dark | system
  activeTeamId  String?      // ทีมที่กำลังใช้งานอยู่
  memberships   TeamMember[]
  accounts      Account[]    // OAuth accounts (Auth.js) — เก็บ token Google/MS ต่อ user
  createdAt     DateTime     @default(now())
}

// Auth.js standard tables (Account, Session, VerificationToken) — ตามมาตรฐาน NextAuth
// Account เก็บ provider (google/azure-ad/credentials) + access/refresh token ของแต่ละ user

// ── ทีม / สตูดิโอ (เจ้าของข้อมูลธุรกิจทั้งหมด) ──
model Team {
  id            String       @id @default(cuid())
  name          String
  businessName  String?
  logoUrl       String?
  taxId         String?      // เลขผู้เสียภาษี (ของทีม/ธุรกิจ)
  members       TeamMember[]
  jobs          Job[]
  customers     Customer[]
  packages      Package[]
  expenses      Expense[]
  taxSetting    TaxSetting?
  createdAt     DateTime     @default(now())
}

model TeamMember {
  id        String   @id @default(cuid())
  teamId    String
  userId    String
  role      TeamRole @default(MEMBER)
  joinedAt  DateTime @default(now())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([teamId, userId])   // 1 คนอยู่ทีมหนึ่งได้ครั้งเดียว
}

enum TeamRole { OWNER ADMIN MEMBER }

model TeamInvite {
  id        String   @id @default(cuid())
  teamId    String
  email     String
  role      TeamRole @default(MEMBER)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Customer {
  id          String   @id @default(cuid())
  teamId      String
  name        String
  phone       String?
  email       String?
  lineId      String?
  channel     String?  // ช่องทางติดต่อหลัก: Line/IG/FB/Phone
  note        String?
  jobs        Job[]
  createdAt   DateTime @default(now())
  team        Team     @relation(fields: [teamId], references: [id])
}

model Job {
  id            String       @id @default(cuid())
  teamId        String
  createdById   String       // user ที่สร้าง (audit)
  customerId    String
  title         String       // เช่น "พรีเวดดิ้ง คุณA"
  shootType     String?      // wedding / portrait / product / event
  status        JobStatus    @default(INQUIRY)
  shootDate     DateTime?
  shootTime     String?
  locationName  String?
  locationLat   Float?
  locationLng   Float?
  locationUrl   String?      // google maps link
  description   String?      // ถ่ายอะไร แบบไหน
  checklist     Json?        // ของที่ต้องใช้ [{item, done}]
  totalPrice    Decimal      @default(0)
  packageId     String?
  calendarEventIds Json?      // sync หลาย provider {google, outlook}
  deliveryLink  String?      // gdrive/onedrive link
  deliveryQrId  String?
  payments      Payment[]
  expenses      Expense[]
  assignments   JobAssignment[]   // ใครในทีมทำงานนี้ + สัดส่วนรายได้
  customer      Customer     @relation(fields: [customerId], references: [id])
  team          Team         @relation(fields: [teamId], references: [id])
  createdAt     DateTime     @default(now())
}

enum JobStatus {
  INQUIRY      // สอบถาม
  QUOTED       // เสนอราคาแล้ว
  CONFIRMED    // ยืนยัน/มัดจำแล้ว
  SHOOTING     // ถึงวันถ่าย
  EDITING      // กำลังแต่ง
  DELIVERED    // ส่งงานแล้ว
  COMPLETED    // ปิดงาน (จ่ายครบ)
  CANCELLED
}

model Payment {
  id          String      @id @default(cuid())
  jobId       String
  amount      Decimal     // ยอดเต็มก่อนหัก
  whtRate     Decimal     @default(0)  // อัตราหัก ณ ที่จ่าย (เช่น 3)
  whtAmount   Decimal     @default(0)  // ยอดถูกหัก ณ ที่จ่าย
  netReceived Decimal?    // ยอดรับสุทธิ = amount - whtAmount
  type        PaymentType // DEPOSIT | BALANCE | FULL
  paidAt      DateTime    @default(now())
  method      String?     // โอน/เงินสด
  note        String?
  job         Job         @relation(fields: [jobId], references: [id])
}

enum PaymentType { DEPOSIT BALANCE FULL }

// ── ใครในทีมทำงานนี้ + แบ่งรายได้ยังไง ──
model JobAssignment {
  id          String     @id @default(cuid())
  jobId       String
  userId      String     // สมาชิกทีมที่ถูก assign
  roleOnJob   String?    // เช่น ช่างภาพหลัก / ผู้ช่วย / ตัดต่อ
  shareType   ShareType  // PERCENT | FIXED
  shareValue  Decimal    // PERCENT = 0–100, FIXED = จำนวนเงิน
  job         Job        @relation(fields: [jobId], references: [id], onDelete: Cascade)
  @@unique([jobId, userId])
}

enum ShareType { PERCENT FIXED }
// กติกาแบ่งรายได้ต่องาน:
//  - FIXED ถูกหักออกจากยอดงานก่อน, ส่วนที่เหลือค่อยคิด PERCENT
//  - ผลรวมต้องไม่เกินยอดงาน (validate ตอนบันทึก)
//  - ส่วนที่ยังเหลือหลังแบ่ง = "ส่วนของทีม/สตูดิโอ" (team pool)

model Package {
  id          String   @id @default(cuid())
  teamId      String
  name        String
  price       Decimal
  description String?
  items       Json?    // รายการที่รวมในแพ็กเกจ
  team        Team     @relation(fields: [teamId], references: [id])
}

model Expense {
  id         String   @id @default(cuid())
  teamId     String
  createdById String  // user ที่บันทึก
  jobId      String?  // ผูกกับงาน หรือเป็นค่าใช้จ่ายทั่วไป
  category    String  // เดินทาง/อุปกรณ์/ผู้ช่วย/อื่นๆ
  amount     Decimal
  spentAt    DateTime @default(now())
  note       String?
  receiptUrl String?
  team       Team     @relation(fields: [teamId], references: [id])
}

model DeliveryQr {
  id          String   @id @default(cuid())
  jobId       String
  sourceUrl   String   // gdrive/onedrive link ต้นทาง
  provider    String?  // google | onedrive
  qrImageUrl  String   // QR ที่ generate เก็บไว้
  scanCount   Int      @default(0)
  createdAt   DateTime @default(now())
}

// ── ภาษีระดับทีม (VAT — ธุรกิจเป็นคนออกบิล) ──
model TaxSetting {
  id            String   @id @default(cuid())
  teamId        String   @unique
  vatRegistered Boolean  @default(false)
  vatRate       Decimal  @default(7)
  pitBrackets   Json?    // ขั้นบันได PIT (ระดับชาติ ใช้ร่วมกัน) [{min,max,rate}] แก้ได้
  team          Team     @relation(fields: [teamId], references: [id])
}

// ── โปรไฟล์ภาษีรายบุคคล (PIT — ยื่นเป็นรายคน) ──
model MemberTaxProfile {
  id             String   @id @default(cuid())
  teamId         String
  userId         String
  incomeType     String   @default("40_2") // 40_2 | 40_8 (ต่างคนต่างเลือกได้)
  expenseMethod  String   @default("flat") // flat (เหมา) | actual (ตามจริง)
  deductions     Json?    // ค่าลดหย่อนส่วนตัว (ส่วนตัว 60,000 + อื่นๆ ต่อคน)
  defaultWhtRate Decimal  @default(3)
  @@unique([teamId, userId])
}
```

---

## 5. Features (8 ข้อ — รายละเอียดครบ)

### Feature 0 — Multi-User, Auth & Teams (ฐานของระบบ)

**การ login**
- รองรับ 2 ทาง: **Email + Password (บัญชีในระบบเอง)** และ **Google login** (OAuth)
- (optional) Microsoft login ด้วย provider เดียวกับที่ใช้ sync calendar
- 1 อีเมล = 1 user account; ถ้า login ด้วย Google ครั้งแรกให้สร้าง account อัตโนมัติ
- Password เก็บเป็น hash (bcrypt/argon2) เท่านั้น — **ห้ามเก็บ plain text**

**ทีม (Team / Workspace)**
- user สร้างทีมเองได้ และ **อยู่ได้หลายทีมพร้อมกัน** (เช่น user Z อยู่ทั้งทีม A และ B)
- เชิญสมาชิกเข้าทีมผ่าน **อีเมล** (ลิงก์ invite มี token + วันหมดอายุ → `TeamInvite`)
- **Role ในทีม**: `OWNER` (จัดการทีม/สมาชิก/ลบทีม), `ADMIN` (จัดการข้อมูล+เชิญคน), `MEMBER` (ใช้งานข้อมูล)
- ตั้งค่าทีม: ชื่อร้าน, โลโก้, เลขผู้เสียภาษี (ใช้ในใบเสนอราคา/ภาษี)

**สลับทีม (Team Switcher)**
- มี **team switcher** มุมบน (desktop) / ในเมนู (mobile) → สลับทีม A ↔ B ได้ทันที
- เก็บทีมที่ใช้งานล่าสุดไว้ที่ `User.activeTeamId`
- ทุกหน้า/ทุก query scope ด้วย **`teamId` ของทีมที่ active อยู่** เท่านั้น

**การ sync ข้อมูลในทีม**
- ข้อมูลทั้งหมด (Job, Customer, Package, Expense, TaxSetting) **เป็นของทีม ไม่ใช่ของ user** → สมาชิกทุกคนในทีมเห็น/แก้ข้อมูลชุดเดียวกัน = sync กันอัตโนมัติผ่าน DB เดียว
- ใช้ TanStack Query refetch / revalidate เมื่อ focus หรือ poll เป็นช่วงๆ เพื่อให้ข้อมูลสดเมื่อมีคนในทีมแก้ (optional: เพิ่ม realtime ผ่าน SSE/websocket ภายหลัง)
- บันทึก `createdById` ในงาน/ค่าใช้จ่าย เพื่อรู้ว่าใครเป็นคนสร้าง (audit)

**ความปลอดภัย (สำคัญมาก)**
- **ทุก query ต้อง filter ด้วย teamId** และเช็คว่า user เป็นสมาชิกทีมนั้นจริง — กันการเห็นข้อมูลข้ามทีม (server-side authorization ทุก endpoint)
- การเชื่อม Calendar/Drive **เป็นของแต่ละ user** (token อยู่ใน `Account` ต่อ user) — เวลา sync งานของทีม ใช้ token ของคนที่กด action นั้น

---

### Feature 1 — ตารางคิวถ่าย (Shoot Schedule)
- มุมมอง **List** (เรียงตามวัน/เวลา) และ **Calendar** (เดือน/สัปดาห์)
- การ์ดแต่ละคิวแสดง: ชื่องาน, วันที่+เวลา, สถานที่, ลูกค้า, สถานะ
- กดที่สถานที่ → เปิด **Google Maps นำทาง** (`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` หรือ destination เป็นชื่อสถานที่)
- หน้ารายละเอียดงาน: ถ่ายอะไร/แบบไหน + **checklist ของที่ต้องใช้** (ติ๊กได้, เพิ่ม/ลบ item ได้)
- ฟิลเตอร์: วันนี้ / สัปดาห์นี้ / สถานะ

### Feature 2 — ใบเสนอราคา (Quotation)
- เลือกลูกค้า + เลือก **package** (ถ้ามี) หรือกรอกรายการเอง
- คำนวณราคารวมอัตโนมัติ (รายการ + ส่วนลด + มัดจำที่เสนอ)
- Export เป็น **PDF** (มีโลโก้/ชื่อร้าน/เลขผู้เสียภาษี/วันหมดอายุใบเสนอราคา)
- Generate เป็น **ข้อความสรุป (text)** สำหรับก็อปส่งใน chat (Line/IG)
- เมื่อส่งใบเสนอราคา → อัปเดตสถานะงานเป็น `QUOTED` อัตโนมัติ

### Feature 3 — ติดตามสถานะงาน, การจ่ายเงิน & แบ่งรายได้ (Tracking & Revenue Split)
- **สถานะงาน**: เปลี่ยนได้ตาม `JobStatus` (timeline แสดง progress)
- **สถานะการเงินต่องาน**:
  - ราคารวมทั้งหมด
  - ยอดที่จ่ายแล้ว (รวม deposit + balance)
  - **ยอดค้าง** (highlight สีแดงถ้ายังมีค้าง, เขียวถ้าครบ)
  - ประวัติการจ่าย (วันที่/จำนวน/วิธี)
- ปุ่ม "บันทึกรับเงิน" เร็วๆ (เลือก deposit/balance/full)
- **Assign สมาชิก + แบ่งรายได้ (`JobAssignment`)**:
  - เลือกได้ว่ามีใครในทีมทำงานนี้บ้าง + ระบุ role (ช่างภาพหลัก/ผู้ช่วย/ตัดต่อ)
  - กำหนดสัดส่วนต่อคนเป็น **% หรือ fixed rate**
  - แสดงยอดที่แต่ละคนจะได้ (คำนวณสด) + ส่วนที่เหลือเป็น **ของทีม/สตูดิโอ**
  - validate ว่าผลรวมไม่เกินยอดงาน (เตือนถ้าเกิน/ยังไม่ครบ)
- สรุปรวมภาพรวม: ยอดค้างทั้งหมดจากทุกงาน

### Feature 4 — Sync ปฏิทิน (Calendar Sync)
- รองรับ **ทั้ง Google Calendar และ Outlook/Microsoft Calendar** โดย **ให้ user เลือกเองว่าจะใช้ตัวไหน**
- หน้า Settings → Integrations: เชื่อม/ตัดการเชื่อมต่อแต่ละ provider แยกกัน (แสดงสถานะ "เชื่อมแล้ว/ยังไม่เชื่อม")
- เลือก **default calendar** ที่จะ sync ไป — เลือกได้มากกว่า 1 (sync ทั้งสองที่พร้อมกันก็ได้)
- เมื่อสร้าง/แก้คิวถ่าย → สร้าง/อัปเดต event อัตโนมัติในปฏิทินที่เลือก (เก็บ `calendarEventId` ต่อ provider, ใช้ Json map เช่น `{google: "...", outlook: "..."}`)
- Event มี: ชื่องาน, เวลา, สถานที่ (พร้อม map link), รายละเอียด
- ลบคิว → ลบ event ในทุก provider ที่ sync ไว้ (ถามยืนยัน)
- ใช้ OAuth token จาก Auth.js — Google scope `calendar.events`, Microsoft scope `Calendars.ReadWrite`
- ถ้า user ยังไม่เชื่อม provider ไหน → ปุ่ม sync ของตัวนั้นขึ้นสถานะ "ยังไม่ได้เชื่อมต่อ" (graceful degrade)

### Feature 5 — ฐานข้อมูลลูกค้า (Customer CRM)
- เก็บ: ชื่อ, เบอร์, อีเมล, Line ID, IG, ช่องทางติดต่อหลัก, โน้ต
- หน้าลูกค้าแสดง **ประวัติงานทั้งหมด** ของลูกค้าคนนั้น + ยอดใช้จ่ายรวม
- ปุ่มลัดติดต่อ: โทร / เปิด Line / เปิด IG
- ค้นหา/ฟิลเตอร์ลูกค้าได้
- สร้างงานใหม่จากหน้าลูกค้าได้เลย

### Feature 6 — ส่งมอบงานผ่าน QR (Delivery QR)
- ในหน้างาน: วาง **link จาก Google Drive หรือ OneDrive** (รองรับทั้งสอง — user เลือกเอง / วาง link ไหนก็ได้)
- ระบบ **generate QR code** จาก link นั้น + เก็บค่าไว้ใน DB (`DeliveryQr`)
- ลูกค้าสแกน → เข้าถึงงานได้ทันที
- เก็บ link ไว้เพื่อ **กลับมาดึงให้ลูกค้าใหม่ได้** (เผื่อ QR หาย)
- (optional) ถ้า user เชื่อม Google/Microsoft ไว้แล้ว → มีปุ่ม "เลือกไฟล์/โฟลเดอร์จาก Drive" โดยตรง (Google Picker / OneDrive file picker) แทนการก็อป link เอง
- (optional) นับจำนวนครั้งที่ถูกสแกน
- ดาวน์โหลด QR เป็นรูป / ก็อป link ส่ง chat ได้

### Feature 7 — สรุปรายรับรายจ่าย & ภาษีไทย (Finance & Thai Tax)

**ส่วนรายรับ-รายจ่าย**
- บันทึก **รายรับ** (จาก payments) และ **รายจ่าย** (Expense: เดินทาง/อุปกรณ์/ผู้ช่วย ฯลฯ)
- แนบรูปใบเสร็จได้
- สรุปตาม **ช่วงเวลา** (เดือน/ไตรมาส/ปี): รายรับรวม, รายจ่ายรวม, กำไรสุทธิ
- แยกตามหมวดหมู่ (กราฟ)
- **2 มุมมอง สลับได้:**
  - **ทีม (Team total)** — รายได้รวมของทีมทั้งหมด (ตามเดิม ยังคงอยู่)
  - **รายคน (Per member)** — รายได้ของแต่ละคน = ผลรวม "ส่วนแบ่ง" (`JobAssignment`) จากทุกงานในช่วงนั้น + แสดงส่วนของทีม/สตูดิโอ (team pool) แยกบรรทัด
- **การรับรู้รายได้ (revenue recognition)** ค่า config ได้:
  - default = **cash basis** (รับรู้เมื่อมีเงินเข้าจริง — แบ่งตามสัดส่วนของแต่ละคน ตาม payment ที่เข้ามา)
  - หรือ **accrual** (รับรู้เต็มยอดเมื่อปิดงาน)
- สิทธิ์การเห็น: MEMBER เห็นรายได้ของตัวเอง + ยอดทีม; OWNER/ADMIN เห็นของทุกคน

**ส่วนภาษีไทย (คำนวณจริงจัง)**
ทำเป็นโมดูล `lib/tax-th.ts` ที่ค่าทุกอัตราเป็น **config ตั้งได้ในหน้า Settings → ภาษี** (มีค่า default ของไทยให้ แต่ user แก้ได้ เพราะอัตรา/เพดานปรับได้ตามปีภาษีและสถานะผู้เสียภาษี):

1. **VAT — ภาษีมูลค่าเพิ่ม (ระดับทีม, default 7%)**
   - Setting ที่ระดับทีม: "จด VAT แล้วหรือยัง" (on/off) + อัตรา (ธุรกิจ/ทีมเป็นคนออกบิล)
   - ถ้าเปิด: แยกแสดงราคาก่อน/หลัง VAT ในใบเสนอราคา + ใบเสร็จ, สรุป VAT ขายต่อเดือน (ของทีม)
   - เตือนเมื่อรายได้ทีมสะสมเข้าใกล้/เกิน **1.8 ล้านบาท/ปี** (เกณฑ์ต้องจด VAT)

2. **หัก ณ ที่จ่าย — Withholding Tax (default 3% สำหรับค่าบริการ/ค่าจ้างทำของ)**
   - ระบุต่อรายการรับเงินได้ว่าลูกค้าหัก ณ ที่จ่ายหรือไม่ + อัตรา (3% ค่าบริการ / 2% โฆษณา / 0% ถ้าไม่หัก)
   - คำนวณยอดรับสุทธิหลังหัก + เก็บยอดภาษีที่ถูกหักไว้
   - **WHT ที่ถูกหักถูกแบ่งให้สมาชิกตามสัดส่วนส่วนแบ่งของงานนั้น** เพื่อนำไปเครดิตใน PIT รายคน
   - สรุปยอด WHT ที่ถูกหักสะสม ทั้งระดับทีมและรายคน

3. **ภาษีเงินได้บุคคลธรรมดา — PIT (ประมาณการ, แยกรายคน)**
   - คำนวณ **แยกต่อสมาชิกแต่ละคน** จาก `MemberTaxProfile` เพราะ PIT ยื่นเป็นรายคน
   - ฐานรายได้ของแต่ละคน = ผลรวมส่วนแบ่งจากทุกงาน (จาก `JobAssignment`) ในปีภาษีนั้น
   - แต่ละคนเลือกประเภทเงินได้เองได้: **40(2)** (หักเหมา 50% เพดาน 100,000) หรือ **40(8)** (ตามจริง/เหมา 60%)
   - หักค่าลดหย่อนส่วนตัวของแต่ละคน (ส่วนตัว 60,000 + รายการที่กรอกเพิ่ม)
   - คำนวณภาษีตาม **ขั้นบันได 0–35%** (brackets ระดับทีม ใช้ร่วม)
   - **ประมาณการภาษีปลายปีของแต่ละคน** = ภาษีคำนวณได้ − WHT ที่ถูกหัก (ตามส่วนแบ่งของคนนั้น)
   - หน้าสรุปภาษีแสดงเป็น tab รายคน + มี note ว่าส่วนของทีม/สตูดิโอ (team pool) ใครเป็นผู้รับผิดชอบยื่น (เช่น เจ้าของทีม)
   - แสดงเป็น "ตัวเลขประมาณการ" ชัดเจน

**Export**
- **Export แบบสรุปภาษี (PDF/Excel)** — เลือกได้ว่า **ระดับทีม** หรือ **รายคน** (สรุป PIT ของแต่ละคนแยกไฟล์/แยก sheet พร้อม WHT ที่เครดิตได้)
- **Export แบบดิบ (Raw CSV)** — ตารางธุรกรรมล้วนๆ ทุก field (รวมคอลัมน์ส่วนแบ่งต่อคน) ไม่คำนวณภาษีให้ เอาไปทำเอง/ส่งนักบัญชี
  - ⚠️ ใส่ BOM (`﻿`) นำหน้าไฟล์ CSV ทุกครั้ง เพื่อให้ Excel เปิดภาษาไทยไม่เพี้ยน
- ให้ user สลับได้ว่าจะเอาแบบคำนวณให้ หรือแบบดิบ

> ⚠️ **Disclaimer (แสดงในแอป):** ตัวเลขภาษีเป็นการ "ประมาณการ" เพื่อช่วยวางแผนเท่านั้น ไม่ใช่คำแนะนำทางภาษี/บัญชี อัตราและเกณฑ์อาจเปลี่ยนตามประกาศกรมสรรพากร ควรตรวจสอบกับนักบัญชีหรือกรมสรรพากรก่อนยื่นจริง

### Feature 8 — Dashboard & UX
- **Dashboard** หน้าแรกแสดงภาพรวม:
  - คิวถ่ายวันนี้ / สัปดาห์นี้
  - ยอดค้างรับทั้งหมด
  - รายรับเดือนนี้ vs เดือนก่อน (กราฟ)
  - งานที่ต้องตามต่อ (เช่น ยังไม่ส่งงาน, ใบเสนอราคารอตอบ)
  - quick actions: + งานใหม่, + ลูกค้า, + บันทึกรับเงิน
- **Light/Dark/System** mode (จำค่าไว้)
- Responsive ครบทุกขนาดจอ, bottom nav บนมือถือ, sidebar บน desktop

---

## 6. การต่อ API จริง + ไฟล์ ENV

ต่อ API จริงทั้งหมด แต่ **แยก credentials ออกเป็นไฟล์ `.env`** ห้าม hardcode

### โครงสร้างที่ต้องมี
- โหลด env ผ่าน config module เดียว (เช่น `lib/env.ts`) ที่ validate ตอน startup
- มีไฟล์ **`.env.example`** ที่ commit ได้ (ไม่มีค่าจริง) + `.env` ที่ gitignore
- ทุก integration ทำเป็น **service module** แยก (`lib/integrations/google-calendar.ts` ฯลฯ) เพื่อ mock/test ง่าย

### `.env.example`
```bash
# ── App ──
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/snapdesk
REDIS_URL=redis://localhost:6379    # สำหรับ BullMQ queue (worker)

# ── Auth.js ──
AUTH_SECRET=                  # openssl rand -base64 32

# ── Google (OAuth + Calendar + Drive) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# scopes: openid email profile
#         https://www.googleapis.com/auth/calendar.events
#         https://www.googleapis.com/auth/drive.readonly

# ── Microsoft (OAuth + Outlook Calendar + OneDrive) ──
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=common
# scopes: openid email profile offline_access
#         Calendars.ReadWrite  Files.Read.All

# ── (optional) Storage สำหรับ QR image / receipt ──
STORAGE_BUCKET=
STORAGE_KEY=
STORAGE_SECRET=
```

> ถ้า API ตัวไหนยังไม่มี key ตอน build ให้ feature นั้น **graceful degrade** (ปุ่มขึ้น "ยังไม่ได้เชื่อมต่อ" แทนที่จะ error ทั้งแอป) และเขียน mock fallback ไว้สำหรับ dev

---

## 7. โครงสร้างโปรเจกต์ (Monorepo)

> **หลักการ:** modular monolith บน monorepo — แยก domain/service layer ออกจาก Next.js ให้สะอาด เผื่ออนาคตถอด backend แยกได้โดยไม่เขียนใหม่ งาน async แยกเป็น worker ตั้งแต่ต้น

```
snapdesk/                        # pnpm workspace + Turborepo
├── apps/
│   ├── web/                     # Next.js (UI + route handlers/Server Actions = layer บาง)
│   │   ├── app/
│   │   │   ├── (auth)/login, register, invite/[token]
│   │   │   ├── (dashboard)/page.tsx
│   │   │   ├── jobs/  customers/  finance/  quotations/
│   │   │   ├── settings/        # โปรไฟล์, ทีม+สมาชิก, integrations, ภาษี
│   │   │   └── api/             # บางๆ → เรียก service จาก @snapdesk/core
│   │   └── components/
│   │       ├── ui/              # shadcn
│   │       └── team-switcher.tsx
│   └── worker/                  # BullMQ worker (process แยก)
│       └── jobs/                # calendar-sync, reminders, webhooks, qr-scan
│
├── packages/
│   ├── core/                    # @snapdesk/core — domain logic ล้วน ไม่ผูก Next.js
│   │   └── services/            # jobs, customers, payments, finance, teams
│   ├── db/                      # @snapdesk/db — Prisma schema + client (source of truth)
│   ├── auth/                    # Auth.js config (Credentials + Google + MS)
│   ├── tax-th/                  # คำนวณภาษีไทย (VAT/WHT/PIT) — pure functions, unit-testable
│   ├── integrations/            # google-calendar, outlook-calendar, drive, qr
│   ├── queue/                   # นิยาม queue + producer (web enqueue, worker consume)
│   └── types/                   # shared types/zod schemas
│
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

**กฎการพึ่งพา (dependency rule):**
- `apps/web` และ `apps/worker` พึ่ง `packages/*` ได้ — แต่ `packages/core` **ห้าม import จาก Next.js / apps** (เพื่อให้ยกไปวางที่อื่นได้)
- การเข้าถึง DB ผ่าน `@snapdesk/db` ที่เดียว — ทุก service scope ด้วย `teamId` เสมอ
- งานที่ side-effect/ช้า/ต้อง retry → web แค่ `enqueue` ลง `packages/queue` แล้วให้ `apps/worker` ทำต่อ

---

## 8. Acceptance Criteria (เกณฑ์ว่าเสร็จ)

- [ ] login ได้ทั้ง email/password และ Google (password เก็บเป็น hash)
- [ ] สร้างทีม + เชิญสมาชิกทางอีเมลได้, มี role OWNER/ADMIN/MEMBER
- [ ] 1 user อยู่หลายทีมได้ + team switcher สลับทีมได้, จำทีมล่าสุด
- [ ] ข้อมูลทุกอย่าง scope ด้วย teamId — สมาชิกในทีมเดียวกันเห็นข้อมูลชุดเดียวกัน (sync) และเห็นข้ามทีมไม่ได้
- [ ] ใช้งานได้จริงบน mobile / desktop / iPad (responsive ผ่านทุก breakpoint)
- [ ] สลับ light/dark ได้ จำค่าไว้
- [ ] สร้าง/แก้/ลบ คิวถ่าย + กด map นำทางได้ + checklist ทำงาน
- [ ] ทำใบเสนอราคา → export PDF และ text ได้
- [ ] track สถานะงาน + การเงิน (ยอดค้าง/มัดจำ) ถูกต้อง สรุปรวมได้
- [ ] sync ขึ้น Google และ/หรือ Outlook calendar ได้จริง โดย user เลือก provider เองได้ (เชื่อม/ตัดแยกกัน)
- [ ] CRM เก็บลูกค้า + ดูประวัติงานได้
- [ ] วาง drive link (Google Drive หรือ OneDrive) → generate + เก็บ QR ได้ ดึงกลับมาได้
- [ ] assign สมาชิกในงานได้ + แบ่งรายได้ต่อคนเป็น % หรือ fixed (validate ผลรวม), ส่วนเหลือเป็นของทีม
- [ ] สรุปรายรับรายจ่าย สลับมุมมองทีม/รายคนได้ + ยอดรวมทีมยังคงอยู่
- [ ] คำนวณภาษีไทย: VAT ระดับทีม, PIT แยกรายคนจากส่วนแบ่งของแต่ละคน, WHT เครดิตตามส่วนแบ่ง
- [ ] export ได้ทั้งระดับทีมและรายคน, ทั้งแบบสรุปภาษีและแบบดิบ (CSV มี BOM)
- [ ] Dashboard แสดงภาพรวมครบ
- [ ] credentials ทั้งหมดอยู่ใน `.env`, มี `.env.example`, ไม่มี hardcode
- [ ] โค้ด minimal/readable, integration แยกเป็น service module

---

## 9. ลำดับการ build (แนะนำ)

1. **Setup monorepo**: pnpm workspaces + Turborepo, สร้าง `apps/web`, `packages/db` (Prisma), `packages/core`, `packages/types` + theme tokens (light/dark)
2. **F0 Auth & Teams**: Auth.js (Credentials + Google) + Team/TeamMember/Invite + team switcher + middleware ที่ scope ทุก query ด้วย teamId (ทำก่อนเพราะทุกอย่างต่อยอดจากนี้)
3. **Core data**: Customer + Job + Payment + CRUD พื้นฐาน (ผ่าน service layer ใน `@snapdesk/core`, scope ด้วย teamId)
4. **F1 คิวถ่าย** + **F5 CRM** (เชื่อมกัน)
5. **F2 ใบเสนอราคา** + **F3 tracking การเงิน + assign/แบ่งรายได้**
6. **F8 Dashboard**
7. **F7 รายรับรายจ่าย + ภาษีไทย** (ทีม/รายคน) + export
8. **F6 QR delivery**
9. **Worker + queue**: ตั้ง `apps/worker` + BullMQ/Redis แล้วย้ายงาน async (sync, reminder, webhook) มาที่นี่
10. **F4 Calendar sync** (token ต่อ user, sync/retry ผ่าน worker)
11. Polish UX + PWA + responsive QA

---

*หมายเหตุ: ธีมและ asset ภาพทั้งหมดให้ออกแบบขึ้นใหม่เอง ใช้ reference เป็นแค่ทิศทางอารมณ์ (retro-tech/manual, ฟ้า-เหลือง-แดง) ห้ามนำภาพหรือตัวละครที่มีลิขสิทธิ์มาใช้*
