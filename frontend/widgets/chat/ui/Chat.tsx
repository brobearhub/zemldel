 "use client";

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
import { alpha } from "@mui/material/styles";
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
          display: "block"
        }}>
        {senderLabel}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: isOnColor ? "inherit" : "text.secondary",
          opacity: isOnColor ? 0.78 : 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }}>
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
}: {
  message: ChatMessageDto;
  mine: boolean;
  onReply: () => void;
  readOnly?: boolean;
}) {
  const align = mine ? "flex-end" : "flex-start";

  return (
    <Box
      sx={{
        alignSelf: align,
        display: "inline-flex",
        flexDirection: "column",
        maxWidth: "min(100%, 560px)",
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => {
          const isDark = theme.palette.mode === "dark";
          const bg = mine
            ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.10)
            : theme.palette.primary.light;
          const borderColor = mine
            ? alpha(theme.palette.primary.main, isDark ? 0.28 : 0.18)
            : alpha(theme.palette.primary.main, isDark ? 0.22 : 0.16);
          const textColor = mine ? theme.palette.text.primary : theme.palette.primary.contrastText

          return {
            px: 1.5,
            py: 1,
            bgcolor: bg,
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            ...(mine
              ? { borderBottomLeftRadius: 14, borderBottomRightRadius: 6 }
              : { borderBottomLeftRadius: 6, borderBottomRightRadius: 14 }),
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
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {message.body}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            mt: 0.75
          }}>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {message.senderName ?? "Без имени"} ·{" "}
            {new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}
          </Typography>
          {!readOnly ? (
            <IconButton size="small" onClick={onReply} aria-label="Ответить" sx={{ color: "inherit" }}>
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
}: Props) {
  return (
    <Stack
      spacing={0}
      sx={{
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
          pb: { xs: 1, sm: 1.25 },
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
              py: 6
            }}>
            <CircularProgress size={28} />
          </Stack>
        ) : null}
        {!loading && rows.length === 0 ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Сообщений пока нет. Напишите первое.
          </Typography>
        ) : null}
        {rows.map((row) => {
          if (row.kind === "message") {
            const mine = row.message.senderUserId === currentUserId;
            return (
              <MessageBubble
                key={row.message.id}
                message={row.message}
                mine={mine}
                readOnly={readOnly}
                onReply={() =>
                  onReplyToMessage(row.message)
                }
              />
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
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                    borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.16),
                  })}
                >
                  {row.replyToPreview ? (
                    <ReplyPreviewBlock senderLabel={row.replyToPreview.senderLabel} snippet={row.replyToPreview.snippet} />
                  ) : null}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}>
                    {row.body}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      mt: 1
                    }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
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
                  borderColor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.45 : 0.35),
                  bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 6,
                })}
              >
                {row.replyToPreview ? (
                  <ReplyPreviewBlock senderLabel={row.replyToPreview.senderLabel} snippet={row.replyToPreview.snippet} />
                ) : null}
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {row.body}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    mt: 1
                  }}>
                  <ErrorOutlineIcon color="error" fontSize="small" />
                  <Typography variant="caption" color="error">
                    {row.error ?? "Не удалось отправить"}
                  </Typography>
                  <Button size="small" variant="outlined" color="inherit" onClick={() => onRetry(row.clientMessageId)}>
                    Повторить
                  </Button>
                </Stack>
              </Paper>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={(theme) => ({
          flexShrink: 0,
          borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          bgcolor: alpha("#FFFFFF", 0.72),
          backdropFilter: "blur(8px)",
        })}
      >
        {pendingReply ? (
          <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 0.75, sm: 1 }, pb: { xs: 0.75, sm: 1 } }}>
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
                  justifyContent: "space-between"
                }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    Ответ на
                  </Typography>
                  <Typography variant="body2" noWrap sx={{
                    fontWeight: 800
                  }}>
                    {pendingReply.senderLabel}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block",
                      wordBreak: "break-word"
                    }}>
                    {pendingReply.bodySnippet}
                  </Typography>
                </Box>
                <IconButton size="small" aria-label="Отменить ответ" onClick={() => onPendingReplyChange(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          </Box>
        ) : null}

        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            px: { xs: 1.5, sm: 2 },
            py: { xs: 1.25, sm: 1.5 }
          }}>
          <TextField
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            fullWidth
            multiline
            minRows={1}
            maxRows={4}
            placeholder="Введите сообщение…"
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
                bgcolor: "#FFFFFF",
                color: theme.palette.text.primary,
                "& fieldset": {
                  borderColor: alpha(theme.palette.primary.main, 0.20),
                  borderWidth: "1.5px",
                  transition: "border-color 160ms ease",
                },
                "&:hover fieldset": {
                  borderColor: alpha(theme.palette.primary.main, 0.36),
                },
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main,
                  borderWidth: "1.5px",
                },
              },
              "& .MuiOutlinedInput-input": {
                py: { xs: 0.75, sm: 0.875 },
                pl: { xs: 1.75, sm: 2 },
                pr: { xs: 1.75, sm: 2 },
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
                color: alpha(theme.palette.primary.main, 0.38),
              },
            })}
          />

          <IconButton
            aria-label="Отправить"
            onClick={onSend}
            disabled={disabled || sending || draft.trim().length === 0}
            sx={(theme) => ({
              width: { xs: 52, sm: 56 },
              height: { xs: 52, sm: 56 },
              flexShrink: 0,
              borderRadius: 1,
              bgcolor: theme.palette.primary.main,
              color: "#FFFFFF",
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
            <SendRoundedIcon sx={{ fontSize: 22, transform: "translateX(1px) rotate(-18deg)" }} />
          </IconButton>
        </Stack>
      </Box>
    </Stack>
  );
}
