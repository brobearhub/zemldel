"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import {
  clearPendingRequestDraft,
  buildRequestAuthHref,
  readPendingRequestDraft,
  formatReplyPreview,
  type RequestCustomerDto,
} from "@/entities/request";
import {
  PendingRequestAuthRequiredError,
  resumePendingRequest,
} from "@/entities/request/api/resume-pending-request";
import { deleteCustomerRequest } from "@/entities/request/api/customer-requests";
import { useConfirm } from "@/shared/ui/confirm";
import { CustomerRequestReplyDialog } from "./CustomerRequestReplyDialog";
import { CustomerRequestsBoard } from "./CustomerRequestsBoard";

type Props = {
  autoResumeEnabled?: boolean;
  onAutoResumeFinished?: () => void;
};

export function CustomerRequestsSection({
  autoResumeEnabled = false,
  onAutoResumeFinished,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState<RequestCustomerDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [hasResumeDraft, setHasResumeDraft] = useState(false);
  const [resumeAttempt, setResumeAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyItem, setReplyItem] = useState<RequestCustomerDto | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/requests", { cache: "no-store", signal });
      const payload = (await res.json().catch(() => null)) as
        | RequestCustomerDto[]
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            payload.error
            ? payload.error
            : "Не удалось загрузить заявки",
        );
      }
      setItems(payload as RequestCustomerDto[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      setError(e instanceof Error ? e.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!autoResumeEnabled) return;
    let cancelled = false;
    const draft = readPendingRequestDraft();
    setHasResumeDraft(Boolean(draft));
    if (!draft) {
      setResumeError(
        "Черновик заявки не найден в этой вкладке. Создайте новую заявку.",
      );
      onAutoResumeFinished?.();
      return;
    }
    setResuming(true);
    setResumeError(null);
    void resumePendingRequest(draft)
      .then((created) => {
        if (cancelled) return;
        clearPendingRequestDraft(draft.draftId);
        router.replace(`/profile/requests/${created.id}?created=1`);
        router.refresh();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof PendingRequestAuthRequiredError) {
          router.push(buildRequestAuthHref("signin", draft, true));
          return;
        }
        setResumeError(
          error instanceof Error
            ? error.message
            : "Не удалось отправить заявку. Черновик сохранён.",
        );
      })
      .finally(() => {
        if (!cancelled) setResuming(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoResumeEnabled, onAutoResumeFinished, router, resumeAttempt]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function openRequest(item: RequestCustomerDto) {
    if (item.status === "CLOSED") return;
    router.push(`/profile/requests/${item.id}`);
  }

  async function deleteRequest(item: RequestCustomerDto) {
    const confirmed = await confirm({
      title: "Удалить заявку?",
      description:
        "Заявка будет удалена безвозвратно. Это можно сделать только пока ни один исполнитель не ответил.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!confirmed) return;

    setDeletingId(item.id);
    setError(null);
    try {
      await deleteCustomerRequest(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить заявку");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Button
          variant="outlined"
          onClick={() => void refresh()}
          loading={refreshing}
          disabled={loading}
          sx={{
            whiteSpace: "normal",
            minHeight: 44,
            color: "text.primary",
            borderColor: "text.primary",
          }}
        >
          Обновить
        </Button>
      </Stack>

      {resuming ? (
        <Alert severity="info" role="status">
          Отправляем сохранённую заявку…
        </Alert>
      ) : null}
      {resumeError ? (
        <Alert
          severity="warning"
          action={
            hasResumeDraft ? (
              <Button
                color="inherit"
                disabled={resuming}
                onClick={() => setResumeAttempt((value) => value + 1)}
              >
                Повторить отправку
              </Button>
            ) : (
              <Button component={Link} href="/" color="inherit">
                Создать заявку
              </Button>
            )
          }
        >
          {resumeError}
        </Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 && !loading ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography
            gutterBottom
            sx={{
              fontWeight: 700,
            }}
          >
            Пока нет заявок
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
            }}
          >
            Вы можете создать заявку на главной странице, и она появится в ленте
            исполнителей.
          </Typography>
          <Button
            component={Link}
            href="/"
            sx={{ mt: 2, minHeight: 44 }}
            variant="contained"
          >
            На главную
          </Button>
        </Paper>
      ) : (
        <CustomerRequestsBoard
          items={items}
          deletingId={deletingId}
          sendingId={sendingId}
          onOpen={openRequest}
          onDelete={(item) => void deleteRequest(item)}
          onReply={setReplyItem}
        />
      )}
      <CustomerRequestReplyDialog
        item={replyItem}
        onClose={() => setReplyItem(null)}
        onSendingChange={(sending) =>
          setSendingId(sending && replyItem ? replyItem.id : null)
        }
        onSent={(sent, body) => {
          const customerLastMessage = formatReplyPreview(body);
          setItems((current) =>
            current.map((row) =>
              row.id === sent.id
                ? {
                    ...row,
                    awaitingProviderReply: true,
                    customerLastMessage:
                      customerLastMessage ?? row.customerLastMessage,
                  }
                : row,
            ),
          );
        }}
      />
    </Stack>
  );
}
