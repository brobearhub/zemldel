import { redirect } from "next/navigation";
import { fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { LegalProfileForm } from "@/widgets/pro-contracts/ui/LegalProfileForm";

const customerFields = [
  { name: "fullName", label: "ФИО" },
  { name: "inn", label: "ИНН" },
  { name: "registrationAddress", label: "Адрес регистрации" },
  { name: "postalAddress", label: "Почтовый адрес" },
  { name: "phone", label: "Телефон" },
  { name: "email", label: "Email" },
];

export default async function CustomerRequisitesPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");

  const profile = await fetchBackendJsonAsUser<Record<string, unknown>>("/contracts/legal-profile", session.user.id);

  return (
    <LegalProfileForm
      title="Мои реквизиты для договоров"
      endpoint="/api/contracts/legal-profile"
      fields={customerFields}
      initial={profile}
    />
  );
}
