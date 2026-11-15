import type { Metadata } from "next";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProDocumentsPage } from "@/widgets/pro-documents/ui/ProDocumentsPage";

export const metadata: Metadata = { title: "Документы — Земледел" };

export default async function DocumentsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/pro/documents");
  return <ProDocumentsPage />;
}
