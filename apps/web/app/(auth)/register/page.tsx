import type { Metadata } from "next";

import { integrations } from "@/lib/env";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก — Snapdesk" };

export default function RegisterPage() {
  return <RegisterForm googleEnabled={integrations.google} microsoftEnabled={integrations.microsoft} />;
}
