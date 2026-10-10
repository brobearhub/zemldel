export type ReplyPreviewAuthor = "customer" | "provider";

export type ReplyPreviewLine = {
  author: ReplyPreviewAuthor;
  body: string;
};

const REPLY_PREVIEW_MAX = 300;

/** Одна строка превью: пробелы схлопнуты, длина как у бэкенда. */
export function formatReplyPreview(body: string): string | null {
  const singleLine = body.replace(/\s+/g, " ").trim();
  if (!singleLine) return null;
  return singleLine.length <= REPLY_PREVIEW_MAX ? singleLine : singleLine.slice(0, REPLY_PREVIEW_MAX);
}

function previewBody(value: string | null | undefined): string | null {
  if (value == null) return null;
  return formatReplyPreview(value);
}

/**
 * Why: пара читается сверху вниз по времени. Флаг «исполнитель написал позже»
 * уже посчитан на бэкенде, отдельные даты превью не нужны.
 */
export function orderReplyPreview(input: {
  customerMessage: string | null | undefined;
  providerMessage: string | null | undefined;
  providerSpokeLast: boolean;
}): ReplyPreviewLine[] {
  const customer = previewBody(input.customerMessage);
  const provider = previewBody(input.providerMessage);
  const lines: ReplyPreviewLine[] = [];
  if (input.providerSpokeLast) {
    if (customer) lines.push({ author: "customer", body: customer });
    if (provider) lines.push({ author: "provider", body: provider });
  } else {
    if (provider) lines.push({ author: "provider", body: provider });
    if (customer) lines.push({ author: "customer", body: customer });
  }
  return lines;
}

/**
 * Why: «Ждем ответ» — пара «на что ответили» и своя последняя реплика.
 * «Ответить» — только последнее сообщение собеседника, на которое нужно ответить.
 */
export function visibleReplyPreview(input: {
  lines: readonly ReplyPreviewLine[];
  waitingForReply: boolean;
  ownAuthor: ReplyPreviewAuthor;
}): ReplyPreviewLine[] {
  if (input.waitingForReply) return [...input.lines];
  const incoming = input.lines.filter((line) => line.author !== input.ownAuthor);
  return incoming.length > 0 ? incoming : [...input.lines];
}
