"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "แดชบอร์ด" },
  { href: "/jobs", label: "คิวถ่าย" },
  { href: "/customers", label: "ลูกค้า" },
  { href: "/team/settings", label: "ตั้งค่าทีม" },
  { href: "/team/members", label: "สมาชิก" },
];

/** Split out from team/layout.tsx (a server component) purely because
 * highlighting the active link needs usePathname(), which requires "use
 * client". Everything else about the layout stays server-rendered. */
export function TeamNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b-2 border-ink pb-3 text-sm font-medium">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              active ? "text-ink underline underline-offset-4" : "text-muted-foreground hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
