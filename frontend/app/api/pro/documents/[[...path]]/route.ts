import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";

async function proxy(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { path = [] } = await context.params;
  const route = path.join("/");
  const allowed =
    request.method === "GET"
      ? /^(?:|requests|request-ids|files\/[\w-]+\/download)$/
      : request.method === "POST"
        ? /^(?:files|folders)$/
        : /^(?:files|folders)\/[\w-]+$/;
  if (!allowed.test(route))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const hasBody = request.method === "POST" || request.method === "PATCH";
  const multipart = request.headers
    .get("content-type")
    ?.startsWith("multipart/form-data");
  const response = await fetchBackendAsUser(
    `/pro/documents${route ? `/${route}` : ""}`,
    session.user.id,
    {
      method: request.method,
      ...(hasBody
        ? {
            body: multipart ? await request.formData() : await request.text(),
            ...(multipart
              ? {}
              : { headers: { "Content-Type": "application/json" } }),
          }
        : {}),
    },
  );
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new NextResponse(response.body, { status: response.status, headers });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
