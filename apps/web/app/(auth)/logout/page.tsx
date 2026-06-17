"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";

/**
 * Visiting /logout (e.g. a plain `<a href="/logout">` link in a nav menu)
 * signs the user out and bounces to /login. Most call sites should prefer
 * the LogoutButton component instead, which doesn't need a page navigation
 * at all — this route exists for the cases where a plain link is simpler
 * (emails, non-JS contexts).
 */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut().finally(() => {
      router.push("/login");
      router.refresh();
    });
  }, [router]);

  return (
    <div className="panel space-y-2 p-6 text-center">
      <p className="text-sm text-muted-foreground">กำลังออกจากระบบ...</p>
    </div>
  );
}
