import { pluralRu } from "@/shared/lib/plural-ru";

const MS_IN_HOUR = 3_600_000;
const MS_IN_DAY = 86_400_000;

export type RequestOpenAge = {
  count: number;
  label: string;
};

/** Why: «0 дней» не говорит, насколько заявка свежая — до суток считаем целые часы. */
export function getRequestOpenAge(createdAt: string, now: Date = new Date()): RequestOpenAge {
  const created = new Date(createdAt).getTime();
  const elapsed = Number.isNaN(created) ? 0 : Math.max(0, now.getTime() - created);
  const days = Math.floor(elapsed / MS_IN_DAY);
  if (days > 0) {
    return { count: days, label: pluralRu(days, ["день", "дня", "дней"]) };
  }
  const hours = Math.floor(elapsed / MS_IN_HOUR);
  return { count: hours, label: pluralRu(hours, ["час", "часа", "часов"]) };
}

/** Why: тот же порядок, что у аватара в карточке заявки — имя, затем фамилия. */
export function requestCustomerInitials(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  if (parts.length === 1) return first.toLocaleUpperCase("ru-RU");
  const second = parts[1]?.charAt(0) ?? "";
  return (second + first).toLocaleUpperCase("ru-RU");
}

/** Why: заголовок строки — имя заказчика с создания заявки; до прихода имени остаётся название услуги. */
export function serviceRequestRowTitle(
  customerName: string | null | undefined,
  serviceTitle: string | null | undefined,
): string {
  const name = customerName?.trim() ?? "";
  if (name.length > 0) return name;
  const title = serviceTitle?.trim() ?? "";
  return title.length > 0 ? title : "Заявка";
}

function rowMetaPart(value: string | null | undefined, title: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0 || trimmed === title.trim()) return null;
  return trimmed;
}

/** Why: вторая строка — текст заявки. Если он уже заголовок, остаётся имя, чтобы строка не пустела. */
export function serviceRequestRowBody(input: {
  title: string;
  customerName: string | null | undefined;
  message: string | null | undefined;
}): string {
  return rowMetaPart(input.message, input.title) ?? rowMetaPart(input.customerName, input.title) ?? "";
}

export type RequestOpenedStamp = {
  day: string;
  month: string;
  time: string;
};

/** Why: слева в строке дата столбиком — число, короткий месяц и время, без «в». */
export function formatRequestOpenedStamp(value: string): RequestOpenedStamp | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = pick("day");
  const month = pick("month").replace(/\./g, "").toLocaleLowerCase("ru-RU");
  const hour = pick("hour");
  const minute = pick("minute");
  if (!day || !month || !hour || !minute) return null;

  return { day, month, time: `${hour}:${minute}` };
}

export function formatRequestCount(count: number): string {
  return `${count} ${pluralRu(count, ["заявка", "заявки", "заявок"])}`;
}

export function formatRequestOpenedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = pick("day");
  const month = pick("month");
  const hour = pick("hour");
  const minute = pick("minute");
  if (!day || !month || !hour || !minute) return "";

  return `${day} ${month} в ${hour}:${minute}`;
}
