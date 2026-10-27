import { fetchBackendJson } from "@/shared/api/backend/server";
import { buildLlmsTxt, isLlmsTxtPublic, type LlmsCategory } from "@/shared/lib/llms-txt";
import { siteOrigin } from "@/shared/lib/site-origin";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = siteOrigin();
  if (!isLlmsTxtPublic(origin)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  let categories: LlmsCategory[] = [];
  try {
    categories = await fetchBackendJson<LlmsCategory[]>("/service-categories");
  } catch {
    categories = [];
  }

  return new Response(buildLlmsTxt(origin, categories), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
