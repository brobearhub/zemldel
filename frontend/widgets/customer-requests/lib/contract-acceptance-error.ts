export function extractAcceptContractError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Не удалось заключить договор";
  const record = payload as { error?: unknown; message?: unknown };
  // Nest error is an HTTP label; the actionable reason is in message.
  const raw = typeof record.message === "string" ? record.message
    : Array.isArray(record.message) ? record.message.filter(v => typeof v === "string").join(" ")
      : typeof record.error === "string" ? record.error : "";
  if (/requested documents/i.test(raw)) return "Загрузите все запрошенные документы, затем вернитесь к заключению договора.";
  if (/all contract bundles must be approved/i.test(raw)) return "Одобрите все пакеты договора.";
  if (/approved contract bundle/i.test(raw)) return "Нужен одобренный пакет договора. Файл подписи необязателен.";
  if (/price must be agreed/i.test(raw)) return "Сначала согласуйте цену с исполнителем.";
  if (/[а-яё]/i.test(raw)) return raw;
  return "Условия заявки изменились. Проверьте документы и согласованную цену, затем повторите попытку.";
}
