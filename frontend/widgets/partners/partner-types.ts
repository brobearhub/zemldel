export type PartnerProvider = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  subtitle: string | null;
  city: { id: string; name: string; regionName: string } | null;
  services?: { id: string; title: string; category: { name: string } }[];
};

export type Partnership = {
  id: string;
  status: "PENDING" | "ACTIVE";
  incoming: boolean;
  provider: PartnerProvider | null;
  email: string | null;
  sentAt: string | null;
  expiresAt: string | null;
};

export type PartnersResponse = { items: Partnership[] };
export type DirectoryResponse = {
  items: PartnerProvider[];
  page: number;
  hasMore: boolean;
};

export function partnershipLabel(partner: Partnership) {
  if (partner.status === "ACTIVE") return "Партнёр";
  if (
    !partner.provider &&
    partner.expiresAt &&
    new Date(partner.expiresAt).getTime() <= Date.now()
  )
    return "Приглашение истекло";
  if (partner.incoming) return "Входящее приглашение";
  if (partner.provider) return "Ожидает подтверждения";
  return partner.sentAt ? "Приглашение отправлено" : "Отправляем приглашение";
}
