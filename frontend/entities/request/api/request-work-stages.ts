import type { WorkStageDto, WorkStageStatusesDto } from "../dto/work-stage.dto";

async function safeJson(res: Response) {
  return (await res.json().catch(() => null)) as unknown;
}

function extractError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  // Why: Nest отдаёт message с текстом, а error — общее "Bad Request".
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    const joined = message.join("; ").trim();
    if (joined.length > 0) return joined;
  }
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim().length > 0) return error;
  return fallback;
}

export async function fetchProWorkStages(requestId: string): Promise<WorkStageDto[]> {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить этапы"));
  return Array.isArray(payload) ? (payload as WorkStageDto[]) : [];
}

export async function createProWorkStage(
  requestId: string,
  input: { title: string; description?: string; statusKey: string }
): Promise<WorkStageDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось создать этап"));
  return payload as WorkStageDto;
}

export async function updateProWorkStage(
  requestId: string,
  stageId: string,
  input: { title?: string; description?: string; statusKey?: string; sortOrder?: number }
): Promise<WorkStageDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось обновить этап"));
  return payload as WorkStageDto;
}

export async function publishProWorkStage(requestId: string, stageId: string): Promise<WorkStageDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}/publish`, {
    method: "POST",
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось опубликовать этап"));
  return payload as WorkStageDto;
}

export async function updateProWorkStageStatus(
  requestId: string,
  stageId: string,
  statusKey: string
): Promise<WorkStageDto> {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ statusKey }),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось сменить статус"));
  return payload as WorkStageDto;
}

export async function deleteProWorkStage(requestId: string, stageId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}`, { method: "DELETE" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось удалить этап"));
  return { ok: true };
}

export async function uploadProWorkStageFile(requestId: string, stageId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}/files`, {
    method: "POST",
    body: form,
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить файл"));
  return payload;
}

export async function deleteProWorkStageFile(requestId: string, stageId: string, fileId: string) {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}/files/${fileId}`, {
    method: "DELETE",
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось удалить файл"));
  return { ok: true as const };
}

export async function createProWorkStageDocSlot(requestId: string, stageId: string, title: string) {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}/doc-slots`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось создать запрос документа"));
  return payload;
}

export async function deleteProWorkStageDocSlot(requestId: string, stageId: string, slotId: string) {
  const res = await fetch(`/api/pro/requests/${requestId}/work-stages/${stageId}/doc-slots/${slotId}`, {
    method: "DELETE",
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось удалить запрос документа"));
  return { ok: true as const };
}

export async function fetchCustomerWorkStages(requestId: string): Promise<WorkStageDto[]> {
  const res = await fetch(`/api/requests/${requestId}/work-stages`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить этапы"));
  return Array.isArray(payload) ? (payload as WorkStageDto[]) : [];
}

export async function uploadCustomerWorkStageDocSlot(
  requestId: string,
  stageId: string,
  slotId: string,
  file: File
) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/requests/${requestId}/work-stages/${stageId}/doc-slots/${slotId}/upload`, {
    method: "POST",
    body: form,
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить документ"));
  return { ok: true as const };
}

export async function fetchWorkStageStatuses(): Promise<WorkStageStatusesDto> {
  const res = await fetch(`/api/pro/settings/work-stage-statuses`, { cache: "no-store" });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось загрузить статусы"));
  const data = payload as Partial<WorkStageStatusesDto>;
  return {
    system: Array.isArray(data.system) ? data.system : [],
    custom: Array.isArray(data.custom) ? data.custom : [],
  };
}

export async function saveCustomWorkStageStatuses(
  custom: { key: string; label: string }[]
): Promise<WorkStageStatusesDto> {
  const res = await fetch(`/api/pro/settings/work-stage-statuses`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ custom }),
  });
  const payload = await safeJson(res);
  if (!res.ok) throw new Error(extractError(payload, "Не удалось сохранить статусы"));
  return payload as WorkStageStatusesDto;
}
