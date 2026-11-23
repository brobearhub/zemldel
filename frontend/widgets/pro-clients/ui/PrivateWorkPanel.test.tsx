import { act, render, screen } from "@testing-library/react";
import type { RequestProDto } from "@/entities/request";
import { PrivateWorkPanel } from "./PrivateWorkPanel";

vi.mock("@/core/store/hooks", () => ({
  useAppSelector: () => ({
    status: "ACTIVE",
    providerId: "company",
    role: "MANAGER",
  }),
}));

afterEach(() => vi.unstubAllGlobals());

it("обновляет заметки в открытой заявке после записи другого участника команды", async () => {
  const request = {
    id: "request",
    status: "DISCUSSING",
    providerId: "company",
  } as RequestProDto;
  let notes: {
    id: string;
    authorName: string;
    createdAt: string;
    text: string;
  }[] = [];
  const fetchMock = vi.fn(async (path: string) =>
    Response.json(path.endsWith("/provider-notes") ? notes : { events: [] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  await act(async () => {
    render(
      <PrivateWorkPanel
        request={request}
        status="IN_PROGRESS"
        onChange={vi.fn()}
      />,
    );
  });
  notes = [
    {
      id: "new",
      createdAt: "2026-11-21T00:00:00Z",
      authorName: "Анна",
      text: "Согласовали дату выезда",
    },
  ];
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("request:changed", { detail: { requestId: "another" } }),
    );
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("request:changed", { detail: { requestId: request.id } }),
    );
  });
  expect(screen.getByText("Согласовали дату выезда")).toBeVisible();
});
