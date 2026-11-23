import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { RequestWorkProgress } from "./RequestWorkProgress";

afterEach(cleanup);

describe("empty progress at delivery and completion", () => {
  it.each(["ACCEPTANCE_PENDING", "ACCEPTED", "COMPLETED"])("does not invite a provider to add stages at %s", (status) => {
    render(<ConfirmProvider><RequestWorkProgress mode="provider" requestId="a" requestStatus={status} stages={[]} statusOptions={[]} onRefresh={vi.fn()} /></ConfirmProvider>);
    expect(screen.queryByText(/Добавьте первый этап/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Этап" })).not.toBeInTheDocument();
    expect(screen.getByText(/В этой заявке нет опубликованных этапов/)).toBeInTheDocument();
  });
});

it("allows a provider to prepare stages before the customer joins a private request", () => {
  render(
    <ConfirmProvider>
      <RequestWorkProgress mode="provider" requestId="private" requestStatus="DISCUSSING" providerWorkStatus="PLANNED"
        stages={[]} statusOptions={[]} onRefresh={vi.fn()} />
    </ConfirmProvider>,
  );
  expect(screen.getByRole("button", { name: "Этап" })).toBeVisible();
});

it("shows published work progress to a joined customer without stage management controls", () => {
  render(
    <ConfirmProvider>
      <RequestWorkProgress mode="customer" requestId="private" requestStatus="DISCUSSING" providerWorkStatus="DONE"
        stages={[]} statusOptions={[]} onRefresh={vi.fn()} />
    </ConfirmProvider>,
  );
  expect(screen.getByText("Прогресс")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Этап" })).not.toBeInTheDocument();
});
