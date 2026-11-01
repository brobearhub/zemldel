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
});
