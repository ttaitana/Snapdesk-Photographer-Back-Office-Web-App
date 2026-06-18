import { CustomerEditClient } from "./customer-edit-client";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerEditClient id={id} />;
}
