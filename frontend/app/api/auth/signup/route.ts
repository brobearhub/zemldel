import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

type AcceptedLegal = {
  terms?: unknown;
  privacy?: unknown;
  consent?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
      customerCityId?: unknown;
      acceptedLegal?: AcceptedLegal;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const customerCityId = typeof body.customerCityId === "string" ? body.customerCityId.trim() : "";
    const terms =
      typeof body.acceptedLegal?.terms === "string" ? body.acceptedLegal.terms.trim() : "";
    const privacy =
      typeof body.acceptedLegal?.privacy === "string" ? body.acceptedLegal.privacy.trim() : "";
    const consent =
      typeof body.acceptedLegal?.consent === "string" ? body.acceptedLegal.consent.trim() : "";

    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "password must be at least 6 chars" }, { status: 400 });
    }
    if (!customerCityId) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }
    if (!terms || !privacy || !consent) {
      return NextResponse.json(
        { error: "acceptedLegal versions (terms, privacy, consent) are required" },
        { status: 400 },
      );
    }

    const response = await fetchBackend("/auth/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name,
        customerCityId,
        acceptedLegal: { terms, privacy, consent },
      }),
    });
    const payload = await response.json().catch(() => ({ error: "Failed to sign up" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error signing up:", error);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
