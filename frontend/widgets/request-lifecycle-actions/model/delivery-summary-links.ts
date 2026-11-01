export type DeliverySummaryPart =
  { type: "text"; value: string } | { type: "link"; value: string };

const HTTP_URL = /https?:\/\/[^\s<>"']+/g;

export function splitSafeSummaryLinks(summary: string): DeliverySummaryPart[] {
  const parts: DeliverySummaryPart[] = [];
  let offset = 0;

  for (const match of summary.matchAll(HTTP_URL)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > offset)
      parts.push({ type: "text", value: summary.slice(offset, index) });
    parts.push({ type: "link", value: url });
    offset = index + url.length;
  }

  if (offset < summary.length)
    parts.push({ type: "text", value: summary.slice(offset) });
  return parts;
}
