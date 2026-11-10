import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderSlugEditor } from "./ProviderSlugEditor";

const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const changed = vi.fn();
const initial = { slug: "old-address", nextChangeAt: null, amount: 100000, enabled: true, order: null };
function setup(options: { available?: boolean; quoteError?: string; nextChangeAt?: string } = {}) {
  const request = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("slug-check?")) return Response.json({ available: options.available ?? true });
    if (url.endsWith("slug-quote")) {
      if (options.quoteError) return Response.json({ message: options.quoteError }, { status: 409 });
      return Response.json({ slug: JSON.parse(String(init?.body)).slug, available: true, amount: 100000, offerVersion: "2026-11-10", enabled: true });
    }
    if (url.endsWith("slug-checkout")) return Response.json({ id: "order", status: "NEW", paymentUrl: null });
    return Response.json({ ...initial, nextChangeAt: options.nextChangeAt ?? null });
  });
  vi.stubGlobal("fetch", request);
  render(<ProviderSlugEditor providerId="provider" slug="old-address" baseUrl="https://example.test/providers/" canEdit onChanged={changed} />);
  return request;
}
beforeEach(() => { router.refresh.mockClear(); changed.mockClear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function editAddress() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Изменить адрес" }));
  const input = screen.getByRole("textbox", { name: "Новый адрес профиля" });
  await user.clear(input);
  await user.type(input, "NewAddress123");
  return { user, input };
}

describe("paid profile address", () => {
  it("checks availability and opens terms on Save before creating any payment", async () => {
    const request = setup();
    const { user, input } = await editAddress();
    expect(input).toHaveValue("newaddress123");
    expect(screen.getByText("Только английские буквы и цифры, до 64 символов")).toBeVisible();
    await screen.findByText("Адрес доступен");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Адрес доступен")).toBeVisible();
    expect(within(dialog).getByText(/Один раз|один раз/)).toBeVisible();
    const pay = within(dialog).getByRole("button", { name: /Оплатить 1\s000 ₽/ });
    expect(pay).toBeDisabled();
    expect(request.mock.calls.some(([url]) => url.endsWith("slug-checkout"))).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(pay);
    await waitFor(() => expect(request.mock.calls.some(([url]) => url.endsWith("slug-checkout"))).toBe(true));
    const [, init] = request.mock.calls.find(([url]) => url.endsWith("slug-checkout"))!;
    expect(JSON.parse(String(init?.body))).toMatchObject({ slug: "newaddress123", expectedAmount: 100000, acceptedOfferVersion: "2026-11-10" });
    expect(changed).not.toHaveBeenCalled();
  });

  it("does not offer payment when an address is occupied", async () => {
    const request = setup({ available: false });
    await editAddress();
    await screen.findByText("Адрес занят");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    expect(request.mock.calls.some(([url]) => url.endsWith("slug-checkout"))).toBe(false);
  });

  it("rechecks availability at Save and surfaces a conflict without a confirmation dialog", async () => {
    setup({ quoteError: "Этот адрес уже занят. Выберите другой" });
    const { user } = await editAddress();
    await screen.findByText("Адрес доступен");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Этот адрес уже занят. Выберите другой")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the next eligible date and blocks another paid change during the month", async () => {
    setup({ nextChangeAt: "2099-12-01T12:00:00Z" });
    await editAddress();
    await screen.findByText(/Следующая смена доступна с/);
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  });

  it("allows only English letters and digits in a new address", async () => {
    setup();
    const { user, input } = await editAddress();
    await user.clear(input);
    await user.type(input, "Тест Hello-123_!");
    expect(input).toHaveValue("hello123");
  });
});
