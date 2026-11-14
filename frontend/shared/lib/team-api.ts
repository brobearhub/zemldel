export async function teamApi<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new Error("Не удалось связаться с сервером. Попробуйте ещё раз.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload?.message === "string" ? payload.message : payload?.error;
    throw new Error(
      typeof message === "string" && /[а-яё]/i.test(message)
        ? message
        : "Не удалось выполнить запрос. Попробуйте ещё раз.",
    );
  }
  return payload as T;
}
