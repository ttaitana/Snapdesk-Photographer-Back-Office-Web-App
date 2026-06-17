"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Preferred way to log out from inside the app (nav bars, settings menus) —
 * no page navigation needed, unlike /logout (see app/(auth)/logout/page.tsx). */
export function LogoutButton(props: ButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleClick} {...props}>
      {pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </Button>
  );
}
