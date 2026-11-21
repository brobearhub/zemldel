import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { fetchCustomerRequestConversations } from "@/entities/chat";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRequestCreatedAt, type RequestCustomerDto } from "@/entities/request";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { fetchCustomerRequestDocumentRequests } from "@/entities/request/api/request-document-requests";
import { fetchCustomerWorkStages } from "@/entities/request/api/request-work-stages";
import * as financeRunner from "../model/latest-finance-request";
import { CustomerRequestConversationWorkspace } from "./CustomerRequestConversationWorkspace";

vi.mock("@mui/material/useMediaQuery", () => ({ default: () => false }));
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
vi.mock("./CustomerRequestDocumentsSection", () => ({
  CustomerRequestDocumentsSection: ({ open, providerFiles, providerFilesError, onRetryProviderFiles }: {
    open: boolean;
    providerFiles: { originalName: string }[];
    providerFilesError: string | null;
    onRetryProviderFiles: () => void;
  }) => open ? (
    <div data-testid="provider-files">
      {providerFiles.map(file => file.originalName).join(",")}
      {providerFilesError ? <button onClick={onRetryProviderFiles}>{providerFilesError}</button> : null}
    </div>
  ) : null,
}));

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
    vi.stubGlobal("fetch", vi.fn(async (url) => new Response(JSON.stringify(/contract-bundles$|provider-misc$/.test(String(url)) ? [] : request))));
    vi.mocked(fetchCustomerWorkStages).mockResolvedValue([]);
    vi.mocked(fetchCustomerRequestDocumentRequests).mockResolvedValue([]);
    vi.mocked(fetchCustomerRequestConversations).mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows the request number separately from the creation date without a status chip", async () => {
    const numbered = {
      ...request,
      number: 46,
      createdAt: "2026-11-17T06:09:00.000Z",
      subjectType: "SERVICE",
      serviceTitle: "Межевание",
      status: "NEW",
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : numbered
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={numbered} /></ConfirmProvider>);
    });
    expect(screen.getByText("Заявка № 46")).toBeVisible();
    expect(screen.getByText(formatRequestCreatedAt(numbered.createdAt)!)).toBeVisible();
    expect(screen.queryByText(/Заявка № 46 ·/)).not.toBeInTheDocument();
    expect(Array.from(document.querySelectorAll(".MuiChip-label"), (chip) => chip.textContent)).not.toContain("Новая");
  });

  it.each(["timeout", "close"])("dismisses the reply notice by %s", async (method) => {
    const pending = {
      ...request,
      subjectType: "SERVICE",
      serviceTitle: "Межевание",
      status: "NEW",
      awaitingProviderReply: true,
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : pending
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={pending} justCreated /></ConfirmProvider>);
    });
    const alert = screen.getByText("Сообщение отправлено. Ждём ответа исполнителя.").closest<HTMLElement>('[role="alert"]')!;
    expect(alert.compareDocumentPosition(screen.getByRole("heading", { name: "Межевание" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (method === "timeout") {
      await act(() => vi.advanceTimersByTimeAsync(4999));
      expect(alert).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(1));
    } else {
      fireEvent.click(within(alert).getByRole("button", { name: /close|закрыть/i }));
    }
    expect(alert).not.toBeInTheDocument();
  });

  it("does not show the reply notice when reopening an existing request", async () => {
    const pending = {
      ...request,
      subjectType: "SERVICE",
      status: "NEW",
      awaitingProviderReply: true,
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : pending
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={pending} /></ConfirmProvider>);
    });
    expect(screen.queryByText("Сообщение отправлено. Ждём ответа исполнителя.")).not.toBeInTheDocument();
  });

  it("shows the service title once when the customer did not write a message", async () => {
    const serviceRequest = {
      ...request,
      subjectType: "SERVICE",
      serviceTitle: "Кадастровые работы",
      message: null,
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : serviceRequest
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={serviceRequest} /></ConfirmProvider>);
    });
    expect(screen.getAllByText("Кадастровые работы").filter((element) =>
      getComputedStyle(element).display !== "none",
    )).toHaveLength(1);
  });

  it("opens the full estimate in place of the progress and restores it on close", async () => {
    const withExpenses = {
      ...request,
      payments: [{ id: "expense", type: "OTHER", amountRubles: 8100, comment: "Расходы", paidAt: null, createdAt: "2026-11-14", createdBySide: "PROVIDER" }],
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : withExpenses
    )));
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={withExpenses} /></ConfirmProvider>); });
    expect(screen.queryByText(/Всего:/)).not.toBeInTheDocument();
    const progress = screen.getByText("Обсуждение");
    expect(progress).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /20\s*100\s*₽/ }));
    const panel = screen.getByRole("dialog", { name: "Цена и оплата" });
    expect(within(panel).getByRole("region", { name: "Итог по заявке" })).toHaveTextContent("20 100 ₽");
    expect(progress).not.toBeVisible();
    fireEvent.click(within(panel).getByRole("button", { name: "Закрыть" }));
    expect(progress).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides reference-price details in the request header", async () => {
    const pricedRequest = {
      ...request,
      totalAmountRubles: 15000,
      servicePriceRubles: 12000,
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : pricedRequest
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={pricedRequest} /></ConfirmProvider>);
    });
    expect(screen.queryByText(/Цена работ: 15\s*000\s*₽/)).not.toBeInTheDocument();
    expect(screen.queryByText("Отличается от справочной цены услуги")).not.toBeInTheDocument();
    expect(screen.queryByText(/Справочная цена услуги:/)).not.toBeInTheDocument();
  });

  it("shows the preliminary service price in the payment button", async () => {
    const pricedRequest = {
      ...request,
      totalAmountRubles: null,
      servicePriceRubles: 12000,
    } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : pricedRequest
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={pricedRequest} /></ConfirmProvider>);
    });
    expect(screen.queryByText(/Предварительная цена: 12\s*000\s*₽/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Цена и оплата: 12\s*000\s*₽/ })).toBeVisible();
  });

  it("updates the total button when work price and expenses change", async () => {
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>); });
    expect(screen.getByRole("button", { name: /12\s*000\s*₽/ })).toBeVisible();
    const updated = {
      ...request,
      totalAmountRubles: 15000,
      payments: [{ id: "expense", type: "OTHER", amountRubles: 3000, comment: "Расход", paidAt: null, createdAt: "2026-11-14", createdBySide: "PROVIDER" }],
    };
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : updated
    )));
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: request.id } })); });
    expect(screen.getByRole("button", { name: /18\s*000\s*₽/ })).toBeVisible();
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : { ...updated, totalAmountRubles: null }
    )));
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: request.id } })); });
    expect(screen.getByRole("button", { name: "Цена и оплата: Сумма" })).toHaveTextContent("Сумма");
  });

  it("refreshes additional provider files after upload and deletion events", async () => {
    let files: { originalName: string }[] = [];
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      String(url).endsWith("provider-misc") ? files : String(url).endsWith("contract-bundles") ? [] : request
    )));
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>); });
    expect(screen.getByTestId("provider-files")).toHaveTextContent("");
    files = [{ originalName: "Дополнительный документ.docx" }];
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: request.id } })); });
    expect(screen.getByTestId("provider-files")).toHaveTextContent("Дополнительный документ.docx");
    files = [];
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: request.id } })); });
    expect(screen.getByTestId("provider-files")).toBeEmptyDOMElement();
  });

  it("keeps loaded provider files on a temporary error and retries from the documents block", async () => {
    let failing = false;
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).endsWith("provider-misc")
        ? new Response(JSON.stringify(failing ? {} : [{ originalName: "План.pdf" }]), { status: failing ? 503 : 200 })
        : new Response(JSON.stringify(String(url).endsWith("contract-bundles") ? [] : request))
    );
    await act(async () => { render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={request} /></ConfirmProvider>); });
    expect(screen.getByTestId("provider-files")).toHaveTextContent("План.pdf");
    failing = true;
    await act(async () => { window.dispatchEvent(new Event("request:sync")); });
    expect(screen.getByTestId("provider-files")).toHaveTextContent("План.pdf");
    const retry = screen.getByRole("button", { name: "Не удалось загрузить документы исполнителя." });
    failing = false;
    await act(async () => { fireEvent.click(retry); });
    expect(screen.queryByRole("button", { name: "Не удалось загрузить документы исполнителя." })).not.toBeInTheDocument();
    expect(screen.getByTestId("provider-files")).toHaveTextContent("План.pdf");
  });

  it("shows the provider’s published stages before a contract and keeps a direct chat for a private freeform request", async () => {
    const privateRequest = { ...request, status: "DISCUSSING", providerWorkStatus: "IN_PROGRESS", contractAcceptedAt: null } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      /contract-bundles$|provider-misc$/.test(String(url)) ? [] : privateRequest,
    )));
    vi.mocked(fetchCustomerWorkStages).mockResolvedValue([{ title: "Обмер участка" }] as never);
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={privateRequest} /></ConfirmProvider>);
    });
    expect(screen.getByTestId("stages")).toHaveTextContent("Обмер участка");
    expect(screen.getByRole("button", { name: "Начать чат" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Отменить выбор исполнителя" })).not.toBeInTheDocument();
  });

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

  it("allows contract acceptance for a new service request with approved documents", async () => {
    const draft = { ...request, subjectType: "SERVICE", status: "NEW", contractAcceptedAt: null } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify(
      String(url).includes("/legal-docs/") ? { version: "v1" } : String(url).endsWith("contract-bundles") ? [{ status: "APPROVED" }] : draft
    )));
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={draft} /></ConfirmProvider>);
    });
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("checkbox", { name: /Я согласен/ }));
    expect(screen.getByRole("button", { name: "Подтвердить заключение" })).toBeEnabled();
  });

  it("requires a fresh confirmation when the displayed work price changes", async () => {
    const draft = { ...request, status: "DISCUSSING", contractAcceptedAt: null } as RequestCustomerDto;
    let current = draft;
    const submissions: unknown[] = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.includes("/legal-docs/")) return new Response(JSON.stringify({ version: "v1" }));
      if (path.endsWith("contract-bundles")) return new Response(JSON.stringify([{ status: "APPROVED" }]));
      if (path.endsWith("provider-misc")) return new Response("[]");
      if (path.endsWith("accept-contract") && init?.method === "POST") {
        submissions.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ ...current, status: "ACTIVE", contractAcceptedAt: "2026-11-16" }));
      }
      return new Response(JSON.stringify(current));
    });
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={draft} /></ConfirmProvider>);
    });
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    await act(async () => {});
    const checkbox = screen.getByRole("checkbox", { name: /Я согласен/ });
    fireEvent.click(checkbox);
    expect(screen.getByRole("button", { name: "Подтвердить заключение" })).toBeEnabled();

    current = { ...draft, totalAmountRubles: 15000, remainingAmountRubles: 15000 };
    await act(async () => {
      window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: request.id } }));
    });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Подтвердить заключение" })).toBeDisabled();
    expect(screen.getByText(/Цена работ изменилась\. Проверьте новую сумму/)).toBeVisible();
    expect(within(screen.getByRole("dialog")).getByText(/Цена: 15\s*000\s*₽/)).toBeVisible();

    fireEvent.click(checkbox);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Подтвердить заключение" }));
    });
    expect(submissions).toEqual([{ termsVersion: "v1", expectedTotalAmountRubles: 15000 }]);
  });

  it("refreshes the price and requires confirmation again after a price conflict", async () => {
    const draft = { ...request, status: "DISCUSSING", contractAcceptedAt: null } as RequestCustomerDto;
    let current = draft;
    const submissions: Array<{ termsVersion: string; expectedTotalAmountRubles: number | null }> = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.includes("/legal-docs/")) return new Response(JSON.stringify({ version: "v1" }));
      if (path.endsWith("contract-bundles")) return new Response(JSON.stringify([{ status: "APPROVED" }]));
      if (path.endsWith("provider-misc")) return new Response("[]");
      if (path.endsWith("/payments")) {
        current = { ...draft, totalAmountRubles: 15000 };
        return new Response(JSON.stringify(current));
      }
      if (path.endsWith("accept-contract") && init?.method === "POST") {
        submissions.push(JSON.parse(String(init.body)));
        return submissions.length === 1
          ? new Response(JSON.stringify({ error: "PRICE_CHANGED", message: "Цена работ изменилась" }), { status: 409 })
          : new Response(JSON.stringify({ ...draft, totalAmountRubles: 15000, status: "ACTIVE", contractAcceptedAt: "2026-11-16" }));
      }
      return new Response(JSON.stringify(current));
    });
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={draft} /></ConfirmProvider>);
    });
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    await act(async () => {});
    const checkbox = screen.getByRole("checkbox", { name: /Я согласен/ });
    fireEvent.click(checkbox);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Подтвердить заключение" }));
    });
    expect(submissions).toEqual([{ termsVersion: "v1", expectedTotalAmountRubles: 12000 }]);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Подтвердить заключение" })).toBeDisabled();
    expect(screen.getByText(/Цена работ изменилась\. Проверьте новую сумму/)).toBeVisible();
    expect(within(screen.getByRole("dialog")).getByText(/Цена: 15\s*000\s*₽/)).toBeVisible();
    fireEvent.click(checkbox);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Подтвердить заключение" }));
    });
    expect(submissions).toEqual([
      { termsVersion: "v1", expectedTotalAmountRubles: 12000 },
      { termsVersion: "v1", expectedTotalAmountRubles: 15000 },
    ]);
  });

  it("keeps contract confirmation disabled when the changed price cannot be refreshed", async () => {
    const draft = { ...request, status: "DISCUSSING", contractAcceptedAt: null } as RequestCustomerDto;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.includes("/legal-docs/")) return new Response(JSON.stringify({ version: "v1" }));
      if (path.endsWith("contract-bundles")) return new Response(JSON.stringify([{ status: "APPROVED" }]));
      if (path.endsWith("provider-misc")) return new Response("[]");
      if (path.endsWith("/payments")) return new Response("{}", { status: 503 });
      if (path.endsWith("accept-contract") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "PRICE_CHANGED" }), { status: 409 });
      }
      return new Response(JSON.stringify(draft));
    });
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={draft} /></ConfirmProvider>);
    });
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("checkbox", { name: /Я согласен/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Подтвердить заключение" }));
    });
    expect(screen.getByText(/Цена работ изменилась, но не удалось обновить данные/)).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /Я согласен/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Подтвердить заключение" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Вернуться к обсуждению" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    await act(async () => {});
    expect(screen.getByText(/Цена работ изменилась, но не удалось обновить данные/)).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /Я согласен/ })).toBeDisabled();
  });

  it("keeps confirmation blocked when a price refresh is superseded", async () => {
    const draft = { ...request, status: "DISCUSSING", contractAcceptedAt: null } as RequestCustomerDto;
    const runner = {
      run: vi.fn().mockResolvedValue(false),
      cancel: vi.fn(),
      currentKey: vi.fn().mockReturnValue(null),
    };
    vi.spyOn(financeRunner, "createLatestFinanceRequestRunner").mockReturnValue(runner);
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.includes("/legal-docs/")) return new Response(JSON.stringify({ version: "v1" }));
      if (path.endsWith("contract-bundles")) return new Response(JSON.stringify([{ status: "APPROVED" }]));
      if (path.endsWith("provider-misc")) return new Response("[]");
      if (path.endsWith("accept-contract") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "PRICE_CHANGED" }), { status: 409 });
      }
      return new Response(JSON.stringify(draft));
    });
    await act(async () => {
      render(<ConfirmProvider><CustomerRequestConversationWorkspace initialRequest={draft} /></ConfirmProvider>);
    });
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("checkbox", { name: /Я согласен/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Подтвердить заключение" }));
    });
    expect(runner.run).toHaveBeenCalled();
    expect(screen.getByText(/Цена работ изменилась, но не удалось обновить данные/)).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /Я согласен/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Подтвердить заключение" })).toBeDisabled();
  });

});
