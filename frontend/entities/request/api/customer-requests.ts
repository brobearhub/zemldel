export async function deleteCustomerRequest(requestId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/requests/${requestId}`, {
    method: "DELETE",
  });
  const payload = (await res.json().catch(() => null)) as { ok?: true; error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : "Не удалось удалить заявку",
    );
  }
  if (!payload || payload.ok !== true) {
    throw new Error("Не удалось удалить заявку");
  }
  return { ok: true };
}
