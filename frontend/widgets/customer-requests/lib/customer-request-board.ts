import {
  getRequestStatusColor,
  getRequestStatusLabel,
  type RequestCustomerDto,
  type RequestStatus,
} from "@/entities/request";
import { pluralRu } from "@/shared/lib/plural-ru";

export type CustomerRequestCardTone = "sage" | "warm";
export type CustomerRequestColumnColor = ReturnType<typeof getRequestStatusColor>;

export type CustomerRequestBoardColumn = {
  status: RequestStatus;
  label: string;
  color: CustomerRequestColumnColor;
  items: RequestCustomerDto[];
};

export const CUSTOMER_REQUEST_BOARD_COLUMNS: readonly {
  status: RequestStatus;
  label: string;
  color: CustomerRequestColumnColor;
}[] = [
  { status: "NEW", label: getRequestStatusLabel("NEW"), color: getRequestStatusColor("NEW") },
  { status: "DISCUSSING", label: getRequestStatusLabel("DISCUSSING"), color: getRequestStatusColor("DISCUSSING") },
  { status: "TERMS_AGREED", label: getRequestStatusLabel("TERMS_AGREED"), color: getRequestStatusColor("TERMS_AGREED") },
  { status: "ACTIVE", label: getRequestStatusLabel("ACTIVE"), color: getRequestStatusColor("ACTIVE") },
  {
    status: "ACCEPTANCE_PENDING",
    label: getRequestStatusLabel("ACCEPTANCE_PENDING"),
    color: getRequestStatusColor("ACCEPTANCE_PENDING"),
  },
  { status: "ACCEPTED", label: getRequestStatusLabel("ACCEPTED"), color: getRequestStatusColor("ACCEPTED") },
  { status: "COMPLETED", label: getRequestStatusLabel("COMPLETED"), color: getRequestStatusColor("COMPLETED") },
  { status: "CANCELLED", label: getRequestStatusLabel("CANCELLED"), color: getRequestStatusColor("CANCELLED") },
  { status: "CLOSED", label: getRequestStatusLabel("CLOSED"), color: getRequestStatusColor("CLOSED") },
] as const;

function firstLetter(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase();
}

function hashIdentity(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function groupCustomerRequestsByStatus(items: readonly RequestCustomerDto[]): CustomerRequestBoardColumn[] {
  const buckets = new Map<RequestStatus, RequestCustomerDto[]>(
    CUSTOMER_REQUEST_BOARD_COLUMNS.map((column) => [column.status, []])
  );

  for (const item of items) {
    buckets.get(item.status)?.push(item);
  }

  return CUSTOMER_REQUEST_BOARD_COLUMNS.flatMap((column) => {
    const itemsInColumn = buckets.get(column.status) ?? [];
    if (itemsInColumn.length === 0) return [];
    return [
      {
        status: column.status,
        label: column.label,
        color: column.color,
        items: itemsInColumn,
      },
    ];
  });
}

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const FREEFORM_REQUEST_CARD_PHOTO = "/hero-bg-house_static_day.jpg";

export type CustomerRequestCardContent = {
  title: string;
  letter: string;
  photo: string | null;
  metaName: string | null;
  providerReply: string | null;
  customerReply: string | null;
};

export function getCustomerRequestCardContent(
  item: Pick<
    RequestCustomerDto,
    | "status"
    | "serviceTitle"
    | "categoryName"
    | "message"
    | "serviceImage"
    | "providerImage"
    | "providerName"
    | "providerLastMessage"
    | "customerLastMessage"
  >
): CustomerRequestCardContent {
  const subject = nonempty(item.serviceTitle) ?? nonempty(item.categoryName);
  const title = subject ?? nonempty(item.message) ?? "Без описания";
  const photo = subject
    ? nonempty(item.serviceImage) ?? nonempty(item.providerImage)
    : FREEFORM_REQUEST_CARD_PHOTO;

  return {
    title,
    letter: firstLetter(title) ?? "З",
    photo,
    metaName: nonempty(item.providerName),
    providerReply: item.status === "DISCUSSING" ? nonempty(item.providerLastMessage) : null,
    customerReply: item.status === "DISCUSSING" ? nonempty(item.customerLastMessage) : null,
  };
}

export function getCustomerRequestCardTone(
  item: Pick<RequestCustomerDto, "id" | "providerId">
): CustomerRequestCardTone {
  const identity = item.providerId?.trim() || item.id;
  return hashIdentity(identity) % 2 === 0 ? "sage" : "warm";
}

const MS_IN_DAY = 86_400_000;

export type CustomerRequestOpenAge = {
  days: number;
  label: string;
};

export function getCustomerRequestOpenAge(createdAt: string, now: Date = new Date()): CustomerRequestOpenAge {
  const created = new Date(createdAt).getTime();
  const days = Number.isNaN(created) ? 0 : Math.max(0, Math.floor((now.getTime() - created) / MS_IN_DAY));

  return {
    days,
    label: pluralRu(days, ["день", "дня", "дней"]),
  };
}
