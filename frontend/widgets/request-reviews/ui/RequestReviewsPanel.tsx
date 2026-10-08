"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Paper, Rating, Stack, TextField, Typography } from "@mui/material";
import {
  createRequestReview,
  fetchRequestReviews,
  replyToReview,
  type ReviewDto,
} from "@/entities/review";
import type { RequestStatus } from "@/entities/request";

type Side = "customer" | "provider";

type Props = {
  requestId: string;
  status: RequestStatus;
  side: Side;
};

const REVIEWABLE = new Set<RequestStatus>(["ACCEPTED", "COMPLETED"]);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function ReviewCard({ review }: { review: ReviewDto }) {
  const title = review.direction === "CUSTOMER_TO_PROVIDER" ? "Отзыв заказчика" : "Оценка заказчика";
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title}</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Rating value={review.rating} readOnly size="small" />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {review.authorDisplayName} · {formatDate(review.createdAt)}
        </Typography>
      </Stack>
      {review.text ? <Typography variant="body2">{review.text}</Typography> : null}
      {review.replyText ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Ответ исполнителя: {review.replyText}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function RequestReviewsPanel({ requestId, status, side }: Props) {
  const [items, setItems] = useState<ReviewDto[]>([]);
  const [rating, setRating] = useState<number | null>(5);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canReview = REVIEWABLE.has(status);

  const load = useCallback(async () => {
    if (!canReview) return;
    try {
      setItems(await fetchRequestReviews(requestId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить отзывы");
    }
  }, [canReview, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canReview) return null;

  const mineDirection = side === "customer" ? "CUSTOMER_TO_PROVIDER" : "PROVIDER_TO_CUSTOMER";
  const ownReview = items.find((item) => item.direction === mineDirection) ?? null;
  const customerReview = items.find((item) => item.direction === "CUSTOMER_TO_PROVIDER") ?? null;
  const providerReview = items.find((item) => item.direction === "PROVIDER_TO_CUSTOMER") ?? null;

  async function submitReview() {
    if (!rating) {
      setError("Поставьте оценку от 1 до 5.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createRequestReview(requestId, { rating, text });
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить отзыв");
    } finally {
      setBusy(false);
    }
  }

  async function submitReply() {
    if (!customerReview || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await replyToReview(customerReview.id, reply.trim());
      setReply("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить ответ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Отзыв</Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {customerReview ? <ReviewCard review={customerReview} /> : null}
        {providerReview ? <ReviewCard review={providerReview} /> : null}
        {!ownReview ? (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              {side === "customer" ? "Оцените работу исполнителя" : "Оцените заказчика"}
            </Typography>
            <Rating
              value={rating}
              onChange={(_event, value) => setRating(value)}
            />
            <TextField
              label="Комментарий"
              value={text}
              onChange={(event) => setText(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <Button variant="contained" disabled={busy || !rating} onClick={() => void submitReview()} sx={{ alignSelf: "flex-start" }}>
              Отправить отзыв
            </Button>
          </Stack>
        ) : null}
        {side === "provider" && customerReview && !customerReview.replyText ? (
          <Stack spacing={1.5}>
            <TextField
              label="Ответ на отзыв"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <Button variant="outlined" disabled={busy || !reply.trim()} onClick={() => void submitReply()} sx={{ alignSelf: "flex-start" }}>
              Ответить
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
