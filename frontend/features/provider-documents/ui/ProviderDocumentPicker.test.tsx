import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderDocumentPicker } from "./ProviderDocumentPicker";

afterEach(() => vi.unstubAllGlobals());

it("searches names across folders and preserves the selected library document", async () => {
  const files = [
    {
      id: "1",
      folderId: "folder",
      originalName: "Договор.docx",
      mimeType: "application/msword",
      sizeBytes: 100,
      createdAt: "2026-11-15",
    },
    {
      id: "2",
      folderId: null,
      originalName: "Расчёт.xlsx",
      mimeType: "application/vnd.ms-excel",
      sizeBytes: 100,
      createdAt: "2026-11-15",
    },
  ];
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            folders: [{ id: "folder", name: "Шаблоны" }],
            files,
          }),
        ),
      ),
  );
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ProviderDocumentPicker
      onClose={() => {}}
      onSelect={onSelect}
    />,
  );
  await screen.findByText("Договор.docx");
  await user.type(
    screen.getByLabelText("Поиск по названию документа"),
    "ДОГОВОР",
  );
  expect(screen.queryByText("Расчёт.xlsx")).not.toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: /Договор.docx/ }));
  await user.click(screen.getByRole("button", { name: "Выбрать" }));
  expect(onSelect).toHaveBeenCalledWith([files[0]]);
});

it("shows a load failure with retry instead of an empty library", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "Хранилище недоступно" }), {
          status: 503,
        }),
      ),
  );
  render(
    <ProviderDocumentPicker
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
  expect(await screen.findByText("Хранилище недоступно")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Выбрать" })).toBeDisabled();
});
