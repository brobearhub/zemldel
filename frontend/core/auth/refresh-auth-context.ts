/**
 * Подмешивает свежий auth context в jwt.
 * Ошибка, отличная от «контекста нет», не стирает уже записанный токен:
 * getUserAuthContext сам превращает 401 в null, а сеть и 5xx бросает.
 */
export async function refreshAuthToken<T extends { sub?: unknown }>(
  token: T,
  load: (userId: string) => Promise<unknown>,
  assign: (token: T, user: unknown) => void,
): Promise<T> {
  if (typeof token.sub !== "string" || token.sub.length === 0) return token;

  try {
    const user = await load(token.sub);
    if (user) assign(token, user);
  } catch {
    // Временный сбой /auth/context оставляет прежний токен.
  }

  return token;
}
