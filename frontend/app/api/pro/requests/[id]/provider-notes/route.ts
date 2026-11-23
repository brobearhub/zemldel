import { proxyProviderJson } from "@/shared/api/backend/server/proxy-provider-json";

async function proxy(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyProviderJson(
    request,
    `/pro/requests/${encodeURIComponent(id)}/provider-notes`,
  );
}
export { proxy as GET, proxy as POST };
