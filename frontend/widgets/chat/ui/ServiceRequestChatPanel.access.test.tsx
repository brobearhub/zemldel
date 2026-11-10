import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceRequestChatPanel } from "./ServiceRequestChatPanel";

const socket = vi.hoisted(() => ({ socket: null, socketConnected: false,
  setOpenConversationId: vi.fn(), joinConversationRoom: vi.fn(), clearUnreadForConversation: vi.fn() }));
vi.mock("next-auth/react", () => ({useSession: () => ({data: {user: {id: "actor"}}})}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({useChatSocket: () => socket}));
vi.mock("./Chat", () => ({Chat: (props: {
  disabled: boolean; readOnly: boolean; draft: string;
  onDraftChange: (value: string) => void; onSend: () => void;
}) => <><input aria-label="draft" disabled={props.disabled} value={props.draft} onChange={e => props.onDraftChange(e.target.value)} />
  <button disabled={props.disabled} onClick={props.onSend}>Send</button>
  <span data-testid="readonly">{String(props.readOnly)}</span></>}));

describe("live chat access", () => {
  let canWrite: boolean;
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks(); canWrite = true;
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.stubGlobal("fetch", vi.fn(async (url) => new Response(JSON.stringify(
      String(url).endsWith("/access") ? {canRead: true, canWrite, reasonCode: canWrite ? undefined : "CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION"} : []
    ))));
  });
  afterEach(() => {cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();});

  it("closes input immediately when the request archives this conversation, before server access refresh", async () => {
    const {rerender} = render(<ServiceRequestChatPanel serviceRequestId="request" conversationId="chat" />);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("draft"), {target: {value: "unsent"}});
    expect(screen.getByText("Send")).toBeEnabled();
    rerender(<ServiceRequestChatPanel serviceRequestId="request" conversationId="chat" requestArchived />);
    expect(screen.getByLabelText("draft")).toBeDisabled();
    expect(screen.getByTestId("readonly")).toHaveTextContent("true");
    fireEvent.click(screen.getByText("Send"));
    await act(async () => {});
    expect(screen.getByLabelText("draft")).toBeDisabled();
    expect(vi.mocked(fetch).mock.calls.filter(([url, opts]) => String(url).endsWith("/messages") && opts?.method === "POST")).toHaveLength(0);
    rerender(<ServiceRequestChatPanel serviceRequestId="request" conversationId="chat" requestArchived={false} />);
    await act(async () => {});
    expect(screen.getByLabelText("draft")).toBeEnabled();
  });

  it("refreshes access on a request event and focus for independently opened chats", async () => {
    render(<ServiceRequestChatPanel serviceRequestId="request" conversationId="chat" />);
    await act(async () => {});
    expect(screen.getByText("Send")).toBeEnabled();
    canWrite = false;
    await act(async () => { window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "request" } })); });
    expect(screen.getByLabelText("draft")).toBeDisabled();
    expect(screen.getByText(/Этот диалог сохранён в архиве/)).toBeInTheDocument();
    canWrite = true;
    await act(async () => {window.dispatchEvent(new Event("focus"));});
    expect(screen.getByLabelText("draft")).toBeEnabled();
    expect(screen.getByTestId("readonly")).toHaveTextContent("false");
  });
});
