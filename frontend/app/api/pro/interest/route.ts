import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  const response = await fetchBackendAsUser(
    `/pro/interest${new URL(request.url).search}`,
    session.user.id,
  );
  return NextResponse.json(await response.json(), {
    status: response.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
