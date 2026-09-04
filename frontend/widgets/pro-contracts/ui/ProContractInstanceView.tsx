"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { ChatBodyWithSidePanelLayout } from "@/widgets/chat/ui/ChatBodyWithSidePanelLayout";
import {
  ContractRichEditor,
  normalizeContractEditorContent,
  type ContractBlockOption,
  type ContractEditorContent,
} from "./ContractRichEditor";

export type ProContractInstanceDetail = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "CANCELLED";
  content: unknown;
  variableSnapshot?: unknown;
  requestId: string | null;
  customerUserId: string | null;
  pdfHash: string | null;
  signatures: Array<{ signerRole: "CUSTOMER" | "PROVIDER"; method: string; signedAt: string; docHash: string }>;
  feedback: Array<{ id: string; authorRole: "CUSTOMER" | "PROVIDER"; body: string; createdAt: string }>;
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

function statusLabel(status: ProContractInstanceDetail["status"]) {
  if (status === "SIGNED") return "Принят клиентом";
  if (status === "SENT") return "Отправлен";
  if (status === "CANCELLED") return "Отменён";
  return "Черновик";
}

export function ProContractInstanceView({ initial, rightWidth }: { initial: ProContractInstanceDetail; rightWidth?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState<ContractEditorContent>(() => normalizeContractEditorContent(initial.content));
  const [blocks, setBlocks] = useState<ContractBlockOption[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const signedRoles = useMemo(() => new Set(initial.signatures.map((s) => s.signerRole)), [initial.signatures]);
  const canEdit = initial.status !== "SIGNED" && initial.status !== "CANCELLED";
  const canSend = initial.status === "DRAFT";
  const openThreads = (initial.commentThreads ?? []).filter((thread) => thread.status === "OPEN");

  useEffect(() => {
    fetch("/api/pro/contracts/blocks")
      .then((res) => (res.ok ? (res.json() as Promise<ContractBlockOption[]>) : []))
      .then((rows) => setBlocks(rows))
      .catch(() => setBlocks([]));
  }, []);

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/instances/${initial.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { ok?: boolean } | null;
      if (!res.ok) {
        setError(payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "Не удалось сохранить");
        return;
      }
      setNotice("Сохранено. Обновите страницу, чтобы увидеть обновлённый статус и замечания.");
    } catch {
      setError("Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function sendToCustomer() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/instances/${initial.id}/send`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { ok?: boolean } | null;
      if (!res.ok) {
        setError(payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "Не удалось отправить");
        return;
      }
      setNotice("Отправлено клиенту. Обновите страницу, чтобы увидеть статус.");
    } catch {
      setError("Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function reply(threadId: string) {
    const body = (replyDrafts[threadId] ?? "").trim();
    if (body.length < 3) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/instances/${initial.id}/comments/${threadId}/replies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Не удалось отправить ответ");
      setReplyDrafts((drafts) => ({ ...drafts, [threadId]: "" }));
      setNotice("Ответ добавлен. Обновите страницу, чтобы увидеть комментарий.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось отправить ответ");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(threadId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/instances/${initial.id}/comments/${threadId}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error("Не удалось закрыть комментарий");
      setNotice("Комментарий закрыт. Обновите страницу, чтобы увидеть статус.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось закрыть комментарий");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ChatBodyWithSidePanelLayout
      rightWidth={rightWidth ?? 480}
      middle={
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {notice ? <Alert severity="success">{notice}</Alert> : null}

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h5" sx={{
                fontWeight: 800
              }}>
                {initial.title}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap"
                }}>
                <Chip label={statusLabel(initial.status)} />
                {signedRoles.has("CUSTOMER") ? (
                  <Chip color="success" label="Клиент принял" />
                ) : (
                  <Chip color="warning" label="Клиент ещё не принял" />
                )}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap sx={{
                flexWrap: "wrap"
              }}>
                <Button variant="contained" disabled={busy || !canSend} onClick={() => void sendToCustomer()}>
                  Отправить клиенту
                </Button>
                <Button variant="outlined" disabled={busy || !canEdit} onClick={() => void saveDraft()}>
                  Сохранить черновик
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Typography sx={{
                fontWeight: 800
              }}>Редактор договора</Typography>
              <TextField
                label="Название"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy || !canEdit}
                fullWidth
              />
              <ContractRichEditor
                value={content}
                editable={canEdit && !busy}
                blocks={blocks}
                variableSnapshot={initial.variableSnapshot}
                onChange={setContent}
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
            <Typography sx={{
              fontWeight: 800
            }}>Комментарии</Typography>
            {openThreads.length > 0 ? (
              <Alert severity="warning">Перед принятием договора закройте открытые комментарии.</Alert>
            ) : null}

            {initial.commentThreads?.length ? (
              <Stack spacing={1}>
                {initial.commentThreads.map((thread) => (
                  <Paper key={thread.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems: "center",
                          flexWrap: "wrap"
                        }}>
                        <Chip
                          size="small"
                          color={thread.status === "OPEN" ? "warning" : "success"}
                          label={thread.status === "OPEN" ? "Открыт" : "Закрыт"}
                        />
                        {thread.quote ? (
                          <Typography variant="body2" sx={{
                            color: "text.secondary"
                          }}>
                            &quot;{thread.quote}&quot;
                          </Typography>
                        ) : null}
                      </Stack>
                      {thread.comments.map((comment) => (
                        <Typography key={comment.id} variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          <strong>{comment.authorRole === "CUSTOMER" ? "Клиент" : "Провайдер"}</strong> ·{" "}
                          {formatDateTime(comment.createdAt)}
                          {"\n"}
                          {comment.body}
                        </Typography>
                      ))}
                      {thread.status === "OPEN" ? (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            size="small"
                            label="Ответ"
                            value={replyDrafts[thread.id] ?? ""}
                            onChange={(event) =>
                              setReplyDrafts((drafts) => ({ ...drafts, [thread.id]: event.target.value }))
                            }
                            fullWidth
                          />
                          <Button
                            variant="outlined"
                            disabled={busy || (replyDrafts[thread.id] ?? "").trim().length < 3}
                            onClick={() => void reply(thread.id)}
                          >
                            Ответить
                          </Button>
                          <Button variant="contained" disabled={busy} onClick={() => void resolve(thread.id)}>
                            Закрыть
                          </Button>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : initial.feedback?.length ? (
              <Stack spacing={1}>
                {initial.feedback.map((f) => (
                  <Paper key={f.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{
                      fontWeight: 700
                    }}>
                      {f.authorRole === "CUSTOMER" ? "Клиент" : "Провайдер"} ·{" "}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 500
                        }}>
                        {formatDateTime(f.createdAt)}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {f.body}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography sx={{
                color: "text.secondary"
              }}>Комментариев пока нет.</Typography>
            )}
          </Stack>
        </Paper>
      }
    />
  );
}

