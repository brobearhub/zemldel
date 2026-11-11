import { act, cleanup, render as testingRender, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import type { RequestProDto } from "@/entities/request";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { fetchProRequestContractBundles, fetchProRequestMiscFiles } from "@/entities/request/api/pro-contract-bundles";
import { fetchProRequestDocumentRequests } from "@/entities/request/api/request-document-requests";
import { ProRequestDetails } from "./ProRequestDetails";
import { ProRequestWorkspace } from "./ProRequestWorkspace";

const theme = createAppTheme("light");
const render = (ui: ReactElement) => testingRender(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

vi.mock("@/widgets/chat/ui/ServiceRequestChatPanel", () => ({
  ServiceRequestChatPanel: ({requestArchived}: {requestArchived: boolean}) => <div data-testid="chat-readonly">{String(requestArchived)}</div>,
}));

vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({ useChatSocket: () => ({ socket: null }) }));
vi.mock("./RequestRemindersPanel", () => ({ RequestRemindersPanel: () => null }));
vi.mock("./ProRequestDocumentsSection", () => ({
  ProRequestDocumentsSection: ({ contractBundles }: { contractBundles: { status: string }[] }) =>
    <div data-testid="contracts">{contractBundles.map((b) => b.status).join(",")}</div>,
}));
vi.mock("@/entities/request/api/pro-contract-bundles", () => ({
  fetchProRequestContractBundles: vi.fn(), fetchProRequestMiscFiles: vi.fn(),
}));
vi.mock("@/entities/request/api/request-document-requests", () => ({ fetchProRequestDocumentRequests: vi.fn() }));

const request = {
  id: "request-a", subjectType: "FREEFORM", status: "DISCUSSING", providerId: "provider-a",
  lockedAt: "2026-11-01", isLocked: false, message: "Тестовая задача", offerStatus: "SELECTED",
  cadastralNumbers: [], payments: [], deliverySubmissions: [], currentSubmission: null,
  totalAmountRubles: 12000, servicePriceRubles: null, priceProposal: null,
  remainingAmountRubles: 12000, paidAmountRubles: 0, contractAcceptedAt: null,
} as unknown as RequestProDto;

describe("provider request sections follow live updates", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(request))));
    vi.mocked(fetchProRequestMiscFiles).mockResolvedValue([]);
    vi.mocked(fetchProRequestDocumentRequests).mockResolvedValue([]);
    vi.mocked(fetchProRequestContractBundles).mockResolvedValue([{ status: "PENDING_CUSTOMER" }] as never);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("updates a contract decision even when the request status has not changed", async () => {
    await act(async () => { render(<ConfirmProvider><ProRequestDetails initialRequest={request} subtitle="" /></ConfirmProvider>); });
    expect(screen.getByTestId("contracts")).toHaveTextContent("PENDING_CUSTOMER");
    expect(screen.getByText("Договор отправлен. Ждём решения клиента.")).toBeInTheDocument();
    expect(screen.queryByText("Цена согласована. Подготовьте и отправьте договор.")).not.toBeInTheDocument();
    vi.mocked(fetchProRequestContractBundles).mockResolvedValue([{ status: "APPROVED" }] as never);
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "request-a" } })); });
    expect(screen.getByTestId("contracts")).toHaveTextContent("APPROVED");
    expect(screen.getByText("Договор одобрен. Ждём заключения договора клиентом.")).toBeInTheDocument();
  });

  it("does not read exclusive resources when the next snapshot archives the provider", async () => {
    await act(async () => { render(<ConfirmProvider><ProRequestDetails initialRequest={request} subtitle="" /></ConfirmProvider>); });
    const readsBefore = vi.mocked(fetchProRequestContractBundles).mock.calls.length;
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ...request, isLocked: true })));
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "request-a" } })); });
    expect(screen.getByText("Работу выполняет другой исполнитель")).toBeInTheDocument();
    expect(screen.queryByTestId("contracts")).not.toBeInTheDocument();
    expect(fetchProRequestContractBundles).toHaveBeenCalledTimes(readsBefore);
  });

  it("passes refreshed request permissions to the already open chat", async () => {
    await act(async () => {render(<ConfirmProvider><ProRequestWorkspace initialRequest={request} subtitle="" /></ConfirmProvider>);});
    expect(screen.getByTestId("chat-readonly")).toHaveTextContent("false");
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({...request, isLocked: true, providerId: "other-provider"})));
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "request-a" } })); });
    expect(screen.getByTestId("chat-readonly")).toHaveTextContent("true");
    expect(screen.getByText("Работу выполняет другой исполнитель")).toBeInTheDocument();
  });
  it.each([401, 403, 404])('closes the whole workspace on access failure %s', async status => {
    await act(async () => { render(<ConfirmProvider><ProRequestWorkspace initialRequest={request} subtitle="" /></ConfirmProvider>); });
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({error: 'gone'}), {status}));
    await act(async () => { window.dispatchEvent(new CustomEvent('request:changed', {detail: {requestId: request.id}})); });
    expect(screen.getByRole('heading', {name: status === 401 ? 'Сессия завершена' : 'Заявка недоступна'})).toBeInTheDocument();
    expect(screen.queryByTestId('chat-readonly')).not.toBeInTheDocument();
    expect(screen.queryByText('Цена и оплата')).not.toBeInTheDocument();
  });

  it('recovers a missed deletion notification on focus but preserves the workspace on 503', async () => {
    await act(async () => { render(<ConfirmProvider><ProRequestWorkspace initialRequest={request} subtitle="" /></ConfirmProvider>); });
    vi.mocked(fetch).mockImplementation(async () => new Response('{}', {status: 503}));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(screen.getByTestId('chat-readonly')).toBeInTheDocument();
    vi.mocked(fetch).mockImplementation(async () => new Response('{}', {status: 404}));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(screen.getByText('Заявка недоступна')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-readonly')).not.toBeInTheDocument();
  });

});
