import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestCustomerDto } from "@/entities/request";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { fetchCustomerWorkStages } from "@/entities/request/api/request-work-stages";
import { CustomerRequestConversationWorkspace } from "./CustomerRequestConversationWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({ useChatSocket: () => ({ socket: null }) }));
vi.mock("@/widgets/chat/ui/ServiceRequestChatPanel", () => ({ ServiceRequestChatPanel: () => null }));
vi.mock("@/entities/chat", () => ({
  fetchCustomerRequestConversations: vi.fn(async () => []),
  ensureCustomerRequestConversation: vi.fn(),
}));
vi.mock("@/entities/request/api/request-document-requests", () => ({ fetchCustomerRequestDocumentRequests: vi.fn(async () => []) }));
vi.mock("@/entities/request/api/request-remarks", () => ({ fetchCustomerRequestRemarks: vi.fn(async () => []) }));
vi.mock("@/entities/request/api/request-work-stages", () => ({ fetchCustomerWorkStages: vi.fn() }));
vi.mock("@/widgets/request-work-progress", () => ({
  RequestWorkProgress: ({ stages }: { stages: { title: string }[] }) =>
    <div data-testid="stages">{stages.map((s) => s.title).join(",")}</div>,
}));
vi.mock("./CustomerRequestDocumentsSection", () => ({ CustomerRequestDocumentsSection: () => null }));

const request = {
  id: "request-a", subjectType: "FREEFORM", status: "ACTIVE", providerId: "provider-a",
  lockedAt: "2026-11-01", message: "Тестовая задача", offers: [], selectedProviderIds: ["provider-a"],
  declinedProviderIds: [], cadastralNumbers: [], payments: [], deliverySubmissions: [], currentSubmission: null,
  totalAmountRubles: 12000, servicePriceRubles: null, priceProposal: null,
  remainingAmountRubles: 12000, paidAmountRubles: 0, contractAcceptedAt: "2026-11-01",
} as unknown as RequestCustomerDto;

describe("customer request sections follow live updates", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.stubGlobal("fetch", vi.fn(async (url) => new Response(JSON.stringify(String(url).endsWith("contract-bundles") ? [] : request))));
    vi.mocked(fetchCustomerWorkStages).mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a newly published stage even while the request remains ACTIVE", async () => {
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>); });
    expect(screen.getByTestId("stages")).toHaveTextContent("");
    vi.mocked(fetchCustomerWorkStages).mockResolvedValue([{ title: "Новый опубликованный этап" }] as never);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByTestId("stages")).toHaveTextContent("Новый опубликованный этап");
  });
});
