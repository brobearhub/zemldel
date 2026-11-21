export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      jsApiKey: process.env.YANDEX_MAPS_JS_API_KEY?.trim() || "",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
