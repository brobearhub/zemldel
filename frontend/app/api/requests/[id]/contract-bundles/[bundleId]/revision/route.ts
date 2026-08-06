import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; bundleId: string }> },
) {
  const { id, bundleId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await fetchBackendAsUser(
    `/requests/mine/${id}/contract-bundles/${bundleId}/revision`,
    session.user.id,
    {
      method: "POST",
      body: await request.text(),
      headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
    },
  );
  const payload = await response.json().catch(() => ({ error: "Failed to request revision" }));
  return NextResponse.json(payload, { status: response.status });
}

