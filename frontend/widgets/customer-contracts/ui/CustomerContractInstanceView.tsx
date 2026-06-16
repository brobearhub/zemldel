"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ContractRichEditor } from "@/widgets/pro-contracts/ui/ContractRichEditor";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import Link from "@/shared/ui/Link";

export type ContractFeedbackDto = {
  id: string;
  authorRole: "CUSTOMER" | "PROVIDER";
  body: string;
  createdAt: string;
};

export type CustomerContractInstanceDetail = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "CANCELLED";
  content: unknown;
  variableSnapshot?: unknown;
  requestId: string | null;
  providerId: string;
  pdfHash: string | null;
  signatures: Array<{ signerRole: "CUSTOMER" | "PROVIDER"; method: string; signedAt: string; docHash: string }>;
  feedback: ContractFeedbackDto[];
  commentThreads?: ContractCommentThreadDto[];
  updatedAt: string;
  createdAt: string;
};

type ContractCommentThreadDto = {
  id: string;
  anchor: unknown;
  quote: string | null;
  status: "OPEN" | "RESOLVED";
  comments: Array<{ id: string; authorRole: "CUSTOMER" | "PROVIDER"; body: string; createdAt: string }>;
  createdAt: string;
};

function statusLabel(status: CustomerContractInstanceDetail["status"]) {
  if (status === "SIGNED") return "Принят";
  if (status === "SENT") return "Отправлен";
  if (status === "CANCELLED") return "Отменён";
  return "Черновик";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CustomerContractInstanceView({ initial }: { initial: CustomerContractInstanceDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");

  const signedRoles = useMemo(() => new Set(initial.signatures.map((s) => s.signerRole)), [initial.signatures]);
  const canAct = initial.status === "SENT";
  const openThreads = (initial.commentThreads ?? []).filter((thread) => thread.status === "OPEN");
  const canSign = canAct && !signedRoles.has("CUSTOMER") && openThreads.length === 0;

  async function sign() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/contracts/instances/${initial.id}/sign`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string; code?: string; provider?: string } | { ok?: boolean } | null;
      if (!res.ok) {
        // Step-up is handled upstream by the route (403 with code), keep message user-friendly.
        setError(payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Не удалось подписать договор");
        if (res.status === 403 && payload && typeof payload === "object" && "code" in payload && payload.code === "STEP_UP_REQUIRED") {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          router.push(`/gosuslugi-mock?mode=verify&returnTo=${encodeURIComponent(returnTo)}`);
        }
        return;
      }
      setNotice("Договор принят. Перейдите к деталям заявки.");
      if (initial.requestId) {
        router.push(`/profile/requests/${initial.requestId}`);
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось подписать договор");
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback() {
    const body = remarks.trim();
    if (body.length < 3) {
      setError("Опишите замечания чуть подробнее.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/contracts/instances/${initial.id}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { ok?: boolean } | null;
      if (!res.ok) {
        setError(payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Не удалось отправить замечания");
        return;
      }
      setRemarks("");
      setNotice("Замечания отправлены. Договор возвращён на исправление.");
    } catch {
      setError("Не удалось отправить замечания");
    } finally {
      setBusy(false);
    }
  }

  async function createInlineComment(input: { anchor: Record<string, unknown>; quote: string; body: string }) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/contracts/instances/${initial.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { id?: string } | null;
      if (!res.ok) {
        setError(payload && "error" in payload && payload.error ? payload.error : "Не удалось добавить комментарий");
        return;
      }
      setNotice("Комментарий добавлен. Провайдер увидит его в договоре.");
    } catch {
      setError("Не удалось добавить комментарий");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ChatBodyWithSidePanelLayout
      rightWidth={480}
      middle={
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {notice ? <Alert severity="success">{notice}</Alert> : null}

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h5" fontWeight={800}>
                {initial.title}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={statusLabel(initial.status)} />
                {signedRoles.has("CUSTOMER") ? (
                  <Chip color="success" label="Вы приняли договор" />
                ) : (
                  <Chip color="warning" label="Ожидает вашего принятия" />
                )}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" disabled={busy || !canSign} onClick={() => void sign()}>
                  Принять договор
                </Button>
                {initial.requestId ? (
                  <Button component={Link} href={`/profile/requests/${initial.requestId}`} variant="outlined" disabled={busy}>
                    К заявке
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Typography fontWeight={800}>Текст договора</Typography>
              <ContractRichEditor
                value={initial.content}
                editable={false}
                commentable={canAct}
                variableSnapshot={initial.variableSnapshot}
                onCreateComment={(input) => void createInlineComment(input)}
              />
            </Stack>
          </Paper>
        </Stack>
      }
      right={
        <Paper
          variant="outlined"
          sx={{ p: 2.5, overflow: "auto", height: { xs: "auto", lg: "100%" }, minHeight: 0 }}
        >
          <Stack spacing={1.5}>
            <Typography fontWeight={800}>Комментарии</Typography>
            {openThreads.length > 0 ? (
              <Alert severity="info">Принятие станет доступно после обработки открытых комментариев.</Alert>
            ) : null}

            {initial.commentThreads?.length ? (
              <Stack spacing={1}>
                {initial.commentThreads.map((thread) => (
                  <Paper key={thread.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          size="small"
                          color={thread.status === "OPEN" ? "warning" : "success"}
                          label={thread.status === "OPEN" ? "Открыт" : "Закрыт"}
                        />
                        {thread.quote ? (
                          <Typography variant="body2" color="text.secondary">
                            &quot;{thread.quote}&quot;
                          </Typography>
                        ) : null}
                      </Stack>
                      {thread.comments.map((comment) => (
                        <Typography key={comment.id} variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          <strong>{comment.authorRole === "CUSTOMER" ? "Вы" : "Провайдер"}</strong> · {formatDateTime(comment.createdAt)}
                          {"\n"}
                          {comment.body}
                        </Typography>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : initial.feedback.length === 0 ? (
              <Typography color="text.secondary">Пока комментариев нет.</Typography>
            ) : (
              <Stack spacing={1}>
                {initial.feedback.map((f) => (
                  <Paper key={f.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {f.authorRole === "CUSTOMER" ? "Вы" : "Провайдер"} ·{" "}
                      <Typography component="span" variant="body2" color="text.secondary" fontWeight={500}>
                        {formatDateTime(f.createdAt)}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {f.body}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}

            <TextField
              label="Оставить замечания"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              minRows={3}
              multiline
              disabled={busy || !canAct}
              helperText={canAct ? "После отправки договор вернётся компании на доработку." : "Замечания доступны только для отправленного договора."}
            />

            <Button
              variant="outlined"
              color="warning"
              disabled={busy || !canAct || remarks.trim().length < 3}
              onClick={() => void sendFeedback()}
            >
              Отправить на доработку
            </Button>
          </Stack>
        </Paper>
      }
    />
  );
}

