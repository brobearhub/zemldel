import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackend, fetchBackendAsUser } from "@/shared/api/backend/server";

const uuid = "[a-fA-F0-9-]{36}";
const allowed = new RegExp(
  `^(?:|mine|moderation|address-suggestions|cadastral-location|${uuid}(?:/(?:action|review|favorite|conversation|media))?|media/${uuid})$`,
);
async function proxy(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const path = (await params).path?.join("/") ?? "";
  if (!allowed.test(path))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const method = request.method;
  if ((path === "address-suggestions" || path === "cadastral-location") && method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  const session = await getServerAuthSession();
  if (
    (method !== "GET" || path === "mine" || path === "moderation") &&
    !session?.user?.id
  )
    return NextResponse.json({ message: "Войдите в аккаунт" }, { status: 401 });
  try {
    const multipart = request.headers
      .get("content-type")
      ?.startsWith("multipart/form-data");
    const init: RequestInit = {
      method,
      ...(method !== "GET"
        ? multipart
          ? { body: await request.formData() }
          : {
              headers: { "Content-Type": "application/json" },
              body: await request.text(),
            }
        : {}),
    };
    const target = `/lands${path ? `/${path}` : ""}${new URL(request.url).search}`;
    const response = session?.user?.id
      ? await fetchBackendAsUser(target, session.user.id, init)
      : await fetchBackend(target, init);
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-type", "content-disposition"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { message: "Сервис временно недоступен. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
