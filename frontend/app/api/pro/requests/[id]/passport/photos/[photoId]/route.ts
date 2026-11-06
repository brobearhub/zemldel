import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers });
type Context = { params: Promise<{ id: string; photoId: string }> };

export async function GET(_: Request, { params }: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  try {
    const { id, photoId } = await params;
    const response = await fetchBackendAsUser(`/pro/requests/${encodeURIComponent(id)}/passport/photos/${encodeURIComponent(photoId)}`, session.user.id, { cache: "no-store" });
    if (!response.ok) return json({ error: "Фотография недоступна" }, response.status);
    const mime = response.headers.get("content-type")?.split(";")[0];
    if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return json({ error: "Некорректный формат фотографии" }, 502);
    return new Response(response.body, { headers: { ...headers, "Content-Type": mime, "Content-Disposition": "inline; filename=passport-photo", "X-Content-Type-Options": "nosniff" } });
  } catch { return json({ error: "Не удалось прочитать фотографию" }, 502); }
}
