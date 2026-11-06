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
 expect(screen.getByRole("checkbox", { name: "Фото паспорта" })).toBeChecked();
 expect(screen.getByRole("checkbox", { name: "Данные анкеты" })).not.toBeChecked();
 await userEvent.click(screen.getByRole("button", { name: "Сохранить разрешения" }));
 const write = fetchMock.mock.calls.find(([, init]: [unknown, RequestInit?]) => init?.method === "PUT");
 expect(JSON.parse(String(write?.[1]?.body))).toEqual({ form: false, photo: true, durationDays: 7 });
 expect(onSaved).toHaveBeenCalledOnce();
});
it("loads existing selections, and preserves edits when saving fails", async () => {
 vi.stubGlobal("fetch", vi.fn(async (_: unknown, init?: RequestInit) => init?.method ? Response.json({ message: "Сбой сохранения" }, { status: 502 }) : Response.json({ ...state, grants: [grant] })));
 mount(); await selectRequest();
 expect(screen.getByRole("checkbox", { name: "Данные анкеты" })).toBeChecked();
 expect(screen.getByRole("checkbox", { name: "Фото паспорта" })).not.toBeChecked();
 await userEvent.click(screen.getByRole("checkbox", { name: "Фото паспорта" }));
 await userEvent.click(screen.getByRole("button", { name: "Сохранить разрешения" }));
 await screen.findByText("Сбой сохранения");
 expect(screen.getByRole("checkbox", { name: "Фото паспорта" })).toBeChecked();
 expect(onSaved).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
});
it("revokes only the selected kind and retains failed revocations for retry", async () => {
 let attempts=0;
 const fetchMock=vi.fn(async (_: unknown, init?:RequestInit) => {
  if(init?.method==='DELETE') return ++attempts===1 ? Response.json({message:'Сбой отзыва'}, {status:502}) : Response.json({ok:true});
  return Response.json({...state,grants:attempts>1?[{...grant,kind:'PHOTO'}]:[grant,{...grant,kind:'PHOTO'}]});
 });
 vi.stubGlobal('fetch',fetchMock);
 render(<PassportAccessPanel refreshKey="1" requests={requests} />);
 await userEvent.click(await screen.findByRole('button',{name:'Отозвать доступ: анкета'}));
 await screen.findByText('Сбой отзыва');
 await userEvent.click(screen.getByRole('button',{name:'Отозвать доступ: анкета'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Отозвать доступ: анкета'})).not.toBeInTheDocument());
 expect(screen.getByRole('button',{name:'Отозвать доступ: фотографии'})).toBeInTheDocument();
 expect(fetchMock.mock.calls.filter(([,init]: [unknown, RequestInit?])=>init?.method==='DELETE').every(([url]: [unknown, RequestInit?])=>String(url).endsWith('/request-1/FORM'))).toBe(true);
});
