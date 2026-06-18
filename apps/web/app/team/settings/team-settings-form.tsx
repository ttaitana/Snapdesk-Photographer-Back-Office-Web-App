"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { RevenueBasis, Team } from "@snapdesk/types";
import { organizationApi } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeamSettingsForm({ team, canEdit }: { team: Team; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [businessName, setBusinessName] = useState(team.businessName ?? "");
  const [taxId, setTaxId] = useState(team.taxId ?? "");
  const [logoUrl, setLogoUrl] = useState(team.logoUrl ?? "");
  const [revenueBasis, setRevenueBasis] = useState<RevenueBasis>(team.revenueBasis);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError("กรุณากรอกชื่อทีม");
      return;
    }

    setSubmitting(true);
    // businessName/taxId are additionalFields on the organization schema
    // (see packages/auth/src/auth.ts's organization({ schema: { organization
    // : { additionalFields: ... } } })) — they sit alongside name/slug/logo
    // in the same `data` object, not nested under `metadata`.
    const { error: updateError } = await organizationApi.update({
      data: {
        name: name.trim(),
        businessName: businessName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        logo: logoUrl.trim() || undefined,
        revenueBasis,
      },
      organizationId: team.id,
    });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message ?? "บันทึกไม่สำเร็จ ลองอีกครั้ง");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">ชื่อทีม</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="businessName">ชื่อธุรกิจ (สำหรับใบเสนอราคา/ใบเสร็จ)</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
        <Input
          id="taxId"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">URL โลโก้</Label>
        <Input
          id="logoUrl"
          type="url"
          placeholder="https://..."
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-1.5">
        <Label>เกณฑ์การรับรู้รายได้</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={revenueBasis === "cash" ? "primary" : "outline"}
            disabled={!canEdit}
            onClick={() => canEdit && setRevenueBasis("cash")}
          >
            เกณฑ์เงินสด (Cash)
          </Button>
          <Button
            type="button"
            variant={revenueBasis === "accrual" ? "primary" : "outline"}
            disabled={!canEdit}
            onClick={() => canEdit && setRevenueBasis("accrual")}
          >
            เกณฑ์คงค้าง (Accrual)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {revenueBasis === "cash"
            ? "นับรายได้เมื่อได้รับเงินจริง (วันที่ชำระเงิน)"
            : "นับรายได้เมื่องานได้รับการยืนยัน/ส่งมอบ ไม่ต้องรอรับเงิน"}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-primary">บันทึกการเปลี่ยนแปลงแล้ว</p>}

      {canEdit && (
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      )}
    </form>
  );
}
