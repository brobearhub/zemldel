import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { fetchCustomerRequestConversations } from "@/entities/chat";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestCustomerDto } from "@/entities/request";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { fetchCustomerRequestDocumentRequests } from "@/entities/request/api/request-document-requests";
import { fetchCustomerWorkStages } from "@/entities/request/api/request-work-stages";
import { CustomerRequestConversationWorkspace } from "./CustomerRequestConversationWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({ useChatSocket: () => ({ socket: null }) }));
vi.mock("@/widgets/chat/ui/ServiceRequestChatPanel", () => ({ ServiceRequestChatPanel: ({conversationId}: {conversationId: string}) => <div data-testid="active-chat">{conversationId}</div> }));
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
    vi.mocked(fetchCustomerRequestDocumentRequests).mockResolvedValue([]);
    vi.mocked(fetchCustomerRequestConversations).mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a newly published stage even while the request remains ACTIVE", async () => {
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>); });
    expect(screen.getByTestId("stages")).toHaveTextContent("");
    vi.mocked(fetchCustomerWorkStages).mockResolvedValue([{ title: "Новый опубликованный этап" }] as never);
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "request-a" } })); });
    expect(screen.getByTestId("stages")).toHaveTextContent("Новый опубликованный этап");
  });

  it("keeps a manually opened archive across events/focus updates but follows a changed provider", async () => {
    vi.mocked(fetchCustomerRequestConversations).mockResolvedValue([
      {conversationId: "chat-a", providerId: "provider-a", providerName: "Company A"},
      {conversationId: "chat-b", providerId: "provider-b", providerName: "Company B"},
    ] as never);
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>); });
    expect(screen.getByTestId("active-chat")).toHaveTextContent("chat-a");
    fireEvent.click(screen.getByRole("button", { name: /Company B/ }));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    await act(async () => {window.dispatchEvent(new Event("focus"));});
    expect(screen.getByTestId("active-chat")).toHaveTextContent("chat-b");
    fireEvent.click(screen.getByRole("button", { name: /Company A.*Исполнитель/ }));
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(String(url).endsWith("contract-bundles") ? [] : {...request, providerId: "provider-b", selectedProviderIds: ["provider-b"]})));
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "request-a" } })); });
    expect(screen.getByTestId("active-chat")).toHaveTextContent("chat-b");
  });
  it.each([401,403,404])('clears customer details on an access failure %s', async status => {
    await act(async () => {render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>);});
    vi.mocked(fetch).mockImplementation(async () => new Response('{}', {status}));
    await act(async () => {window.dispatchEvent(new Event('request:sync'));});
    expect(screen.getByRole('heading', {name: status===401 ? 'Сессия завершена' : 'Заявка недоступна'})).toBeInTheDocument();
    expect(screen.queryByText(request.message!)).not.toBeInTheDocument();
    expect(screen.queryByTestId('stages')).not.toBeInTheDocument();
  });

  it('preserves the customer workspace on a transient server failure', async () => {
    await act(async () => {render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>);});
    vi.mocked(fetch).mockImplementation(async () => new Response('{}', {status:503}));
    await act(async () => {window.dispatchEvent(new Event('focus'));});
    expect(screen.getByTestId('stages')).toBeInTheDocument();
    expect(screen.queryByText('Заявка недоступна')).not.toBeInTheDocument();
  });

  it('blocks an already open confirmation when a new document is requested', async () => {
    const draft={...request,status:'DISCUSSING',contractAcceptedAt:null} as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async url => new Response(JSON.stringify(
      String(url).includes('/legal-docs/') ? {version:'v1'} : String(url).endsWith('contract-bundles') ? [{status:'APPROVED'}] : draft
    )));
    await act(async () => {render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={draft} justCreated /></ConfirmProvider>);});
    expect(screen.queryByText(/Заявка опубликована. Подходящие исполнители/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Заключить договор'}));
    await act(async () => {});
    fireEvent.click(screen.getByRole('checkbox',{name:/Я согласен/}));
    expect(screen.getByRole('button',{name:'Подтвердить заключение'})).toBeEnabled();
    vi.mocked(fetchCustomerRequestDocumentRequests).mockResolvedValue([{id:'new-document',status:'REQUESTED'}] as never);
    await act(async () => {window.dispatchEvent(new CustomEvent('request:changed',{detail:{requestId:request.id}}));});
    expect(screen.getByRole('button',{name:'Подтвердить заключение'})).toBeDisabled();
    expect(screen.getByText('Исполнитель запросил документы. Загрузите их перед заключением договора.')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Загрузить документы'})).toBeEnabled();
    expect(vi.mocked(fetch).mock.calls.some(([url, options]) => String(url).includes('accept-contract') && options?.method==='POST')).toBe(false);
  });

});
