import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PassportAccessDialog } from "./PassportAccessDialog";
import { PassportAccessPanel } from "./PassportAccessPanel";
import type { RequestCustomerDto } from "@/entities/request";
const requests = [{ id: "request-1", providerId: "provider-1", providerName: "Исполнитель", serviceTitle: "Межевание", status: "ACTIVE" }] as RequestCustomerDto[];
const onSaved = vi.fn();
const onClose = vi.fn();
const grant = { requestId: "request-1", kind: "FORM", providerId: "provider-1", providerName: "Исполнитель", requestTitle: "Межевание", expiresAt: "2099-01-01T00:00:00Z", active: true };
const state = { hasForm: true, photoCount: 4, grants: [], audit: [] };
function mount() { return render(<PassportAccessDialog initialKind="photo" requests={requests} loading={false} error={null} hasPassport onSaved={onSaved} onClose={onClose} />); }
async function selectRequest() {
 await waitFor(() => expect(screen.getByRole("combobox", { name: "Заявка и исполнитель" })).toBeEnabled());
 await userEvent.click(screen.getByRole("combobox", { name: "Заявка и исполнитель" }));
 await userEvent.click(screen.getByRole("option", { name: /Межевание/ }));
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
it("grants only photos and keeps the form private", async () => {
 const fetchMock = vi.fn(async (_: unknown, init?: RequestInit) => Response.json(init?.method ? { ok: true } : state));
 vi.stubGlobal("fetch", fetchMock); mount(); await selectRequest();
 expect(screen.getByRole("checkbox", { name: "Фотографии паспорта" })).toBeChecked();
 expect(screen.getByRole("checkbox", { name: "Данные паспорта" })).not.toBeChecked();
 await userEvent.click(screen.getByRole("button", { name: "Сохранить разрешения" }));
 const write = fetchMock.mock.calls.find(([, init]: [unknown, RequestInit?]) => init?.method === "PUT");
 expect(JSON.parse(String(write?.[1]?.body))).toEqual({ form: false, photo: true, durationDays: 7, providerId: "provider-1" });
 expect(onSaved).toHaveBeenCalledOnce();
});
it("loads existing selections, and preserves edits when saving fails", async () => {
 vi.stubGlobal("fetch", vi.fn(async (_: unknown, init?: RequestInit) => init?.method ? Response.json({ message: "Сбой сохранения" }, { status: 502 }) : Response.json({ ...state, grants: [grant] })));
 mount(); await selectRequest();
 expect(screen.getByRole("checkbox", { name: "Данные паспорта" })).toBeChecked();
 expect(screen.getByRole("checkbox", { name: "Фотографии паспорта" })).not.toBeChecked();
 await userEvent.click(screen.getByRole("checkbox", { name: "Фотографии паспорта" }));
 await userEvent.click(screen.getByRole("button", { name: "Сохранить разрешения" }));
 await screen.findByText("Сбой сохранения");
 expect(screen.getByRole("checkbox", { name: "Фотографии паспорта" })).toBeChecked();
 expect(onSaved).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
});
it("distinguishes identical request titles and shares the passport with the selected request", async () => {
 const identical = [
  { ...requests[0], id: "a1b2c3d4-1111-4111-8111-111111111111", number: 1, createdAt: "2026-11-11T10:15:00Z" },
  { ...requests[0], id: "e5f6a7b8-2222-4222-8222-222222222222", number: 2, createdAt: "2026-11-12T11:45:00Z" },
 ];
 const fetchMock = vi.fn(async (_: unknown, init?: RequestInit) => Response.json(init?.method ? { ok: true } : state));
 vi.stubGlobal("fetch", fetchMock);
 render(<PassportAccessDialog initialKind="photo" requests={identical} loading={false} error={null} hasPassport onSaved={onSaved} onClose={onClose} />);
 await waitFor(() => expect(screen.getByRole("combobox", { name: "Заявка и исполнитель" })).toBeEnabled());
 await userEvent.click(screen.getByRole("combobox", { name: "Заявка и исполнитель" }));
 const options = screen.getAllByRole("option", { name: /Межевание/ });
 expect(options).toHaveLength(2);
 expect(options[0]).toHaveTextContent("№ 1");
 expect(options[0]).toHaveTextContent(/11\.11\.2026, \d{2}:\d{2}/);
 expect(options[1]).toHaveTextContent("№ 2");
 expect(options[1]).toHaveTextContent(/12\.11\.2026, \d{2}:\d{2}/);
 await userEvent.click(options[1]);
 await userEvent.click(screen.getByRole("button", { name: "Сохранить разрешения" }));
 await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
 const write = fetchMock.mock.calls.find(([, init]: [unknown, RequestInit?]) => init?.method === "PUT");
 expect(String(write?.[0])).toBe(`/api/documents/passport/access/${identical[1].id}`);
});
it("revokes only the selected kind and retains failed revocations for retry", async () => {
 let attempts=0;
 const fetchMock=vi.fn(async (_: unknown, init?:RequestInit) => {
  if(init?.method==='DELETE') return ++attempts===1 ? Response.json({message:'Сбой отзыва'}, {status:502}) : Response.json({ok:true});
  return Response.json({...state,grants:attempts>1?[{...grant,kind:'PHOTO'}]:[grant,{...grant,kind:'PHOTO'}]});
 });
 vi.stubGlobal('fetch',fetchMock);
 render(<PassportAccessPanel refreshKey="1" requests={requests} />);
 await userEvent.click(await screen.findByRole('button',{name:'Отозвать доступ: данные паспорта'}));
 await screen.findByText('Сбой отзыва');
 await userEvent.click(screen.getByRole('button',{name:'Отозвать доступ: данные паспорта'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Отозвать доступ: данные паспорта'})).not.toBeInTheDocument());
 expect(screen.getByRole('button',{name:'Отозвать доступ: фотографии паспорта'})).toBeInTheDocument();
 expect(fetchMock.mock.calls.filter(([,init]: [unknown, RequestInit?])=>init?.method==='DELETE').every(([url]: [unknown, RequestInit?])=>String(url).endsWith('/request-1/FORM'))).toBe(true);
});

it("opens the requested order and kind while retaining existing access to the other kind", async () => {
 const fetchMock = vi.fn(async (_: unknown, init?: RequestInit) => Response.json(init?.method ? {ok:true} : {...state, grants:[grant]}));
 vi.stubGlobal("fetch", fetchMock);
 render(<PassportAccessDialog initialKind="photo" initialRequestId="request-1" requests={requests} loading={false} error={null} hasPassport onSaved={onSaved} onClose={onClose} />);
 await waitFor(() => expect(screen.getByRole("button", {name:"Сохранить разрешения"})).toBeEnabled());
 expect(screen.getByRole("combobox", {name:"Заявка и исполнитель"})).toHaveTextContent("Межевание");
 expect(screen.getByRole("checkbox", {name:"Данные паспорта"})).toBeChecked();
 expect(screen.getByRole("checkbox", {name:"Фотографии паспорта"})).toBeChecked();
 await userEvent.click(screen.getByRole("button", {name:"Сохранить разрешения"}));
 const write = fetchMock.mock.calls.find(([,init]) => init?.method === "PUT");
 expect(String(write?.[0])).toBe("/api/documents/passport/access/request-1");
 expect(JSON.parse(String(write?.[1]?.body))).toEqual({form:true,photo:true,durationDays:7,providerId:"provider-1"});
});

it("shows pending provider requests and keeps a failed decline available for retry", async () => {
 const pending = {requestId:"request-1",kind:"PHOTO" as const,providerId:"provider-1",providerName:"Исполнитель",requestTitle:"Межевание",requestNumber:4,createdAt:"2026-11-12T12:26:00Z"};
 let declined = false, fail = true;
 const onShare = vi.fn();
 const fetchMock = vi.fn(async (_: unknown, init?: RequestInit) => {
  if (init?.method === "DELETE") {
   if (fail) { fail = false; return Response.json({message:"Сбой отклонения"}, {status:502}); }
   declined = true;
   return Response.json({ok:true});
  }
  return Response.json({...state, requests:declined ? [] : [pending]});
 });
 vi.stubGlobal("fetch", fetchMock);
 render(<PassportAccessPanel refreshKey="1" requests={requests} onShare={onShare} />);
 await screen.findByText("Запрашивает: фотографии паспорта");
 expect(screen.getByText(/Заявка № 4/)).toBeInTheDocument();
 await userEvent.click(screen.getByRole("button", {name:"Предоставить доступ"}));
 expect(onShare).toHaveBeenCalledWith(pending);
 await userEvent.click(screen.getByRole("button", {name:"Отклонить"}));
 await screen.findByText("Сбой отклонения");
 expect(screen.getByText("Запрашивает: фотографии паспорта")).toBeInTheDocument();
 await userEvent.click(screen.getByRole("button", {name:"Отклонить"}));
 await waitFor(() => expect(screen.queryByText("Запрашивает: фотографии паспорта")).not.toBeInTheDocument());
 expect(fetchMock.mock.calls.filter(([,init]) => init?.method === "DELETE").every(([url]) => String(url).endsWith("/access/requests/request-1/PHOTO"))).toBe(true);
});
