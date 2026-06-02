import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CsvImportPage } from "@/components/dashboard/csv-import";

export const revalidate = 0;

export default async function ImportPatientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return <CsvImportPage />;
}
