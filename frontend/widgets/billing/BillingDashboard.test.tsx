import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillingDashboard } from "./BillingDashboard";
import { PlanComparison } from "./PlanComparison";
import { type BillingOverview, type Product } from "./model";

const catalog = {
  LITE: { amount: 700 },
  BUSINESS: { amount: 900 },
  LITE_YEAR: { amount: 7560 },
  BUSINESS_YEAR: { amount: 9720 },
};
const overview: BillingOverview = {
  catalog,
  entitlementPlan: "LITE",
  enforcementEnabled: true,
  limits: {
    photos: 3,
    regions: null,
    replies: null,
    templates: true,
    sharedTemplates: true,
    team: true,
    statistics: 1,
  },
  autoRenew: true,
  renewalPending: false,
  canAutoRenew: true,
  nextPlan: null,
  billingPeriod: "MONTH",
  nextBillingPeriod: null,
  timezone: "Europe/Moscow",
  graceUntil: null,
  dailyUsed: 0,
  quotaResetAt: "2099-12-01T00:00:00Z",
  notices: [],
  mode: "test",
  enabled: true,
  canPay: true,
  plan: "LITE",
  planExpiresAt: "2099-12-01T00:00:00Z",
  replyCredits: 0,
  needsReview: false,
  orders: [],
};
function setup(
  initial: BillingOverview = overview,
  mode: "purchase" | "schedule" = "purchase",
) {
  let current = { ...initial };
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (url.endsWith("/settings")) current = { ...current, ...body };
    if (url.endsWith("/quote"))
      return Response.json({
        mode,
        offerVersion: "2026-11-10",
        regularAmount: current.catalog[body.product as Product].amount,
        quoteAt: new Date().toISOString(),
        amount: current.catalog[body.product as Product].amount,
      });
    if (url.endsWith("/checkout"))
      return Response.json({
        id: "order",
        status: "CONFIRMED",
        paymentUrl: null,
      });
    return Response.json(current);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("annual plans and renewal cancellation", () => {
  it("uses server catalog prices for selection and renewal consent", async () => {
    setup({
      ...overview,
      catalog: { ...catalog, BUSINESS: { amount: 1234 } },
    });
    render(<BillingDashboard providerId="provider" providerName="Исполнитель" />);
    await userEvent.click(await screen.findByRole("button", {
      name: "Бизнес · 12,34 ₽ / месяц",
    }));
    expect(await screen.findByRole("checkbox", {
      name: /Продлевать автоматически за 12,34 ₽/,
    })).toBeInTheDocument();
  });

  it("shows the current entitlement features and hides retired reply packages", async () => {
    setup();
    render(
      <BillingDashboard providerId="provider" providerName="Исполнитель" />,
    );
    const features = await screen.findByRole("region", {
      name: "01 / Возможности вашего тарифа",
    });
    expect(within(features).getByText("До 1000 символов")).toBeInTheDocument();
    expect(within(features).getByText("Жирный и курсив")).toBeInTheDocument();
    expect(
      within(features).queryByText("Жирный, курсив и ссылки"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Резерв откликов|10 откликов/),
    ).not.toBeInTheDocument();
  });
  it("selects an annual plan from the receipt and quotes the annual product", async () => {
    const fetchMock = setup();
    render(
      <BillingDashboard providerId="provider" providerName="Исполнитель" />,
    );
    const month = await screen.findByRole("button", {
      name: "Лайт подключён · 7 ₽ / месяц",
    });
    expect(month).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Год −10%" }));
    const annual = screen.getByRole("button", {
      name: /Лайт · 75,60 ₽ \/ год/,
    });
    expect(annual).toBeEnabled();
    await userEvent.click(annual);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/providers/provider/quote",
        expect.objectContaining({
          body: JSON.stringify({ product: "LITE_YEAR" }),
        }),
      ),
    );
  });
  it("does not label a pending returned payment as paid", async () => {
    setup({
      ...overview,
      orders: [
        {
          id: "pending",
          product: "BUSINESS_YEAR",
          amount: 9720,
          status: "NEW",
          createdAt: "2026-11-09T12:00:00Z",
          fulfilledAt: null,
          paymentUrl: null,
        },
      ],
    });
    render(
      <BillingDashboard
        providerId="provider"
        providerName="Исполнитель"
        returnOrder="pending"
      />,
    );
    const summary = await screen.findByRole("region", { name: "Лайт" });
    expect(within(summary).getByText("Ожидает оплаты")).toBeInTheDocument();
    expect(within(summary).getByText("Сумма платежа")).toBeInTheDocument();
    expect(within(summary).queryByText("Оплачено")).not.toBeInTheDocument();
  });
  it("saves the profile timezone through the existing settings endpoint", async () => {
    const fetchMock = setup();
    render(
      <BillingDashboard providerId="provider" providerName="Исполнитель" />,
    );
    const input = await screen.findByRole("combobox", {
      name: "Часовой пояс профиля",
    });
    await userEvent.click(input);
    expect(screen.getByRole("option", { name: "Москва 0 ч" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Калининград −1 ч" })).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("option", { name: "Екатеринбург +2 ч" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/providers/provider/settings",
        expect.objectContaining({
          body: JSON.stringify({ timezone: "Asia/Yekaterinburg" }),
        }),
      ),
    );
    expect(
      await screen.findByDisplayValue("Asia/Yekaterinburg"),
    ).toBeInTheDocument();
  });
  it("keeps plan purchases and timezone edits unavailable to a non-owner", async () => {
    setup({ ...overview, canPay: false });
    render(
      <BillingDashboard providerId="provider" providerName="Исполнитель" />,
    );
    expect(
      await screen.findByRole("button", { name: "Бизнес · 9 ₽ / месяц" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Часовой пояс профиля" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  });
  it("shows annual totals and sends the annual product in the comparison links", async () => {
    render(<PlanComparison catalog={catalog} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Год −10%" }));
    expect(screen.getByText(/75,60 ₽/)).toBeInTheDocument();
    expect(screen.getByText(/97,20 ₽/)).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Выбрать тариф" });
    expect(links[0]).toHaveAttribute(
      "href",
      "/pro/settings/tariff?product=LITE_YEAR",
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/pro/settings/tariff?product=BUSINESS_YEAR",
    );
    await user.click(screen.getByRole("button", { name: "Месяц" }));
    expect(links[0]).toHaveAttribute(
      "href",
      "/pro/settings/tariff?product=LITE",
    );
  });
  it.each(["MONTH", "YEAR"] as const)(
    "turns off renewal for %s without clearing the paid expiry",
    async (billingPeriod) => {
      const fetchMock = setup({ ...overview, billingPeriod });
      render(
        <BillingDashboard providerId="provider" providerName="Исполнитель" />,
      );
      await userEvent.click(
        await screen.findByRole("switch", { name: "Автопродление" }),
      );
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/billing/providers/provider/settings",
          expect.objectContaining({
            body: JSON.stringify({ nextPlan: "STANDARD", autoRenew: false }),
          }),
        ),
      );
      expect(
        await screen.findByText(
          /Продление отключено. Оплаченный срок сохранён/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("switch", { name: "Автопродление" }),
      ).not.toBeChecked();
      expect(
        screen.getByText(/Оплаченные возможности доступны до/),
      ).toHaveTextContent("01.12.2099");
    },
  );
  it.each(["MONTH", "YEAR"] as const)(
    "turns on renewal for %s and reads back its state",
    async (billingPeriod) => {
      const fetchMock = setup({ ...overview, billingPeriod, autoRenew: false });
      render(
        <BillingDashboard providerId="provider" providerName="Исполнитель" />,
      );
      const toggle = await screen.findByRole("switch", {
        name: "Автопродление",
      });
      expect(toggle).not.toBeChecked();
      await userEvent.click(toggle);
      expect(toggle).not.toBeChecked();
      await userEvent.click(await screen.findByRole("checkbox", { name: /Принимаю условия/ }));
      await userEvent.click(screen.getByRole("button", { name: "Подтвердить автопродление" }));
      await waitFor(() => expect(toggle).toBeChecked());
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/providers/provider/settings",
        expect.objectContaining({ body: JSON.stringify({
          autoRenew: true,
          acceptedOfferVersion: "2026-11-10",
          expectedRenewalAmount: billingPeriod === "YEAR" ? 7560 : 700,
        }) }),
      );
      expect(screen.getByText(/Следующее продление:/)).toHaveTextContent(
        billingPeriod === "YEAR" ? /75,60 ₽ за год/ : "7 ₽ за месяц",
      );
    },
  );
  it("keeps the switch on if the server rejects disabling renewal", async () => {
    const fetchMock = setup();
    render(
      <BillingDashboard providerId="provider" providerName="Исполнитель" />,
    );
    const toggle = await screen.findByRole("switch", { name: "Автопродление" });
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ message: "Не удалось сохранить" }, { status: 503 }),
    );
    await userEvent.click(toggle);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось сохранить",
    );
    expect(toggle).toBeChecked();
    expect(toggle).toBeEnabled();
  });
  it("explains why enabling renewal requires card consent", async () => {
    setup({ ...overview, autoRenew: false, canAutoRenew: false });
    render(
      <BillingDashboard providerId="provider" providerName="Исполнитель" />,
    );
    const toggle = await screen.findByRole("switch", { name: "Автопродление" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAccessibleDescription(
      /разрешите его при следующей оплате картой/,
    );
  });
  it("checks out an annual plan with the consent checkbox turned off", async () => {
    const fetchMock = setup({
      ...overview,
      plan: "STANDARD",
      autoRenew: false,
      planExpiresAt: null,
    });
    render(
      <BillingDashboard
        providerId="provider"
        providerName="Исполнитель"
        initialProduct="LITE_YEAR"
      />,
    );
    const checkbox = await screen.findByRole("checkbox", {
      name: /Продлевать автоматически/,
    });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAccessibleName(/раз в год/);
    expect(screen.getByRole("button", { name: "Перейти к оплате" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Принимаю условия/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Перейти к оплате" }),
    );
    await waitFor(() => {
      const request = fetchMock.mock.calls.find(([url]) =>
        url.endsWith("/checkout"),
      );
      expect(request).toBeDefined();
      expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
        product: "LITE_YEAR",
        expectedAmount: 7560,
        autoRenew: false,
        acceptedOfferVersion: "2026-11-10",
      });
    });
  });
  it("schedules monthly billing after the paid year without charging now", async () => {
    const fetchMock = setup({ ...overview, billingPeriod: "YEAR" }, "schedule");
    render(
      <BillingDashboard
        providerId="provider"
        providerName="Исполнитель"
        initialProduct="LITE"
      />,
    );
    const button = await screen.findByRole("button", {
      name: "Запланировать переход",
    });
    await userEvent.click(await screen.findByRole("checkbox", { name: /Принимаю условия/ }));
    await userEvent.click(button);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/providers/provider/settings",
        expect.objectContaining({
          body: JSON.stringify({
            acceptedOfferVersion: "2026-11-10",
            expectedRenewalAmount: 700,
            nextPlan: "LITE",
            nextBillingPeriod: "MONTH",
          }),
        }),
      ),
    );
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/checkout")),
    ).toBe(false);
  });
});
