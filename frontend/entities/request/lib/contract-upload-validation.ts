const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function validateContractUploadFiles(document: File, signature?: File | null): string | null {
  if (!/\.(pdf|docx)$/i.test(document.name) && !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(document.type)) {
    return "Выберите договор в формате PDF или DOCX.";
  }
  if (signature && !/\.(sig|sgn|p7s)$/i.test(signature.name)) return "Выберите готовую подпись .sig, .sgn или .p7s.";
  if ([document, signature].some(file => file && file.size > MAX_FILE_SIZE)) return "Размер каждого файла не должен превышать 20 МБ.";
  return null;
}

export function contractUploadError(payload: unknown, status: number): string {
  if (status === 401) return "Сессия завершена. Войдите снова.";
  if (status === 403 || status === 404) return "Заявка недоступна. Возможно, у вас больше нет доступа.";
  if (status === 413) return "Размер каждого файла не должен превышать 20 МБ.";
  if (payload && typeof payload === "object") {
    const item = payload as { message?: unknown; error?: unknown };
    for (const value of [item.message, item.error]) {
      if (typeof value === "string" && /[а-яё]/i.test(value)) return value;
    }
  }
  return "Не удалось загрузить договор. Повторите попытку — выбранные файлы сохранены.";
}
