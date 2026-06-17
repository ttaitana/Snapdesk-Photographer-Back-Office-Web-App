"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialAuthButtons } from "../social-auth-buttons";

export function LoginForm({
  googleEnabled,
  microsoftEnabled,
  redirectTo = "/dashboard",
}: {
  googleEnabled: boolean;
  microsoftEnabled: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn.email({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="panel space-y-6 p-6">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl uppercase text-ink">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground">Snapdesk — ผู้ช่วยหลังบ้านสำหรับช่างภาพ</p>
      </div>

      <SocialAuthButtons
        googleEnabled={googleEnabled}
        microsoftEnabled={microsoftEnabled}
        callbackURL={redirectTo}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ยังไม่มีบัญชี?{" "}
        <a href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          สมัครสมาชิก
        </a>
      </p>
    </div>
  );
}
