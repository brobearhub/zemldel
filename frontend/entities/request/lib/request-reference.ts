const createdAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatRequestNumber(request: {
  id: string;
  number?: number | null;
}) {
  return request.number != null
    ? `№ ${request.number}`
    : `ID ${request.id.slice(0, 8).toUpperCase()}`;
}

export function formatRequestCreatedAt(createdAt?: string | null) {
  const date = createdAt ? new Date(createdAt) : null;
  return date && !Number.isNaN(date.getTime())
    ? createdAtFormatter.format(date)
    : null;
}

export function formatRequestReference(request: {
  id: string;
  number?: number | null;
  createdAt?: string | null;
}) {
  const createdAt = formatRequestCreatedAt(request.createdAt);
  return `Заявка ${formatRequestNumber(request)}${createdAt ? ` · ${createdAt}` : ""}`;
}
