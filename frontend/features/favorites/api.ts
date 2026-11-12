export async function favoritesJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : (data.error ?? "Не удалось выполнить действие"),
    );
  return data as T;
}
