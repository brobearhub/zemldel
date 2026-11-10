"use client";

import { useEffect, useRef, useState } from "react";
import { MessengerComposer } from "./MessengerComposer";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, lighten } from "@mui/material/styles";
import type { ChatMessageDto } from "@/entities/chat/dto/chat.dto";

export type ChatReplyTarget = {
  messageId: string;
  senderLabel: string;
  bodySnippet: string;
};

export type ChatRenderableRow =
  | { kind: "message"; message: ChatMessageDto }
  | {
      kind: "pending";
      clientMessageId: string;
      body: string;
      replyToPreview?: { senderLabel: string; snippet: string };
    }
  | {
      kind: "failed";
      clientMessageId: string;
      body: string;
      error?: string;
      retryable?: boolean;
      replyToPreview?: { senderLabel: string; snippet: string };
    };

type Props = {
  rows: ChatRenderableRow[];
  currentUserId: string;
  draft: string;
  onDraftChange: (value: string) => void;
  pendingReply: ChatReplyTarget | null;
  onPendingReplyChange: (next: ChatReplyTarget | null) => void;
  onSend: () => void;
  onRetry: (clientMessageId: string) => void;
  onReplyToMessage: (message: ChatMessageDto) => void;
  disabled?: boolean;
  sending?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  inputPlaceholder?: string;
  autoFocusInput?: boolean;
  appearance?: "default" | "messenger";
  initialUnreadCount?: number;
};

function ReplyPreviewBlock({
  senderLabel,
  snippet,
  tone = "default",
}: {
  senderLabel: string;
  snippet: string;
  tone?: "default" | "onColor";
}) {
  const isOnColor = tone === "onColor";
  return (
    <Box
      sx={{
        pl: 1,
        ml: 0.5,
        borderLeft: 3,
        borderColor: "primary.main",
        py: 0.25,
        mb: 0.75,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          display: "block",
        }}
      >
        {senderLabel}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: isOnColor ? "inherit" : "text.secondary",
          opacity: 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {snippet}
      </Typography>
    </Box>
  );
}

function MessageBubble({
  message,
  mine,
  onReply,
  readOnly,
  messenger = false,
}: {
  message: ChatMessageDto;
  mine: boolean;
  onReply: () => void;
  readOnly?: boolean;
  messenger?: boolean;
}) {
  const align = mine ? "flex-end" : "flex-start";

  return (
    <Box
      sx={{
        alignSelf: align,
        display: "inline-flex",
        flexDirection: "column",
        maxWidth: messenger
          ? {
              xs: "88%",
              tablet: "min(88%, 560px)",
            }
          : "min(100%, 560px)",
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => {
          const isDark = theme.palette.mode === "dark";
          const bg = messenger
            ? mine
              ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.1)
              : theme.palette.background.paper
            : mine
              ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.1)
              : theme.palette.primary.main;
          const borderColor = mine
            ? alpha(theme.palette.primary.main, isDark ? 0.28 : 0.18)
            : alpha(theme.palette.primary.main, isDark ? 0.22 : 0.16);
          const textColor = messenger
            ? theme.palette.text.primary
            : mine
              ? theme.palette.text.primary
              : theme.palette.primary.contrastText;

          return {
            px: 1.5,
            py: 1,
            bgcolor: bg,
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            ...(mine
              ? {
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 6,
                }
              : {
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 14,
                }),
          };
        }}
      >
        {message.repliedTo ? (
          <ReplyPreviewBlock
            senderLabel={message.repliedTo.senderName ?? "Участник"}
            snippet={message.repliedTo.bodySnippet}
            tone={mine ? "default" : "onColor"}
          />
        ) : null}
        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontSize: messenger ? "0.9375rem" : undefined,
            lineHeight: messenger ? 1.5 : undefined,
          }}
        >
          {message.body}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            mt: 0.75,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: messenger ? "0.75rem" : undefined,
              color: messenger ? "text.secondary" : undefined,
            }}
          >
            {!messenger ? `${message.senderName ?? "Без имени"} · ` : null}
            {new Intl.DateTimeFormat("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(message.createdAt))}
          </Typography>
          {!readOnly ? (
            <IconButton
              size="small"
              onClick={onReply}
              aria-label="Ответить"
              sx={{
                color: "inherit",
              }}
            >
              <ReplyOutlinedIcon fontSize="inherit" />
            </IconButton>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}

export function Chat({
  rows,
  currentUserId,
  draft,
  onDraftChange,
  pendingReply,
  onPendingReplyChange,
  onSend,
  onRetry,
  onReplyToMessage,
  disabled,
  sending,
  loading,
  readOnly,
  inputPlaceholder,
  autoFocusInput,
  appearance = "default",
  initialUnreadCount = 0,
}: Props) {
  const messenger = appearance === "messenger";
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const unreadResolved = useRef(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const unreadMarker = useRef<HTMLDivElement>(null);
  const [showLatest, setShowLatest] = useState(false);
  useEffect(() => {
    if (!messenger || loading || rows.length === 0 || unreadResolved.current)
      return;
    unreadResolved.current = true;
    if (initialUnreadCount <= 0) return;
    const received = rows.filter(
      (row) =>
        row.kind === "message" && row.message.senderUserId !== currentUserId,
    );
    const first = received[Math.max(0, received.length - initialUnreadCount)];
    if (first?.kind === "message") setFirstUnreadId(first.message.id);
  }, [messenger, loading, rows, initialUnreadCount, currentUserId]);
  useEffect(() => {
    const list = scroller.current;
    const marker = unreadMarker.current;
    if (!firstUnreadId || !list || !marker) return;
    list.scrollTop +=
      marker.getBoundingClientRect().top - list.getBoundingClientRect().top;
    atBottom.current =
      list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }, [firstUnreadId]);
  const lastRow = rows[rows.length - 1];
  const lastKey =
    lastRow?.kind === "message" ? lastRow.message.id : lastRow?.clientMessageId;
  useEffect(() => {
    if (!messenger || !scroller.current) return;
    if (atBottom.current || lastRow?.kind === "pending") {
      scroller.current.scrollTop = scroller.current.scrollHeight;
      setShowLatest(false);
    } else setShowLatest(true);
  }, [messenger, lastKey, loading, lastRow?.kind]);
  useEffect(() => {
    const element = scroller.current;
    if (!messenger || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (atBottom.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [messenger]);
  return (
    <Stack
      spacing={0}
      sx={{
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box
        ref={scroller}
        role="log"
        aria-label="Сообщения чата"
        onScroll={(event) => {
          const el = event.currentTarget;
          atBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (atBottom.current) setShowLatest(false);
        }}
        sx={{
          bgcolor: messenger
            ? (theme) =>
                theme.palette.mode === "light"
                  ? lighten(theme.palette.background.default, 0.55)
                  : theme.palette.background.default
            : undefined,
          overscrollBehavior: "contain",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: {
            xs: 1.5,
            sm: 2,
          },
          pt: {
            xs: 1.5,
            sm: 2,
          },
          pb: {
            xs: 1,
            sm: 1.25,
          },
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {loading ? (
          <Stack
            sx={{
              alignItems: "center",
              justifyContent: "center",
              py: 6,
            }}
          >
            <CircularProgress size={28} />
          </Stack>
        ) : null}
        {!loading && rows.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Сообщений пока нет. Напишите первое.
          </Typography>
        ) : null}
        {rows.map((row, index) => {
          if (row.kind === "message" && row.message.kind === "SYSTEM") {
            return (
              <Typography
                key={row.message.id}
                variant="body2"
                sx={{
                  color: "text.secondary",
                  textAlign: "center",
                  px: 1,
                  overflowWrap: "anywhere",
                }}
              >
                {row.message.body}
              </Typography>
            );
          }
          if (row.kind === "message") {
            const mine = row.message.senderUserId === currentUserId;
            return (
              <Box
                key={row.message.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {messenger &&
                (index === 0 ||
                  rows[index - 1].kind !== "message" ||
                  new Date(
                    (
                      rows[index - 1] as {
                        kind: "message";
                        message: ChatMessageDto;
                      }
                    ).message.createdAt,
                  ).toDateString() !==
                    new Date(row.message.createdAt).toDateString()) ? (
                  <Typography
                    sx={{
                      textAlign: "center",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      py: 1.5,
                    }}
                  >
                    {new Date(row.message.createdAt).toLocaleDateString(
                      "ru-RU",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                  </Typography>
                ) : null}
                {row.message.id === firstUnreadId ? (
                  <Box
                    ref={unreadMarker}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      py: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        height: "1px",
                        bgcolor: "divider",
                        flex: 1,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                      }}
                    >
                      Новые сообщения
                    </Typography>
                    <Box
                      sx={{
                        height: "1px",
                        bgcolor: "divider",
                        flex: 1,
                      }}
                    />
                  </Box>
                ) : null}
                <MessageBubble
                  message={row.message}
                  mine={mine}
                  readOnly={readOnly}
                  messenger={messenger}
                  onReply={() => onReplyToMessage(row.message)}
                />
              </Box>
            );
          }
          if (row.kind === "pending") {
            return (
              <Box
                key={`p-${row.clientMessageId}`}
                sx={{
                  alignSelf: "flex-end",
                  display: "inline-flex",
                  flexDirection: "column",
                  maxWidth: "min(100%, 560px)",
                }}
              >
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    px: 1.5,
                    py: 1,
                    borderStyle: "dashed",
                    borderTopLeftRadius: 14,
                    borderTopRightRadius: 14,
                    borderBottomLeftRadius: 14,
                    borderBottomRightRadius: 6,
                    bgcolor: alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === "dark" ? 0.12 : 0.06,
                    ),
                    borderColor: alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === "dark" ? 0.22 : 0.16,
                    ),
                  })}
                >
                  {row.replyToPreview ? (
                    <ReplyPreviewBlock
                      senderLabel={row.replyToPreview.senderLabel}
                      snippet={row.replyToPreview.snippet}
                    />
                  ) : null}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {row.body}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      mt: 1,
                    }}
                  >
                    <CircularProgress size={16} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                      }}
                    >
                      Отправка…
                    </Typography>
                  </Stack>
                </Paper>
              </Box>
            );
          }
          return (
            <Box
              key={`f-${row.clientMessageId}`}
              sx={{
                alignSelf: "flex-end",
                display: "inline-flex",
                flexDirection: "column",
                maxWidth: "min(100%, 560px)",
              }}
            >
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  px: 1.5,
                  py: 1,
                  borderColor: alpha(
                    theme.palette.error.main,
                    theme.palette.mode === "dark" ? 0.45 : 0.35,
                  ),
                  bgcolor: alpha(
                    theme.palette.error.main,
                    theme.palette.mode === "dark" ? 0.12 : 0.06,
                  ),
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 6,
                })}
              >
                {row.replyToPreview ? (
                  <ReplyPreviewBlock
                    senderLabel={row.replyToPreview.senderLabel}
                    snippet={row.replyToPreview.snippet}
                  />
                ) : null}
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {row.body}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    mt: 1,
                  }}
                >
                  <ErrorOutlineIcon
                    color="error"
                    fontSize="small"
                  />
                  <Typography
                    variant="caption"
                    color="error"
                  >
                    {row.error ?? "Не удалось отправить"}
                  </Typography>
                  {row.retryable !== false ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => onRetry(row.clientMessageId)}
                    >
                      Повторить
                    </Button>
                  ) : null}
                </Stack>
              </Paper>
            </Box>
          );
        })}
      </Box>

      {messenger && showLatest ? (
        <Button
          onClick={() => {
            if (scroller.current)
              scroller.current.scrollTop = scroller.current.scrollHeight;
            atBottom.current = true;
            setShowLatest(false);
          }}
        >
          К последним сообщениям ↓
        </Button>
      ) : null}
      <Box
        sx={(theme) => ({
          flexShrink: 0,
          borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          bgcolor: messenger
            ? theme.palette.background.paper
            : alpha("#FFFFFF", 0.72),
          backdropFilter: "blur(8px)",
        })}
      >
        {pendingReply ? (
          <Box
            sx={{
              px: {
                xs: 1.5,
                sm: 2,
              },
              pt: {
                xs: 0.75,
                sm: 1,
              },
              pb: {
                xs: 0.75,
                sm: 1,
              },
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                px: 1.5,
                py: 1,
                bgcolor: "transparent",
                borderColor: "divider",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Ответ на
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {pendingReply.senderLabel}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block",
                      wordBreak: "break-word",
                    }}
                  >
                    {pendingReply.bodySnippet}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label="Отменить ответ"
                  onClick={() => onPendingReplyChange(null)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          </Box>
        ) : null}

        {messenger ? (
          <MessengerComposer
            draft={draft}
            onDraftChange={onDraftChange}
            onSend={onSend}
            disabled={disabled}
            sending={sending}
            autoFocus={autoFocusInput}
          />
        ) : (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
              px: {
                xs: 1.5,
                sm: 2,
              },
              py: {
                xs: 1.25,
                sm: 1.5,
              },
            }}
          >
            <TextField
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder={inputPlaceholder ?? "Введите сообщение…"}
              autoFocus={autoFocusInput}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              sx={(theme) => ({
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  color: theme.palette.text.primary,
                  "& fieldset": {
                    borderColor: theme.palette.divider,
                    borderWidth: "1.5px",
                    transition: "border-color 160ms ease",
                  },
                  "&:hover fieldset": {
                    borderColor: theme.palette.text.primary,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme.palette.primary.main,
                    borderWidth: "1.5px",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  py: {
                    xs: 0.75,
                    sm: 0.875,
                  },
                  pl: {
                    xs: 1.75,
                    sm: 2,
                  },
                  pr: {
                    xs: 1.75,
                    sm: 2,
                  },
                  minHeight: 22,
                },
                "& .MuiInputBase-inputMultiline": {
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                },
                "& .MuiInputBase-inputMultiline::-webkit-scrollbar": {
                  display: "none",
                },
                "& .MuiOutlinedInput-input::placeholder": {
                  opacity: 1,
                  color: theme.palette.text.secondary,
                },
              })}
            />

            <IconButton
              aria-label="Отправить"
              onClick={onSend}
              disabled={disabled || sending || draft.trim().length === 0}
              sx={(theme) => ({
                width: {
                  xs: 52,
                  sm: 56,
                },
                height: {
                  xs: 52,
                  sm: 56,
                },
                flexShrink: 0,
                borderRadius: 1,
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, 0.26)}`,
                "&:hover": {
                  bgcolor: theme.palette.primary.dark,
                },
                "&.Mui-disabled": {
                  bgcolor: alpha(theme.palette.primary.main, 0.35),
                  color: alpha("#FFFFFF", 0.7),
                },
              })}
            >
              <SendRoundedIcon
                sx={{
                  fontSize: 22,
                  transform: "translateX(1px) rotate(-18deg)",
                }}
              />
            </IconButton>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
