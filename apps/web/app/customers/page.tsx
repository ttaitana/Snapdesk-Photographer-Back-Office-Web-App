import { CustomersList } from "./customers-list";

/**
 * P3 ("F5 CRM") — list view of customers + search/filter (task #11,
 * TASKS.md: "หน้า list ลูกค้า + ค้นหา/ฟิลเตอร์"). Session + team-context
 * checks already happened in app/customers/layout.tsx.
 */
export default function CustomersPage() {
  return <CustomersList />;
}
