import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderPassportPanel } from "./OrderPassportPanel";
afterEach(() => vi.unstubAllGlobals());
it("shows photos even when the form is not shared, and rechecks after reopening", async () => {
 let revoked=false;
 vi.stubGlobal('fetch',vi.fn(async (url:unknown)=>String(url).endsWith('/photos') && !revoked ? Response.json([{id:'photo-1'}]) : Response.json({message:'Denied'}, {status:403})));
 render(<OrderPassportPanel orderId="request-1" />);
 await userEvent.click(screen.getByRole('button',{name:'Паспорт клиента'}));
 expect(await screen.findByAltText('Фото паспорта 1')).toHaveAttribute('src','/api/pro/requests/request-1/passport/photos/photo-1?view=0');
 expect(screen.queryByText('Серия/номер:')).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Закрыть'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 revoked=true;
 await userEvent.click(screen.getByRole('button',{name:'Паспорт клиента'}));
 await waitFor(()=>expect(screen.getAllByText('Клиент не предоставил доступ или срок доступа истёк.')).toHaveLength(2));
 expect(screen.queryByAltText('Фото паспорта 1')).not.toBeInTheDocument();
});
