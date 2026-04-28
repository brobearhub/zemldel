import { notFound, redirect } from "next/navigation";
import { fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { LegalProfileForm } from "@/widgets/pro-contracts/ui/LegalProfileForm";

const providerFields = [
  { name: "legalName", label: "Юридическое наименование" },
  { name: "inn", label: "ИНН" },
  { name: "kpp", label: "КПП" },
  { name: "ogrn", label: "ОГРН / ОГРНИП" },
  { name: "legalAddress", label: "Юридический адрес" },
  { name: "postalAddress", label: "Почтовый адрес" },
  { name: "bankName", label: "Банк" },
  { name: "bankBik", label: "БИК" },
  { name: "bankAccount", label: "Расчётный счёт" },
  { name: "correspondentAccount", label: "Корреспондентский счёт" },
  { name: "signerName", label: "ФИО подписанта" },
  { name: "signerTitle", label: "Должность подписанта" },
  { name: "signerBasis", label: "Основание полномочий" },
  { name: "phone", label: "Телефон" },
  { name: "email", label: "Email" },
];

export default async function ProContractRequisitesPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");
  if ((session.user.memberships?.length ?? 0) === 0) notFound();

  const profile = await fetchBackendJsonAsUser<Record<string, unknown>>("/pro/contracts/legal-profile", session.user.id);

  return (
    <LegalProfileForm
      title="Реквизиты компании для договоров"
      endpoint="/api/pro/contracts/legal-profile"
      fields={providerFields}
      initial={profile}
    />
  );
}
