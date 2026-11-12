import { getRequestStatusLabel, type RequestStatus } from "@/entities/request";
import type { ChatInboxItemDto } from "@/entities/chat/dto/chat.dto";

export function chatInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("ru-RU") || "?"
  );
}

export function chatStatus(row: ChatInboxItemDto) {
  if (row.kind === "DIRECT") return row.directState === "WAITING" ? "Ожидаем ответ" : row.directState === "BLOCKED" ? "Заблокирован" : row.directState === "DECLINED" ? "Отклонён" : "Без заявки";
  return row.contractPhase
    ? "Договор"
    : row.requestStatus
      ? getRequestStatusLabel(row.requestStatus as RequestStatus)
      : "";
}

export function chatHref(row: ChatInboxItemDto, role: "provider" | "customer") {
  const basePath = role === "provider" ? "/pro/chats" : "/profile/chats";
  if (row.kind === "DIRECT") return `${basePath}/direct/${encodeURIComponent(row.conversationId ?? "")}`;
  return `${basePath}/${encodeURIComponent(row.serviceRequestId ?? "")}${row.conversationId ? `?conversation=${encodeURIComponent(row.conversationId)}` : ""}`;
}

export function inboxTime(iso: string | null, now = new Date()) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear()
      ? { year: "numeric" as const }
      : {}),
  });
}
