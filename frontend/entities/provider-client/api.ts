import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";

export async function writeClientData<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: object,
  idempotent = false,
): Promise<T> {
  const send = idempotent ? fetchIdempotentWrite : fetch;
  const response = await send(url, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(result?.message)
      ? result.message.join(". ")
      : result?.message;
    throw new Error(
      message ||
        result?.error ||
        "Не удалось сохранить изменения. Попробуйте ещё раз.",
    );
  }
  return result as T;
}
