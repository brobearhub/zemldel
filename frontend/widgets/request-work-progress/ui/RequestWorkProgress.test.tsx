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
