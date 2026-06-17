"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialAuthButtons } from "../social-auth-buttons";

export function RegisterForm({
  googleEnabled,
  microsoftEnabled,
}: {
  googleEnabled: boolean;
  microsoftEnabled: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp.email({ name, email, password });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message ?? "สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง");
      return;
    }

    // No separate "create or join a team" onboarding step — every
    // photographer needs a team to scope their data from the moment they
    // sign in, so they get a personal team automatically. That now happens
    // server-side (packages/auth/src/auth.ts's databaseHooks.user.create.after),
    // which covers this email/password path AND OAuth (social-auth-buttons.tsx),
    // so there's nothing left to do here but redirect. Real business
    // name/tax ID get filled in on the team settings page (task #22).
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="panel space-y-6 p-6">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl uppercase text-ink">สมัครสมาชิก</h1>
        <p className="text-sm text-muted-foreground">Snapdesk — ผู้ช่วยหลังบ้านสำหรับช่างภาพ</p>
      </div>

      <SocialAuthButtons googleEnabled={googleEnabled} microsoftEnabled={microsoftEnabled} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">ชื่อ</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        มีบัญชีอยู่แล้ว?{" "}
        <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          เข้าสู่ระบบ
        </a>
      </p>
    </div>
  );
}
