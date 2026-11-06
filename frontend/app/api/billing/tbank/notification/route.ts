import { NextRequest } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

// Public endpoint: bank signature is verified by Nest, never by a browser session.
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body.length > 32768)
      return new Response("Payload too large", { status: 413 });
    JSON.parse(body);
    const response = await fetchBackend("/billing/tbank/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const result = await response.text();
    if (response.status === 200 && result === "OK")
      return new Response("OK", {
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    return new Response("Notification rejected", {
      status: response.ok ? 502 : response.status,
    });
  } catch {
    return new Response("Notification unavailable", { status: 503 });
  }
}
