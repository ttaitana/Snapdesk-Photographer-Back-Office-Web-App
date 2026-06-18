import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PackageForm } from "../package-form";

export default function NewPackagePage() {
  return (
    <div className="space-y-4">
      <Link href="/packages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        กลับไปที่แพ็กเกจ
      </Link>
      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">เพิ่มแพ็กเกจใหม่</h2>
        <PackageForm mode="create" />
      </div>
    </div>
  );
}
