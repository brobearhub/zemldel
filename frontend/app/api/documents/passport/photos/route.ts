import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  try {
    const response = await fetchBackendAsUser("/documents/passport/photos/mine", session.user.id, { cache: "no-store" });
    return json(await response.json(), response.status);
  } catch { return json({ error: "Не удалось загрузить список фотографий" }, 502); }
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  if (Number(request.headers.get("content-length")) > 10 * 1024 * 1024 + 64 * 1024) return json({ error: "Фото должно быть до 10 МБ" }, 413);
  try {
    const input = await request.formData();
    const file = input.get("file");
    const uploadId = input.get("uploadId");
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 || typeof uploadId !== "string") return json({ error: "Выберите фотографию до 10 МБ" }, 400);
    const body = new FormData();
    body.append("file", file);
    body.append("uploadId", uploadId);
    const response = await fetchBackendAsUser("/documents/passport/photos/mine", session.user.id, { method: "POST", body });
    return json(await response.json(), response.status);
  } catch { return json({ error: "Не удалось загрузить фотографию" }, 502); }
}
