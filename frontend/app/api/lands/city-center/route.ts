import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const userId = (await getServerAuthSession())?.user?.id;
  if (!userId) {
    return Response.json(null, { status: 401, headers });
  }
  const id = new URL(request.url).searchParams.get("cityId") ?? "";
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) {
    return Response.json(null, { status: 400, headers });
  }
  try {
    const response = await fetchBackendAsUser(
      `/lands/city-center?cityId=${id}`,
      userId,
      { signal: request.signal },
    );
    if (!response.ok) return Response.json(null, { status: response.status, headers });
    const { point } = await response.json();
    return Response.json(point, { headers });
  } catch {
    return Response.json(null, { status: 503, headers });
  }
}
