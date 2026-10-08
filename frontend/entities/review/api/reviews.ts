import type { ReviewDto, ReviewListDto } from "@/entities/review/dto/review.dto";

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && payload && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : payload && typeof payload === "object" && payload && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : fallbackMessage;
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchRequestReviews(requestId: string): Promise<ReviewDto[]> {
  const res = await fetch(`/api/requests/${requestId}/reviews`, { cache: "no-store" });
  return parseJson<ReviewDto[]>(res, "Не удалось загрузить отзывы");
}

export async function createRequestReview(requestId: string, input: { rating: number; text: string }): Promise<ReviewDto> {
  const res = await fetch(`/api/requests/${requestId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: input.rating, text: input.text }),
  });
  return parseJson<ReviewDto>(res, "Не удалось отправить отзыв");
}

export async function replyToReview(reviewId: string, text: string): Promise<ReviewDto> {
  const res = await fetch(`/api/reviews/${reviewId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson<ReviewDto>(res, "Не удалось отправить ответ");
}
