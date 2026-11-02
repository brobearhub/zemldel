import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useServiceAskQuestion } from "./useServiceAskQuestion";
import { ServiceRequestAuthRequiredError } from "../api/service-request-lead.api";
import { readPendingRequestDraft } from "@/entities/request";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

const api = {
  createServiceRequest: vi.fn(),
  ensureRequestConversation: vi.fn(),
  postConversationMessage: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/create-service-request-lead/api/service-request-lead.api", async (importOriginal: <T>() => Promise<T>) => ({
  ...await importOriginal<typeof import("../api/service-request-lead.api")>(),
  createServiceRequest: (...args: unknown[]) => api.createServiceRequest(...args),
  ensureRequestConversation: (...args: unknown[]) => api.ensureRequestConversation(...args),
  postConversationMessage: (...args: unknown[]) => api.postConversationMessage(...args),
}));

describe("useServiceAskQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("saves the SERVICE question and returns to sign-in after session expiry", async () => {
    api.createServiceRequest.mockRejectedValue(new ServiceRequestAuthRequiredError("expired"));
    const { result } = renderHook(() => useServiceAskQuestion({ serviceId: "s1", serviceTitle: "Межевание" }));
    await act(async () => {
      await result.current.submit({ questionText: "Можно завтра?", cadastralNumbers: ["66:41:0000000:001"] });
    });
    expect(readPendingRequestDraft()).toMatchObject({ kind: "SERVICE", serviceId: "s1", message: "Можно завтра?", cadastralNumbers: ["66:41:0000000:001"] });
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining("/signin?intent=service-request&account=customer"));
  });

  it("всегда создаёт чат для SERVICE-заявки, даже при пустом вопросе", async () => {
    api.createServiceRequest.mockResolvedValue({ id: "r1" });
    api.ensureRequestConversation.mockResolvedValue({ conversationId: "c1" });
    api.postConversationMessage.mockResolvedValue({});

    const { result } = renderHook(() => useServiceAskQuestion({ serviceId: "s1" }));

    await act(async () => {
      await result.current.submit({ questionText: "   ", cadastralNumbers: [] });
    });

    expect(api.createServiceRequest).toHaveBeenCalledWith({
      serviceId: "s1",
      message: null,
      cadastralNumbers: [],
    });
    expect(api.ensureRequestConversation).toHaveBeenCalledWith({ serviceRequestId: "r1" });
    expect(api.postConversationMessage).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/profile/requests/r1");
    expect(result.current.error).toBeNull();
  });

  it("отправляет сообщение в чат при непустом вопросе", async () => {
    api.createServiceRequest.mockResolvedValue({ id: "r2" });
    api.ensureRequestConversation.mockResolvedValue({ conversationId: "c2" });
    api.postConversationMessage.mockResolvedValue({});

    const { result } = renderHook(() => useServiceAskQuestion({ serviceId: "s1" }));

    await act(async () => {
      await result.current.submit({ questionText: "Можно завтра?", cadastralNumbers: ["50:12:0000000:1"] });
    });

    expect(api.ensureRequestConversation).toHaveBeenCalledWith({ serviceRequestId: "r2" });
    expect(api.postConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "c2",
        body: "Можно завтра?",
        clientMessageId: expect.any(String),
      })
    );
    expect(result.current.error).toBeNull();
  });

  it("показывает безопасную ошибку, если чат не удалось открыть", async () => {
    api.createServiceRequest.mockResolvedValue({ id: "r3" });
    api.ensureRequestConversation.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useServiceAskQuestion({ serviceId: "s1" }));

    await act(async () => {
      await result.current.submit({ questionText: "", cadastralNumbers: [] });
    });

    expect(result.current.error).toBe(
      "Заявка создана, но открыть чат не удалось. Откройте заявку в профиле и попробуйте снова."
    );
    expect(router.push).not.toHaveBeenCalledWith("/profile/requests/r3");
  });
});
