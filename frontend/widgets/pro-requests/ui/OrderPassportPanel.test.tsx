import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderPassportPanel } from "./OrderPassportPanel";
afterEach(() => vi.unstubAllGlobals());
it("shows download rows without full photos when the form is not shared, and rechecks after reopening", async () => {
 let revoked=false;
 vi.stubGlobal('fetch',vi.fn(async (url:unknown)=>String(url).endsWith('/photos') && !revoked ? Response.json([{id:'photo-1'}]) : Response.json({message:'Denied'}, {status:403})));
 render(<OrderPassportPanel orderId="request-1" />);
 await userEvent.click(screen.getByRole('button',{name:'Паспорт клиента'}));
 expect(await screen.findByRole('link',{name:'Скачать фото паспорта 1'})).toHaveAttribute('href','/api/pro/requests/request-1/passport/photos/photo-1');
 expect(screen.queryByRole('img')).not.toBeInTheDocument();
 expect(screen.queryByText('Серия/номер:')).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Закрыть'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 revoked=true;
 await userEvent.click(screen.getByRole('button',{name:'Паспорт клиента'}));
 await waitFor(()=>expect(screen.getAllByText('Клиент не предоставил доступ или срок доступа истёк.')).toHaveLength(2));
 expect(screen.queryByRole('link',{name:'Скачать фото паспорта 1'})).not.toBeInTheDocument();
});

it("requests each kind independently, preserves errors for retry and restores pending requests", async () => {
 const pending: string[] = [];
 let fail = true;
 const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
  if (init?.method === "POST") {
   if (fail) { fail = false; return Response.json({message:"Сбой запроса"}, {status:502}); }
   pending.push(String(url).split("/").at(-1)!);
   return Response.json({requested:true,hasAccess:false});
  }
  if (String(url).endsWith("access-requests")) return Response.json({pendingKinds:pending});
  return Response.json({}, {status:403});
 });
 vi.stubGlobal("fetch", fetchMock);
 render(<OrderPassportPanel orderId="request-1" />);
 await userEvent.click(screen.getByRole("button", {name:"Паспорт клиента"}));
 await screen.findByText("Данные паспорта");
 await screen.findByText("Фотографии паспорта");
 const form = await screen.findByRole("button", {name:"Запросить данные паспорта"});
 await waitFor(() => expect(form).toBeEnabled());
 await userEvent.click(form);
 await screen.findByText("Сбой запроса");
 expect(form).toBeEnabled();
 await userEvent.click(form);
 await waitFor(() => expect(screen.getByRole("button", {name:"Запрошены данные паспорта"})).toBeDisabled());
 expect(screen.getByRole("button", {name:"Запросить фотографии паспорта"})).toBeEnabled();
 await userEvent.click(screen.getByRole("button", {name:"Запросить фотографии паспорта"}));
 await waitFor(() => expect(screen.getByRole("button", {name:"Запрошены фотографии паспорта"})).toBeDisabled());
 expect(pending).toEqual(["FORM", "PHOTO"]);
 await userEvent.click(screen.getByRole("button", {name:"Закрыть"}));
 await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
 await userEvent.click(screen.getByRole("button", {name:"Паспорт клиента"}));
 await waitFor(() => expect(screen.getByRole("button", {name:"Запрошены фотографии паспорта"})).toBeDisabled());
 expect(fetchMock.mock.calls.filter(([,init]) => init?.method === "POST")).toHaveLength(3);
});

it("does not offer an access request for a storage or network failure", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, {status:502})));
 render(<OrderPassportPanel orderId="request-1" />);
 await userEvent.click(screen.getByRole("button", {name:"Паспорт клиента"}));
 await waitFor(() => expect(screen.getAllByText("Данные недоступны. Попробуйте обновить.")).toHaveLength(2));
 expect(screen.queryByRole("button", {name:/Запросить/})).not.toBeInTheDocument();
});
