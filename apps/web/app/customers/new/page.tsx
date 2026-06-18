import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        กลับไปที่ลูกค้า
      </Link>
      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">เพิ่มลูกค้าใหม่</h2>
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
