import { NextResponse } from "next/server";
import { fetchBackend, fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    const url = new URL(request.url);
    const qs = new URLSearchParams();
    const cityId = url.searchParams.get("cityId");
    const providerId = url.searchParams.get("providerId");
    const scope = url.searchParams.get("scope");
    if (providerId) qs.set("providerId", providerId);
    else if (cityId) qs.set("cityId", cityId);
    if (scope === "user" || scope === "provider") qs.set("scope", scope);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const response = session?.user?.id
      ? await fetchBackendAsUser(`/stories${suffix}`, session.user.id)
      : await fetchBackend(`/stories${suffix}`);
    const payload = await response.json().catch(() => ({ error: "Failed to fetch stories" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const response = await fetchBackendAsUser("/stories", session.user.id, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({ error: "Failed to create story" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error creating story:", error);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
