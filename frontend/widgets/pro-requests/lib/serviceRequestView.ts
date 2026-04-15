import type { ServiceRequestProDto } from "@/entities/service-request";

export function formatServiceRequestDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getServiceRequestTitle(item: ServiceRequestProDto) {
  if (item.subjectType === "SERVICE") return item.serviceTitle ?? "Заявка по услуге";
  if (item.subjectType === "CATEGORY") return item.categoryName ? `Категория: ${item.categoryName}` : "Заявка по категории";
  return "Свободная заявка";
}

