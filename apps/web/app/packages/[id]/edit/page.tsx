import { PackageEditClient } from "./package-edit-client";

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackageEditClient id={id} />;
}
