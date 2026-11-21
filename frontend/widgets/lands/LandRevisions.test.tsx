import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyLandDraft } from "@/entities/land/types";
import { MyLandListings } from "./MyLandListings";
import { LandModeration } from "./LandModeration";

const { landApi, useLandData } = vi.hoisted(() => ({ landApi: vi.fn(), useLandData: vi.fn() }));
vi.mock("@/entities/land/api", () => ({ landApi, useLandData }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

const revision = {
  ...emptyLandDraft(),
  id: "listing",
  status: "PENDING",
  title: "Обновлённое предложение",
  version: 5,
  hasPublishedVersion: true,
  photos: [],
  documentStatus: "REQUESTED",
  publishedAt: "2026-11-20T09:00:00Z",
};

it("keeps a revision in both owner filters and offers separate recall and withdrawal actions", async () => {
  useLandData.mockReturnValue({ data: [revision], refresh: vi.fn() });
  render(<MyLandListings />);
  for (const filter of ["Опубликовано · 1", "На модерации · 1"]) {
    await userEvent.click(screen.getByRole("button", { name: filter }));
    expect(screen.getByText(revision.title)).toBeVisible();
    expect(screen.getByText("Изменения на модерации")).toBeVisible();
  }
  await userEvent.click(screen.getByRole("button", { name: "Снять с публикации" }));
  const confirmation = screen.getByRole("dialog");
  expect(within(confirmation).getByText(/Последние изменения сохранятся/)).toBeVisible();
  await userEvent.click(within(confirmation).getByRole("button", { name: "Отмена" }));
  await userEvent.click(await screen.findByRole("button", { name: "Отозвать изменения" }));
  expect(JSON.parse(landApi.mock.lastCall?.[1].body)).toMatchObject({ action: "recall", version: 5 });
});

it("targets the published documents when the same listing also has pending edits", async () => {
  useLandData.mockReturnValue({
    data: [revision, { ...revision, status: "PUBLISHED", title: "Опубликованный участок", reviewPublishedDocuments: true }],
    refresh: vi.fn(),
  });
  render(<LandModeration />);
  const link = screen.getByRole("link", { name: "Открыть опубликованную версию" });
  expect(link).toHaveAttribute("href", "/lands/listing?published=1");
  const published = within(link.closest<HTMLElement>(".MuiPaper-root")!);
  await userEvent.click(published.getByRole("button", { name: "Зафиксировать проверку" }));
  const dialog = within(screen.getByRole("dialog"));
  await userEvent.type(dialog.getByRole("textbox"), "Проверены сведения об участке");
  await userEvent.click(dialog.getByRole("button", { name: "Подтвердить решение" }));
  await waitFor(() => expect(JSON.parse(landApi.mock.lastCall?.[1].body)).toMatchObject({
    reviewPublishedDocuments: true, kind: "DOCUMENT", decision: "APPROVE", version: 5,
  }));
});
