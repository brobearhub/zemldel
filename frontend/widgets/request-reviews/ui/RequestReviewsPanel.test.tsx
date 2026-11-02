import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestReview, fetchRequestReviews } from "@/entities/review";
import { RequestReviewsPanel } from "./RequestReviewsPanel";

vi.mock("@/entities/review", () => ({
  fetchRequestReviews: vi.fn(), createRequestReview: vi.fn(), replyToReview: vi.fn(),
}));

describe("request review consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.mocked(fetchRequestReviews).mockResolvedValue([]);
    vi.mocked(createRequestReview).mockResolvedValue({} as never);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it.each(["customer", "provider"] as const)("requires an explicit rating from %s", async (side) => {
    render(<RequestReviewsPanel requestId="a" status="COMPLETED" side={side} />);
    const submit = await screen.findByRole("button", { name: "Отправить отзыв" });
    expect(submit).toBeDisabled();
    expect(screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked && (radio as HTMLInputElement).value !== "")).toHaveLength(0);
    fireEvent.click(submit);
    expect(createRequestReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Оценка 3 из 5" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий" }), { target: { value: "Тестовый отзыв" } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(createRequestReview).toHaveBeenCalledWith("a", { rating: 3, text: "Тестовый отзыв" }));
  });

  it("does not expose a review form before existing reviews have loaded", async () => {
    let resolve!: (value: never[]) => void;
    vi.mocked(fetchRequestReviews).mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<RequestReviewsPanel requestId="a" status="COMPLETED" side="customer" />);
    expect(screen.queryByRole("button", { name: "Отправить отзыв" })).not.toBeInTheDocument();
    await act(async () => { resolve([]); });
    expect(await screen.findByRole("button", { name: "Отправить отзыв" })).toBeDisabled();
  });

  it("preserves the entered rating and comment when the view refreshes", async () => {
    render(<RequestReviewsPanel requestId="a" status="COMPLETED" side="provider" />);
    await screen.findByRole("button", { name: "Отправить отзыв" });
    fireEvent.click(screen.getByRole("radio", { name: "Оценка 4 из 5" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий" }), { target: { value: "Черновик" } });
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(fetchRequestReviews).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("radio", { name: "Оценка 4 из 5" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Комментарий" })).toHaveValue("Черновик");
  });
});
