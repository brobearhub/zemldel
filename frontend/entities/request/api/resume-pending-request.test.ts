import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPendingRequestDraft, savePendingRequestDraft } from "../pending-request";
import { PendingRequestAuthRequiredError, resumePendingRequest } from "./resume-pending-request";

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;

describe("resume saved guest request", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("submits once across remounts and retains the created ID if chat setup fails", async () => {
    const draft = savePendingRequestDraft({
      kind: "SERVICE", serviceId: "service-1", subjectTitle: "Межевание",
      customerName: null, customerEmail: "test@example.com", customerPhone: null,
      message: "Нужно межевание", requestCityId: null, cadastralNumbers: ["66:41:0000000:001"],
    });
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }))
      .mockRejectedValueOnce(new Error("chat unavailable"));
    const first = resumePendingRequest(draft, fetcher);
    const second = resumePendingRequest(readPendingRequestDraft()!, fetcher);
    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
    finish(json({ id: "request-1" }));
    await expect(first).resolves.toEqual({ id: "request-1" });
    expect(readPendingRequestDraft()?.createdRequestId).toBe("request-1");
    await expect(resumePendingRequest(readPendingRequestDraft()!, fetcher)).resolves.toEqual({ id: "request-1" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps the task, work city and cadastral numbers when the session expires", async () => {
    const draft = savePendingRequestDraft({
      kind: "FREEFORM", message: "Оформить участок", requestCityId: "city-1",
      requestCity: { id: "city-1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская обл.", displayName: "Екатеринбург, Свердловская обл." },
      cadastralNumbers: ["66:41:0000000:001"],
    });
    const fetcher = vi.fn().mockResolvedValue(json({ error: "Unauthorized" }, 401));
    await expect(resumePendingRequest(draft, fetcher)).rejects.toBeInstanceOf(PendingRequestAuthRequiredError);
    expect(readPendingRequestDraft()).toMatchObject({
      message: draft.message, requestCityId: "city-1", requestCity: draft.requestCity,
      cadastralNumbers: draft.cadastralNumbers, state: "pending",
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ requestCityId: "city-1", cadastralNumbers: draft.cadastralNumbers });
  });

  it("does not attach an earlier response to a newly edited draft", async () => {
    const first = savePendingRequestDraft({ kind: "FREEFORM", message: "Первая задача", requestCityId: "city-1", cadastralNumbers: [] });
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const pending = resumePendingRequest(first, fetcher);
    const edited = savePendingRequestDraft({ kind: "FREEFORM", message: "Изменённая задача", requestCityId: "city-1", cadastralNumbers: [] });
    finish(json({ id: "old-request" }));
    await pending;
    expect(readPendingRequestDraft()).toMatchObject({ draftId: edited.draftId, message: "Изменённая задача" });
    expect(readPendingRequestDraft()?.createdRequestId).toBeNull();
  });
});
