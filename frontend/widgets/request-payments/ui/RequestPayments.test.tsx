import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { RequestPayments } from "./RequestPayments";

describe("RequestPayments first customer proposal", () => {
  it("shows first proposal controls in validated pre-lock conversation", () => {
    render(
      <ConfirmProvider>
        <RequestPayments
          mode="customer"
          requestId="request-1"
          conversationId="conversation-a"
          status="DISCUSSING"
          lockedAt={null}
          totalAmountRubles={null}
          servicePriceRubles={null}
          priceProposal={null}
          canProposePrice
          canAcceptPrice={false}
          paidAmountRubles={0}
          remainingAmountRubles={null}
          payments={[]}
        />
      </ConfirmProvider>,
    );

    expect(
      screen.getByRole("textbox", { name: "Полная цена, ₽" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Предложить цену" }),
    ).toBeEnabled();
  });

  it("distinguishes a pending payment from its confirmation action", () => {
    render(<ConfirmProvider><RequestPayments mode="provider" requestId="r" status="COMPLETED" lockedAt="2026-11-01"
      totalAmountRubles={12000} servicePriceRubles={12000} priceProposal={null} canProposePrice={false} canAcceptPrice={false}
      paidAmountRubles={0} remainingAmountRubles={12000} payments={[{ id: "p", type: "CONTRACT", amountRubles: 1000, comment: "Аванс за подготовку документов", paidAt: null, createdAt: "2026-11-01", createdBySide: "CUSTOMER" }]} /></ConfirmProvider>);
    expect(screen.getByText("Аванс за подготовку документов")).toBeInTheDocument();
    expect(screen.getByText("Не оплачено")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отметить как оплачено" })).toHaveTextContent("Отметить оплату");
    expect(screen.queryByText("Оплачено", { exact: true })).not.toBeInTheDocument();
  });

  it("shows final price copy while keeping late payment recording available", () => {
    render(
      <ConfirmProvider>
        <RequestPayments
          mode="provider" requestId="completed" status="COMPLETED" lockedAt="2026-11-01"
          totalAmountRubles={12000} servicePriceRubles={12000} priceProposal={null}
          canProposePrice canAcceptPrice={false} paidAmountRubles={0}
          remainingAmountRubles={12000} payments={[]}
        />
      </ConfirmProvider>,
    );
    expect(screen.getByText("Работы завершены. Здесь можно зафиксировать поступившие оплаты.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Полная цена, ₽" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить оплату" })).toBeEnabled();
    expect(screen.queryByText(/Одна сторона предлагает цену/)).not.toBeInTheDocument();
  });
});
