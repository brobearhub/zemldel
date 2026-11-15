import { NextResponse } from "next/server";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("visibleToCustomer" in body) ||
    typeof body.visibleToCustomer !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Некорректная настройка видимости файла." },
      { status: 422 },
    );
  }
  const response = await fetchBackendAsUser(
    `/pro/requests/${encodeURIComponent(id)}/provider-misc/${encodeURIComponent(fileId)}`,
    session.user.id,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToCustomer: body.visibleToCustomer }),
    },
  );
  const payload = await response
    .json()
    .catch(() => ({ error: "Не удалось изменить видимость файла." }));
  return NextResponse.json(payload, { status: response.status });
}
