import { NextResponse } from "next/server";
import { isPublicCdnHost } from "@/shared/lib/public-asset-src";

const TIMEOUT_MS = 15_000;

type Params = { params: Promise<{ host: string; path: string[] }> };

function isSafeSegment(segment: string): boolean {
  return segment.length > 0 && segment !== "." && segment !== ".." && !segment.includes("\\") && !segment.includes("/");
}

/**
 * Dev-only прокси публичных картинок.
 * Why: браузер на localhost получает 407 с CDN, сервер Next тот же файл читает нормально.
 */
export async function GET(request: Request, { params }: Params) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { host, path } = await params;

  if (!isPublicCdnHost(host) || path.length === 0 || path.some((segment) => !isSafeSegment(segment))) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "x-request-id": requestId } });
  }

  const target = new URL(`https://${host}/${path.map((segment) => encodeURIComponent(segment)).join("/")}`);
  target.search = new URL(request.url).search;

  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "x-request-id": requestId },
      cache: "no-store",
    });
    console.info(JSON.stringify({ msg: "dev-cdn proxy", requestId, host, status: upstream.status }));

    const headers = new Headers();
    headers.set("x-request-id", requestId);
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    headers.set("cache-control", upstream.headers.get("cache-control") ?? "public, max-age=3600");

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ msg: "dev-cdn proxy failed", requestId, host, error: String(error) }));
    return NextResponse.json(
      { error: "CDN unavailable" },
      { status: 502, headers: { "x-request-id": requestId } },
    );
  }
}
