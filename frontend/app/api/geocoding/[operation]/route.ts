import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

const methods = new Map([
  ["address-suggestions", "POST"],
  ["resolve-address", "POST"],
  ["city-center", "GET"],
  ["cadastral-location", "POST"],
]);
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

async function proxy(request: Request, { params }: { params: Promise<{ operation: string }> }) {
  const { operation } = await params;
  const method = methods.get(operation);
  if (!method) return new Response(null, { status: 404, headers });
  if (method !== request.method)
    return new Response(null, { status: 405, headers: { ...headers, Allow: method } });
  const userId = (await getServerAuthSession())?.user?.id;
  if (!userId) return Response.json({ message: "Войдите в аккаунт" }, { status: 401, headers });
  try {
    const query = method === "GET" ? new URL(request.url).search : "";
    const response = await fetchBackendAsUser(`/geocoding/${operation}${query}`, userId, {
      method,
      signal: request.signal,
      ...(method === "POST" && {
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
      }),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      { message: "Сервис геокодирования временно недоступен." },
      { status: 503, headers },
    );
  }
}

export { proxy as GET, proxy as POST };
