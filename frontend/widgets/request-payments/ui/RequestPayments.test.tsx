import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatRubles, type RequestPaymentItemDto } from "@/entities/request";
import * as paymentApi from "@/entities/request/api/request-payments";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { RequestPayments, type RequestPaymentsProps } from "./RequestPayments";

const normalizedRubles = (amount: number) =>
  formatRubles(amount).replace(/\s/g, " ");

vi.mock("@/entities/request/api/request-payments", () => ({
  acceptCustomerRequestPrice: vi.fn(),
  acceptProRequestPrice: vi.fn(),
  addCustomerRequestPayment: vi.fn(),
  addProRequestPayment: vi.fn(),
  markCustomerRequestPaymentPaid: vi.fn(),
  markProRequestPaymentPaid: vi.fn(),
  proposeProRequestPrice: vi.fn(),
}));

const expense: RequestPaymentItemDto = {
  id: "expense-1",
  type: "OTHER",
  amountRubles: 3000,
  comment: "Услуги инженера",
  paidAt: null,
  createdAt: "2026-11-14T08:42:00Z",
  createdBySide: "PROVIDER",
};
const baseProps: RequestPaymentsProps = {
  mode: "provider",
  requestId: "request-1",
  status: "TERMS_AGREED",
  lockedAt: "2026-11-01",
  totalAmountRubles: 12000,
  servicePriceRubles: 12000,
  priceProposal: null,
  canProposePrice: true,
  canAcceptPrice: false,
  paidAmountRubles: 0,
  remainingAmountRubles: 12000,
  payments: [
    expense,
    {
      ...expense,
      id: "expense-2",
      amountRubles: 2100,
      comment: "Госпошлина",
    },
    {
      ...expense,
      id: "expense-3",
      amountRubles: 3000,
      comment: "Выезд специалиста",
    },
  ],
};

function setup(overrides: Partial<RequestPaymentsProps> = {}) {
  const user = userEvent.setup();
  const props = { ...baseProps, ...overrides };
  const view = render(
    <ConfirmProvider>
      <RequestPayments {...props} />
    </ConfirmProvider>,
  );
  return { user, props, ...view };
}

describe("RequestPayments estimate and total", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    { name: "agreed price", overrides: {} },
    {
      name: "no agreed price",
      overrides: { totalAmountRubles: null, remainingAmountRubles: null },
    },
    {
      name: "pending price proposal",
      overrides: {
        totalAmountRubles: null,
        remainingAmountRubles: null,
        priceProposal: {
          id: "proposal",
          amountRubles: 15000,
          authorSide: "PROVIDER" as const,
        } as RequestPaymentsProps["priceProposal"],
      },
    },
    {
      name: "pending work payment",
      overrides: {
        payments: [
          ...baseProps.payments,
          { ...expense, id: "work-pending", type: "CONTRACT" as const },
        ],
      },
    },
  ])("starts both sections collapsed with $name", ({ overrides }) => {
    setup(overrides);
    for (const name of ["Стоимость работ", "Дополнительные расходы"]) {
      expect(
        screen.getByRole("button", { name: `Развернуть: ${name}` }),
      ).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it.each(["provider", "customer"] as const)(
    "keeps the %s section controls beside the summaries and the amounts in the headers",
    async (mode) => {
      const { user } = setup({
        mode,
        paidAmountRubles: 1000,
        remainingAmountRubles: 11000,
      });
      const sections = [
        {
          name: "Стоимость работ",
          heading: "Цена работ",
          amount: 12000,
          caption: `Оплачено ${normalizedRubles(1000)} · Осталось ${normalizedRubles(11000)}`,
        },
        {
          name: "Дополнительные расходы",
          heading: "Дополнительные расходы",
          amount: 8100,
          caption: `Оплачено ${normalizedRubles(0)} · Осталось ${normalizedRubles(8100)}`,
        },
      ].map(({ name, heading, amount, caption }) => {
        const section = screen.getByRole("region", { name });
        const title = within(section).getByRole("heading", { name: heading });
        const price = within(section).getByText(normalizedRubles(amount));
        const summary = within(section).getByText(caption);
        const toggle = within(section).getByRole("button", {
          name: `Развернуть: ${name}`,
        });
        const contentId = toggle.getAttribute("aria-controls");
        const content = contentId ? document.getElementById(contentId) : null;

        expect(summary.parentElement).toContainElement(toggle);
        expect(title.parentElement).toContainElement(price);
        expect(title.parentElement).not.toContainElement(toggle);
        expect(content).toBeInTheDocument();
        expect(content).not.toContainElement(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        return { title, price, toggle };
      });

      await user.click(sections[0].toggle);
      expect(sections[0].toggle).toHaveAttribute("aria-expanded", "true");
      expect(sections[1].toggle).toHaveAttribute("aria-expanded", "false");
      await user.click(sections[1].toggle);
      expect(sections[1].toggle).toHaveAttribute("aria-expanded", "true");
      for (const { title, price } of sections) {
        expect(title.parentElement).toContainElement(price);
        expect(price).toBeVisible();
      }
      await user.click(sections[0].toggle);
      expect(sections[0].toggle).toHaveAttribute("aria-expanded", "false");
      expect(sections[1].toggle).toHaveAttribute("aria-expanded", "true");
      await user.click(sections[1].toggle);
      expect(sections[1].toggle).toHaveAttribute("aria-expanded", "false");

      for (const { title, price } of sections) {
        expect(title.parentElement).toContainElement(price);
        expect(price).toBeVisible();
      }
    },
  );

  it.each(["provider", "customer"] as const)(
    "shows one agreed work price and one empty state for the %s",
    async (mode) => {
      const { user } = setup({ mode, totalAmountRubles: 15000 });
      const work = screen.getByRole("region", { name: "Стоимость работ" });
      const heading = within(work).getByRole("heading", {
        name: "Цена работ",
      });
      expect(heading).toBeVisible();
      const price = within(work).getByText(normalizedRubles(15000));
      const priceFontSize = getComputedStyle(price).fontSize;
      expect(heading.parentElement).toContainElement(price);
      expect(within(work).getAllByText(normalizedRubles(15000))).toHaveLength(
        1,
      );
      await user.click(
        within(work).getByRole("button", {
          name: "Развернуть: Стоимость работ",
        }),
      );
      expect(within(work).getAllByText(normalizedRubles(15000))).toHaveLength(
        1,
      );
      expect(within(work).getByText(normalizedRubles(15000))).toBe(price);
      expect(heading.parentElement).toContainElement(price);
      expect(getComputedStyle(price).fontSize).toBe(priceFontSize);
      expect(within(work).getAllByText("Оплат пока нет")).toHaveLength(1);
      expect(
        within(work).queryByText(/Оплачено|Осталось|Справочная цена/),
      ).not.toBeInTheDocument();
      expect(
        within(work).queryByRole("button", { name: "Изменить цену" }) != null,
      ).toBe(mode === "provider");
      await user.click(
        within(work).getByRole("button", { name: "Свернуть: Стоимость работ" }),
      );
      expect(within(work).getByText(normalizedRubles(15000))).toBe(price);
      expect(heading.parentElement).toContainElement(price);
      expect(getComputedStyle(price).fontSize).toBe(priceFontSize);
    },
  );

  it.each([
    {
      paid: 5000,
      caption: `Оплачено ${normalizedRubles(5000)} · Осталось ${normalizedRubles(10000)}`,
    },
    { paid: 15000, caption: "Оплачено полностью" },
    { paid: 18000, caption: `Переплата за работы ${normalizedRubles(3000)}` },
  ])(
    "keeps the work payment state clear for $paid rubles paid",
    ({ paid, caption }) => {
      setup({ totalAmountRubles: 15000, paidAmountRubles: paid });
      const work = screen.getByRole("region", { name: "Стоимость работ" });
      expect(within(work).getByText(caption)).toBeVisible();
      expect(within(work).getAllByText(normalizedRubles(15000))).toHaveLength(
        1,
      );
      expect(
        within(work).queryByText("Оплат пока нет"),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps the reference price in the price editor", async () => {
    const { user } = setup({ totalAmountRubles: 15000 });
    await user.click(
      screen.getByRole("button", { name: "Развернуть: Стоимость работ" }),
    );
    expect(
      screen.queryByText(/Справочная цена услуги/),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    const form = screen.getByRole("form", { name: "Изменение цены работ" });
    expect(
      within(form).getByText(
        `Справочная цена услуги: ${normalizedRubles(12000)}`,
      ),
    ).toBeVisible();
    await user.click(within(form).getByRole("button", { name: "Отмена" }));
    expect(
      screen.queryByText(/Справочная цена услуги/),
    ).not.toBeInTheDocument();
  });

  it("shows the full request cost and allows both sections to stay open independently", async () => {
    const { user } = setup();
    const summary = screen.getByRole("region", { name: "Итог по заявке" });
    expect(within(summary).getAllByText(normalizedRubles(20100))).toHaveLength(
      2,
    );
    expect(
      screen.getByRole("button", { name: "Развернуть: Стоимость работ" }),
    ).toHaveAttribute("aria-expanded", "false");
    await user.click(
      screen.getByRole("button", { name: "Развернуть: Стоимость работ" }),
    );
    expect(
      screen.getByRole("button", { name: "Свернуть: Стоимость работ" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }),
    ).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    expect(
      screen.getByRole("button", { name: "Свернуть: Дополнительные расходы" }),
    ).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Свернуть: Дополнительные расходы" }));
    expect(
      screen.getByRole("button", { name: "Свернуть: Стоимость работ" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(within(summary).getAllByText(normalizedRubles(20100))).toHaveLength(
      2,
    );
  });

  it.each(["крестик", "отмена"] as const)("keeps an expense draft while collapsed and clears it when closed via %s", async (action) => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    await user.click(screen.getByRole("button", { name: "Добавить расход" }));
    await user.type(
      screen.getByRole("textbox", { name: "Название расхода" }),
      "Выезд специалиста",
    );
    await user.type(screen.getByRole("textbox", { name: "Сумма, ₽" }), "2500");
    await user.click(screen.getByRole("button", { name: "Свернуть: Дополнительные расходы" }));
    await user.click(
      screen.getByRole("button", {
        name: "Развернуть: Дополнительные расходы",
      }),
    );
    expect(
      screen.getByRole("textbox", { name: "Название расхода" }),
    ).toHaveValue("Выезд специалиста");
    expect(screen.getByRole("textbox", { name: "Сумма, ₽" })).toHaveValue(
      "2500",
    );
    const form = screen.getByRole("form", { name: "Новый расход" });
    const close = within(form).getByRole("button", {
      name: "Закрыть форму расхода",
    });
    expect(
      within(form).getByRole("heading", { name: "Новый расход" }).parentElement,
    ).toContainElement(close);
    const cancel = within(form).getByRole("button", { name: "Отмена" });
    await user.click(action === "крестик" ? close : cancel);
    expect(screen.queryByRole("form", { name: "Новый расход" })).toBeNull();
    expect(paymentApi.addProRequestPayment).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Добавить расход" }));
    const reopenedForm = screen.getByRole("form", { name: "Новый расход" });
    expect(
      within(reopenedForm).getByRole("textbox", { name: "Название расхода" }),
    ).toHaveValue("");
    expect(
      within(reopenedForm).getByRole("textbox", { name: "Сумма, ₽" }),
    ).toHaveValue("");
  });

  it.each(["provider", "customer"] as const)(
    "adds a contract payment through the existing %s API",
    async (mode) => {
      const onChanged = vi.fn();
      const { user } = setup({
        mode,
        conversationId: "conversation-a",
        onChanged,
      });
      const work = screen.getByRole("region", { name: "Стоимость работ" });
      expect(
        within(
          screen.getByRole("region", { name: "Итог по заявке" }),
        ).queryByRole("button", { name: "Добавить оплату" }),
      ).not.toBeInTheDocument();
      expect(
        within(work).queryByRole("button", { name: "Добавить оплату" }),
      ).not.toBeInTheDocument();
      await user.click(
        within(work).getByRole("button", {
          name: "Развернуть: Стоимость работ",
        }),
      );
      await waitFor(() => {
        expect(work.querySelector(".MuiCollapse-root")).toHaveClass(
          "MuiCollapse-entered",
        );
      });
      await user.click(
        within(work).getByRole("button", { name: "Добавить оплату" }),
      );
      expect(
        within(work).queryByRole("button", { name: "Добавить оплату" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Свернуть: Стоимость работ" }),
      ).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => {
        expect(
          screen
            .getByRole("form", { name: "Новая оплата за работы" })
            .closest(".MuiCollapse-root"),
        ).toHaveClass("MuiCollapse-entered");
      });
      expect(screen.getByRole("textbox", { name: "Сумма, ₽" })).toHaveFocus();
      await user.type(
        screen.getByRole("textbox", { name: "Сумма, ₽" }),
        "6000",
      );
      await user.type(
        screen.getByRole("textbox", { name: "Назначение платежа" }),
        "Аванс",
      );
      await user.click(
        screen.getByRole("button", { name: "Добавить оплату за работы" }),
      );
      const payload = {
        amountRubles: 6000,
        comment: "Аванс",
        type: "CONTRACT",
      };
      if (mode === "provider") {
        expect(paymentApi.addProRequestPayment).toHaveBeenCalledWith(
          "request-1",
          payload,
        );
        expect(paymentApi.addCustomerRequestPayment).not.toHaveBeenCalled();
      } else {
        expect(paymentApi.addCustomerRequestPayment).toHaveBeenCalledWith(
          "request-1",
          payload,
          "conversation-a",
        );
        expect(paymentApi.addProRequestPayment).not.toHaveBeenCalled();
      }
      expect(onChanged).toHaveBeenCalledOnce();
      expect(paymentApi.markProRequestPaymentPaid).not.toHaveBeenCalled();
      expect(paymentApi.markCustomerRequestPaymentPaid).not.toHaveBeenCalled();
    },
  );

  it.each(["крестик", "отмена"] as const)("keeps the work payment draft when collapsed and clears it when closed via %s", async (action) => {
    const { user } = setup();
    const work = screen.getByRole("region", { name: "Стоимость работ" });
    await user.click(
      within(work).getByRole("button", { name: "Развернуть: Стоимость работ" }),
    );
    await waitFor(() => {
      expect(work.querySelector(".MuiCollapse-root")).toHaveClass(
        "MuiCollapse-entered",
      );
    });
    await user.click(
      within(work).getByRole("button", { name: "Добавить оплату" }),
    );
    const form = within(work).getByRole("form", {
      name: "Новая оплата за работы",
    });
    await user.type(
      within(form).getByRole("textbox", { name: "Сумма, ₽" }),
      "2500",
    );
    await user.type(
      within(form).getByRole("textbox", { name: "Назначение платежа" }),
      "Черновик аванса",
    );
    await user.click(
      within(work).getByRole("button", { name: "Свернуть: Стоимость работ" }),
    );
    await user.click(
      within(work).getByRole("button", { name: "Развернуть: Стоимость работ" }),
    );
    await waitFor(() => {
      expect(work.querySelector(".MuiCollapse-root")).toHaveClass(
        "MuiCollapse-entered",
      );
    });
    expect(within(form).getByRole("textbox", { name: "Сумма, ₽" })).toHaveValue(
      "2500",
    );
    expect(
      within(form).getByRole("textbox", { name: "Назначение платежа" }),
    ).toHaveValue("Черновик аванса");
    const close = within(form).getByRole("button", {
      name: "Закрыть форму оплаты",
    });
    expect(
      within(form).getByRole("heading", { name: "Новая оплата за работы" })
        .parentElement,
    ).toContainElement(close);
    const cancel = within(form).getByRole("button", { name: "Отмена" });
    await user.click(action === "крестик" ? close : cancel);
    expect(within(work).queryByRole("form")).not.toBeInTheDocument();
    expect(
      within(work).getByRole("button", { name: "Добавить оплату" }),
    ).toBeVisible();
    expect(paymentApi.addProRequestPayment).not.toHaveBeenCalled();
    await user.click(
      within(work).getByRole("button", { name: "Добавить оплату" }),
    );
    const reopenedForm = within(work).getByRole("form", {
      name: "Новая оплата за работы",
    });
    expect(
      within(reopenedForm).getByRole("textbox", { name: "Сумма, ₽" }),
    ).toHaveValue("");
    expect(
      within(reopenedForm).getByRole("textbox", { name: "Назначение платежа" }),
    ).toHaveValue("");
  });

  it("preserves the form and allows retry when saving an expense fails", async () => {
    vi.mocked(paymentApi.addProRequestPayment).mockRejectedValueOnce(
      new Error("Не удалось сохранить расход"),
    );
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    await user.click(screen.getByRole("button", { name: "Добавить расход" }));
    await user.type(
      screen.getByRole("textbox", { name: "Название расхода" }),
      "Выезд",
    );
    await user.type(screen.getByRole("textbox", { name: "Сумма, ₽" }), "3000");
    await user.click(screen.getByRole("button", { name: "Сохранить расход" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось сохранить расход",
    );
    expect(
      screen.getByRole("textbox", { name: "Название расхода" }),
    ).toHaveValue("Выезд");
    expect(screen.getByRole("textbox", { name: "Сумма, ₽" })).toHaveValue(
      "3000",
    );
    expect(
      screen.getByRole("button", { name: "Сохранить расход" }),
    ).toBeEnabled();
  });

  it.each(["provider", "customer"] as const)(
    "confirms the exact expense and waits for refreshed data before checking it for the %s",
    async (mode) => {
      const onChanged = vi.fn();
      const { user, props, rerender } = setup({
        mode,
        payments: [expense],
        conversationId: "conversation-a",
        onChanged,
      });
      await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
      const checkbox = screen.getByRole("checkbox", {
        name: /Оплата: Услуги инженера/,
      });
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      const dialog = screen.getByRole("dialog", {
        name: "Отметить как оплаченное?",
      });
      expect(dialog).toHaveTextContent(
        `Услуги инженера: ${normalizedRubles(3000)}`,
      );
      expect(paymentApi.markProRequestPaymentPaid).not.toHaveBeenCalled();
      expect(paymentApi.markCustomerRequestPaymentPaid).not.toHaveBeenCalled();
      await user.click(
        within(dialog).getByRole("button", { name: "Оплачено" }),
      );
      if (mode === "provider") {
        expect(paymentApi.markProRequestPaymentPaid).toHaveBeenCalledWith(
          "request-1",
          "expense-1",
        );
        expect(
          paymentApi.markCustomerRequestPaymentPaid,
        ).not.toHaveBeenCalled();
      } else {
        expect(paymentApi.markCustomerRequestPaymentPaid).toHaveBeenCalledWith(
          "request-1",
          "expense-1",
          "conversation-a",
        );
        expect(paymentApi.markProRequestPaymentPaid).not.toHaveBeenCalled();
      }
      expect(onChanged).toHaveBeenCalledOnce();
      expect(checkbox).not.toBeChecked();
      rerender(
        <ConfirmProvider>
          <RequestPayments
            {...props}
            payments={[{ ...expense, paidAt: "2026-11-16T08:00:00Z" }]}
          />
        </ConfirmProvider>,
      );
      const paidCheckbox = await screen.findByRole("checkbox", {
        name: /Оплачено: Услуги инженера/,
      });
      expect(paidCheckbox).toBeChecked();
      expect(paidCheckbox).toBeDisabled();
      expect(
        within(screen.getByRole("region", { name: "Дополнительные расходы" })).getByText(
          "Оплачено полностью",
        ),
      ).toBeVisible();
    },
  );

  it.each(["provider", "customer"] as const)(
    "shows one receipt total and keeps it in the header when collapsed for the %s",
    async (mode) => {
      const { user } = setup({ mode });
      const expenses = screen.getByRole("region", { name: "Дополнительные расходы" });
      const heading = within(expenses).getByRole("heading", {
        name: "Дополнительные расходы",
      });
      const price = within(expenses).getByText(normalizedRubles(8100));
      const priceFontSize = getComputedStyle(price).fontSize;
      expect(heading.parentElement).toContainElement(price);
      await user.click(within(expenses).getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
      expect(within(expenses).getAllByRole("checkbox")).toHaveLength(3);
      expect(
        within(expenses).getAllByText(normalizedRubles(8100)),
      ).toHaveLength(1);
      expect(
        within(expenses).queryByText(/Не оплачено|Исполнитель|3 расхода/),
      ).not.toBeInTheDocument();
      const caption = `Оплачено ${normalizedRubles(0)} · Осталось ${normalizedRubles(8100)}`;
      expect(within(expenses).getByText(caption)).toBeVisible();
      expect(
        within(expenses).queryByRole("button", { name: /Отметить/ }),
      ).not.toBeInTheDocument();
      expect(
        within(expenses).getByRole("button", { name: "Добавить расход" }),
      ).toHaveTextContent("Добавить расход");
      await user.click(
        within(expenses).getByRole("button", { name: "Свернуть: Дополнительные расходы" }),
      );
      expect(within(expenses).getByText(normalizedRubles(8100))).toBe(price);
      expect(heading.parentElement).toContainElement(price);
      expect(getComputedStyle(price).fontSize).toBe(priceFontSize);
      expect(within(expenses).getByText(caption)).toBeVisible();
      await user.click(
        within(expenses).getByRole("button", { name: "Развернуть: Дополнительные расходы" }),
      );
      expect(within(expenses).getByText(normalizedRubles(8100))).toBe(price);
      expect(within(expenses).getAllByRole("checkbox")).toHaveLength(3);
    },
  );

  it("leaves the expense unchecked when confirmation is cancelled", async () => {
    const { user } = setup({ payments: [expense] });
    await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    const checkbox = screen.getByRole("checkbox", {
      name: /Оплата: Услуги инженера/,
    });
    await user.click(checkbox);
    const dialog = screen.getByRole("dialog", {
      name: "Отметить как оплаченное?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeEnabled();
    expect(paymentApi.markProRequestPaymentPaid).not.toHaveBeenCalled();
    expect(paymentApi.markCustomerRequestPaymentPaid).not.toHaveBeenCalled();
  });

  it.each(["CONTRACT", "OTHER"] as const)(
    "shows the saved payment date rather than the creation date for %s rows",
    async (type) => {
      const { user } = setup({
        payments: [
          {
            ...expense,
            type,
            createdAt: "2026-11-10T08:00:00Z",
            paidAt: "2026-11-16T08:00:00Z",
          },
          {
            ...expense,
            id: "unpaid",
            type,
            comment: "Ожидающий платёж",
          },
        ],
      });
      await user.click(screen.getByRole("button", { name: type === "CONTRACT" ? "Развернуть: Стоимость работ" : "Развернуть: Дополнительные расходы" }));
      const paidRow = screen.getByRole("group", { name: "Услуги инженера" });
      const date = within(paidRow).getByText(/16\.11\.2026/);
      expect(date).toHaveAttribute("datetime", "2026-11-16T08:00:00Z");
      expect(date).toHaveAttribute(
        "title",
        expect.stringMatching(/^Оплачено /),
      );
      expect(
        within(paidRow).queryByText(/10\.11\.2026/),
      ).not.toBeInTheDocument();
      expect(
        within(paidRow).getByRole("checkbox", {
          name: /Оплачено: Услуги инженера/,
        }),
      ).toBeChecked();
      const unpaidRow = screen.getByRole("group", { name: "Ожидающий платёж" });
      expect(unpaidRow.querySelector("time")).not.toBeInTheDocument();
    },
  );

  it("keeps a failed payment unchecked and allows retry", async () => {
    vi.mocked(paymentApi.markProRequestPaymentPaid).mockRejectedValueOnce(
      new Error("Не удалось отметить оплату"),
    );
    const onChanged = vi.fn();
    const { user } = setup({ payments: [expense], onChanged });
    await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    const checkbox = screen.getByRole("checkbox", {
      name: /Оплата: Услуги инженера/,
    });
    await user.click(checkbox);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Оплачено",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось отметить оплату",
    );
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeEnabled();
    expect(onChanged).not.toHaveBeenCalled();
    await user.click(checkbox);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Оплачено",
      }),
    );
    expect(paymentApi.markProRequestPaymentPaid).toHaveBeenCalledTimes(2);
    expect(onChanged).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the partial expense balance visible while rows are collapsed", async () => {
    const { user } = setup({
      payments: baseProps.payments.map((payment, index) =>
        index === 0 ? { ...payment, paidAt: "2026-11-16T08:00:00Z" } : payment,
      ),
    });
    const expenses = screen.getByRole("region", { name: "Дополнительные расходы" });
    const caption = `Оплачено ${normalizedRubles(3000)} · Осталось ${normalizedRubles(5100)}`;
    expect(within(expenses).getByText(caption)).toBeVisible();
    await user.click(within(expenses).getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    await user.click(
      within(expenses).getByRole("button", { name: "Свернуть: Дополнительные расходы" }),
    );
    expect(within(expenses).getByText(caption)).toBeVisible();
    expect(within(expenses).getAllByText(normalizedRubles(8100))).toHaveLength(
      1,
    );
  });

  it("shows an empty receipt without payment controls", async () => {
    const { user } = setup({ payments: [] });
    const expenses = screen.getByRole("region", { name: "Дополнительные расходы" });
    await user.click(within(expenses).getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
    expect(within(expenses).getByText("Расходов пока нет")).toBeVisible();
    expect(within(expenses).queryByText("Оплата")).not.toBeInTheDocument();
    expect(within(expenses).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      within(expenses).getByText(
        `Оплачено ${normalizedRubles(0)} · Осталось ${normalizedRubles(0)}`,
      ),
    ).toBeVisible();
    expect(
      within(expenses).getByRole("button", { name: "Добавить расход" }),
    ).toBeEnabled();
  });

  it.each([{ busy: true }, { isLocked: true }])(
    "prevents expense edits when the provider is busy or locked: %o",
    async (overrides) => {
      const { user } = setup(overrides);
      const expenses = screen.getByRole("region", { name: "Дополнительные расходы" });
      await user.click(within(expenses).getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
      within(expenses)
        .getAllByRole("checkbox")
        .forEach((checkbox) => {
          expect(checkbox).toBeDisabled();
        });
    },
  );

  it("lets the provider set the first price without client confirmation", async () => {
    const { user } = setup({
      mode: "provider",
      status: "DISCUSSING",
      lockedAt: null,
      totalAmountRubles: null,
      servicePriceRubles: null,
      remainingAmountRubles: null,
      conversationId: "conversation-a",
    });
    const summary = screen.getByRole("region", { name: "Итог по заявке" });
    expect(within(summary).getAllByText("—")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Развернуть: Стоимость работ" }));
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    expect(
      screen.getByRole("textbox", { name: "Цена работ, ₽" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Изменить цену" }),
    ).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Цена работ, ₽" }),
      "15000",
    );
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    expect(paymentApi.proposeProRequestPrice).toHaveBeenCalledWith(
      "request-1",
      15000,
    );
  });

  it("lets the provider change the current price from the renamed action", async () => {
    const onChanged = vi.fn();
    const { user, props, rerender } = setup({ onChanged });
    await user.click(
      screen.getByRole("button", { name: "Развернуть: Стоимость работ" }),
    );
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    const price = screen.getByRole("textbox", { name: "Цена работ, ₽" });
    expect(price).toHaveValue("12000");
    await user.clear(price);
    await user.type(price, "15000");
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    expect(paymentApi.proposeProRequestPrice).toHaveBeenCalledWith(
      "request-1",
      15000,
    );
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    rerender(
      <ConfirmProvider>
        <RequestPayments
          {...props}
          totalAmountRubles={15000}
          remainingAmountRubles={15000}
          priceProposal={null}
        />
      </ConfirmProvider>,
    );
    const work = screen.getByRole("region", { name: "Стоимость работ" });
    expect(within(work).getByText(normalizedRubles(15000))).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Итог по заявке" }))
        .getAllByText(normalizedRubles(23100)),
    ).toHaveLength(2);
    expect(screen.queryByText(/предлагает цену|согласован|подтвердить клиент/i)).not.toBeInTheDocument();
  });

  it("distinguishes a saved price from a failed refresh", async () => {
    const onChanged = vi.fn().mockRejectedValue(new Error("Сеть недоступна"));
    const { user } = setup({ onChanged });
    await user.click(screen.getByRole("button", { name: "Развернуть: Стоимость работ" }));
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    const price = screen.getByRole("textbox", { name: "Цена работ, ₽" });
    await user.clear(price);
    await user.type(price, "15000");
    await user.click(screen.getByRole("button", { name: "Изменить цену" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Цена сохранена, но не удалось обновить данные. Обновите страницу.",
    );
    expect(paymentApi.proposeProRequestPrice).toHaveBeenCalledOnce();
    expect(screen.queryByRole("form", { name: "Изменение цены работ" })).not.toBeInTheDocument();
  });

  it.each([null, 12000])(
    "never offers the customer a price editor with agreed price %s",
    async (totalAmountRubles) => {
      const { user } = setup({
        mode: "customer",
        totalAmountRubles,
        canProposePrice: true,
      });
      await user.click(
        screen.getByRole("button", { name: "Развернуть: Стоимость работ" }),
      );
      expect(
        screen.queryByRole("button", { name: /Изменить цену|Предложить цену/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: "Цена работ, ₽" }),
      ).not.toBeInTheDocument();
      expect(paymentApi.proposeProRequestPrice).not.toHaveBeenCalled();
    },
  );

  it.each(["provider", "customer"] as const)(
    "does not show a legacy price approval flow to the %s",
    async (mode) => {
      const { user } = setup({
        mode,
        totalAmountRubles: null,
        remainingAmountRubles: null,
        priceProposal: {
          id: "proposal",
          amountRubles: 15000,
          authorSide: "PROVIDER",
        } as RequestPaymentsProps["priceProposal"],
        canProposePrice: true,
        canAcceptPrice: true,
      });
      await user.click(screen.getByRole("button", { name: "Развернуть: Стоимость работ" }));
      const work = screen.getByRole("region", { name: "Стоимость работ" });
      expect(within(work).getByText("Цена пока не установлена")).toBeVisible();
      expect(screen.queryByText(/предлагает цену|согласован|подтвердить клиент/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Принять/ })).not.toBeInTheDocument();
      if (mode === "provider") {
        expect(within(work).getByText(/Ранее указано 15\s*000\s*₽/)).toBeVisible();
        await user.click(within(work).getByRole("button", { name: "Изменить цену" }));
        expect(within(work).getByRole("textbox", { name: "Цена работ, ₽" })).toHaveValue("15000");
      } else {
        expect(within(work).queryByText(/Ранее указано/)).not.toBeInTheDocument();
        expect(within(work).queryByRole("button", { name: "Изменить цену" })).not.toBeInTheDocument();
      }
      expect(paymentApi.acceptCustomerRequestPrice).not.toHaveBeenCalled();
      expect(paymentApi.acceptProRequestPrice).not.toHaveBeenCalled();
    },
  );

  it("prefills the current saved price instead of an old pending proposal", async () => {
    const { user } = setup({
      totalAmountRubles: 12000,
      priceProposal: {
        id: "old-proposal",
        amountRubles: 15000,
        authorSide: "PROVIDER",
      } as RequestPaymentsProps["priceProposal"],
    });
    await user.click(screen.getByRole("button", { name: "Развернуть: Стоимость работ" }));
    const work = screen.getByRole("region", { name: "Стоимость работ" });
    expect(within(work).getByText(/Ранее указано 15\s*000\s*₽/)).toHaveTextContent(
      `Текущая цена работ — ${normalizedRubles(12000)}`,
    );
    await user.click(within(work).getByRole("button", { name: "Изменить цену" }));
    expect(within(work).getByRole("textbox", { name: "Цена работ, ₽" })).toHaveValue("12000");
  });

  it("does not show an accepted proposal as a pending price change", () => {
    setup({
      priceProposal: {
        id: "accepted-proposal",
        providerId: "provider-a",
        amountRubles: 12000,
        authorSide: "CUSTOMER",
        acceptedAt: "2026-11-15T10:00:00Z",
        createdAt: "2026-11-15T09:00:00Z",
      },
    });
    expect(
      screen.getByRole("heading", { name: "Цена работ" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Развернуть: Стоимость работ" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/предлагает цену работ/)).not.toBeInTheDocument();
  });

  it.each(["provider", "customer"] as const)(
    "uses receipt rows for work payments and confirms the selected payment for the %s",
    async (mode) => {
      const paidWork: RequestPaymentItemDto = {
        ...expense,
        id: "work-paid",
        type: "CONTRACT",
        comment: "Аванс",
        amountRubles: 1000,
        paidAt: "2026-11-15T23:02:00Z",
      };
      const pendingWork: RequestPaymentItemDto = {
        ...paidWork,
        id: "work-pending",
        comment: "Второй этап",
        amountRubles: 3000,
        paidAt: null,
      };
      const onChanged = vi.fn();
      const { user, props, rerender } = setup({
        mode,
        totalAmountRubles: 15000,
        paidAmountRubles: 1000,
        remainingAmountRubles: 14000,
        conversationId: "conversation-a",
        payments: [paidWork, pendingWork, ...baseProps.payments],
        onChanged,
      });
      const work = screen.getByRole("region", { name: "Стоимость работ" });
      await user.click(within(work).getByRole("button", { name: "Развернуть: Стоимость работ" }));
      expect(within(work).getByText("Оплата")).toBeVisible();
      expect(within(work).getAllByRole("checkbox")).toHaveLength(2);
      const paidCheckbox = within(work).getByRole("checkbox", {
        name: /Оплачено: Аванс/,
      });
      expect(paidCheckbox).toBeChecked();
      expect(paidCheckbox).toBeDisabled();
      expect(
        within(work).queryByText(/Клиент|Исполнитель|Не оплачено/),
      ).not.toBeInTheDocument();
      expect(
        within(work).queryByRole("button", { name: /Отметить/ }),
      ).not.toBeInTheDocument();
      const pendingCheckbox = within(work).getByRole("checkbox", {
        name: /Оплата: Второй этап/,
      });
      await user.click(pendingCheckbox);
      const dialog = screen.getByRole("dialog", {
        name: "Отметить как оплаченное?",
      });
      expect(dialog).toHaveTextContent(
        `Второй этап: ${normalizedRubles(3000)}`,
      );
      expect(pendingCheckbox).not.toBeChecked();
      expect(paymentApi.markProRequestPaymentPaid).not.toHaveBeenCalled();
      expect(paymentApi.markCustomerRequestPaymentPaid).not.toHaveBeenCalled();
      await user.click(
        within(dialog).getByRole("button", { name: "Оплачено" }),
      );
      if (mode === "provider") {
        expect(paymentApi.markProRequestPaymentPaid).toHaveBeenCalledWith(
          "request-1",
          "work-pending",
        );
        expect(
          paymentApi.markCustomerRequestPaymentPaid,
        ).not.toHaveBeenCalled();
      } else {
        expect(paymentApi.markCustomerRequestPaymentPaid).toHaveBeenCalledWith(
          "request-1",
          "work-pending",
          "conversation-a",
        );
        expect(paymentApi.markProRequestPaymentPaid).not.toHaveBeenCalled();
      }
      expect(onChanged).toHaveBeenCalledOnce();
      expect(pendingCheckbox).not.toBeChecked();
      rerender(
        <ConfirmProvider>
          <RequestPayments
            {...props}
            paidAmountRubles={4000}
            remainingAmountRubles={11000}
            payments={props.payments.map((payment) =>
              payment.id === "work-pending"
                ? { ...payment, paidAt: "2026-11-16T08:00:00Z" }
                : payment,
            )}
          />
        </ConfirmProvider>,
      );
      const savedCheckbox = await within(work).findByRole("checkbox", {
        name: /Оплачено: Второй этап/,
      });
      expect(savedCheckbox).toBeChecked();
      expect(savedCheckbox).toBeDisabled();
      expect(
        within(work).getByText(
          `Оплачено ${normalizedRubles(4000)} · Осталось ${normalizedRubles(11000)}`,
        ),
      ).toBeVisible();
    },
  );

  it("allows late payment recording after completion but not a new price", async () => {
    const { user } = setup({
      status: "COMPLETED",
      payments: [{ ...expense, type: "CONTRACT", comment: "Аванс" }],
    });
    expect(
      screen.getByText(
        "Работы завершены. Здесь можно зафиксировать поступившие оплаты.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Развернуть: Стоимость работ" }));
    expect(
      screen.getByRole("button", { name: "Добавить оплату" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Изменить цену" }),
    ).not.toBeInTheDocument();
    const payment = screen.getByRole("group", { name: "Аванс" });
    expect(
      within(payment).getByRole("checkbox", { name: /Оплата: Аванс/ }),
    ).toBeEnabled();
  });

  it.each(["CANCELLED", "CLOSED"] as const)(
    "keeps %s requests read-only",
    async (status) => {
      const { user } = setup({
        status,
        payments: [
          ...baseProps.payments,
          {
            ...expense,
            id: "work-pending",
            type: "CONTRACT",
            comment: "Аванс",
          },
        ],
      });
      await user.click(screen.getByRole("button", { name: "Развернуть: Стоимость работ" }));
      await user.click(screen.getByRole("button", { name: "Развернуть: Дополнительные расходы" }));
      expect(
        screen.queryByRole("button", { name: "Добавить оплату" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Добавить расход" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Отметить как оплачено" }),
      ).not.toBeInTheDocument();
      screen
        .getAllByRole("checkbox")
        .forEach((checkbox) => expect(checkbox).toBeDisabled());
    },
  );
});
