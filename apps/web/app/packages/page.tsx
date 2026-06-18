import { PackageList } from "./package-list";

/**
 * P4 ("F2 ใบเสนอราคา") — list view of quotation packages (task #8,
 * TASKS.md: "Prisma model Package + CRUD แพ็กเกจ"). Session + team-context
 * checks already happened in app/packages/layout.tsx.
 */
export default function PackagesPage() {
  return <PackageList />;
}
