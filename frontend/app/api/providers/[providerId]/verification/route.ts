import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

type Params = { params: Promise<{ providerId: string }> };

async function requireUser() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return null;
  return session.user.id;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const response = await fetchBackendAsUser(
      `/providers/${providerId}/verification`,
      userId,
    );
    const payload = await response.json().catch(() => ({ error: "Не удалось загрузить проверку" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error loading provider verification:", error);
    return NextResponse.json({ error: "Не удалось загрузить проверку" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const body = await request.json().catch(() => null);
    const response = await fetchBackendAsUser(
      `/providers/${providerId}/verification`,
      userId,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      },
    );
    const payload = await response.json().catch(() => ({ error: "Не удалось отправить заявку" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error submitting provider verification:", error);
    return NextResponse.json({ error: "Не удалось отправить заявку" }, { status: 500 });
  }
}
