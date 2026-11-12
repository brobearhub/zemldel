"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { MessengerComposer } from "./MessengerComposer";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Snackbar,
  TextField,
  Typography,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { alpha, darken, lighten } from "@mui/material/styles";
import type { ChatMessageDto } from "@/entities/chat/dto/chat.dto";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import { breakpointValues } from "@/core/theme/breakpoints";

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
  currentUserImage?: string | null;
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
          overflowWrap: "anywhere",
        }}
      >
        {snippet}
      </Typography>
    </Box>
  );
}

function MessageRowFrame({
  senderLabel,
  senderImage,
  mine,
  createdAt,
  actions,
  onOpenActions,
  menuId,
  menuOpen,
  children,
}: {
  senderLabel: string;
  senderImage?: string | null;
  mine: boolean;
  createdAt?: string;
  actions?: ReactNode;
  onOpenActions?: (event: MouseEvent<HTMLElement>) => void;
  menuId?: string;
  menuOpen?: boolean;
  children: ReactNode;
}) {
  const initials = senderLabel
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("ru-RU");

  return (
    <Box
      role={onOpenActions ? "button" : undefined}
      tabIndex={onOpenActions ? 0 : undefined}
      aria-label={
        onOpenActions ? `Действия сообщения от ${senderLabel}` : undefined
      }
      aria-haspopup={onOpenActions ? "menu" : undefined}
      aria-expanded={onOpenActions ? menuOpen : undefined}
      aria-controls={menuOpen ? menuId : undefined}
      onClick={onOpenActions}
      onKeyDown={(event) => {
        if (onOpenActions && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        minWidth: 0,
        minHeight: actions ? 64 : undefined,
        width: "100%",
        py: 0.5,
        cursor: onOpenActions ? "pointer" : undefined,
        "&:hover .chat-message-actions, &:focus-within .chat-message-actions": {
          opacity: 1,
          pointerEvents: "auto",
        },
        "&:focus-visible": {
          bgcolor: "action.focus",
          borderRadius: 1,
        },
      }}
    >
      <CdnAvatar
        aria-hidden="true"
        src={senderImage || undefined}
        sx={(theme) => ({
          width: 36,
          height: 36,
          flexShrink: 0,
          fontSize: "0.75rem",
          fontWeight: 700,
          bgcolor: alpha(theme.palette.primary.main, mine ? 0.18 : 0.1),
          color: "primary.main",
        })}
      >
        {initials}
      </CdnAvatar>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              minWidth: 0,
              fontWeight: 700,
              fontSize: "0.875rem",
              color: mine ? "text.primary" : "accent.main",
              overflowWrap: "anywhere",
            }}
          >
            {senderLabel}
          </Typography>
          {createdAt ? (
            <Box
              sx={{
                position: "relative",
                flexShrink: 0,
                minWidth: actions ? 64 : undefined,
                textAlign: "right",
              }}
            >
              <Typography
                component="time"
                dateTime={createdAt}
                variant="caption"
                sx={{
                  flexShrink: 0,
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  fontSize: "0.75rem",
                }}
              >
                {new Intl.DateTimeFormat("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(createdAt))}
              </Typography>
              {actions}
            </Box>
          ) : null}
        </Stack>
        <Box
          sx={{
            minWidth: 0,
            pr: actions ? 9 : undefined,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function MessageRow({
  message,
  mine,
  currentUserImage,
  onReply,
  onCopy,
  onOpenActions,
  menuId,
  menuOpen,
}: {
  message: ChatMessageDto;
  mine: boolean;
  currentUserImage?: string | null;
  onReply?: () => void;
  onCopy: () => void;
  onOpenActions?: (event: MouseEvent<HTMLElement>) => void;
  menuId: string;
  menuOpen: boolean;
}) {
  return (
    <MessageRowFrame
      senderLabel={message.senderName?.trim() || (mine ? "Вы" : "Без имени")}
      senderImage={
        mine ? currentUserImage ?? message.senderImage : message.senderImage
      }
      mine={mine}
      createdAt={message.createdAt}
      onOpenActions={onOpenActions}
      menuId={menuId}
      menuOpen={menuOpen}
      actions={onOpenActions ? undefined : (
        <Stack
          className="chat-message-actions"
          direction="row"
          sx={{
            position: "absolute",
            top: "100%",
            right: 0,
            opacity: 0,
            pointerEvents: "none",
            "& .MuiIconButton-root": {
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              p: 0.5,
              color: "text.primary",
            },
            "& .MuiSvgIcon-root": {
              fontSize: 16,
            },
          }}
        >
          {onReply ? (
            <Tooltip title="Ответить">
              <IconButton
                size="small"
                aria-label="Ответить"
                onClick={onReply}
              >
                <ReplyOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Копировать">
            <IconButton
              size="small"
              aria-label="Копировать"
              onClick={onCopy}
            >
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    >
      {message.repliedTo ? (
        <ReplyPreviewBlock
          senderLabel={message.repliedTo.senderName ?? "Участник"}
          snippet={message.repliedTo.bodySnippet}
        />
      ) : null}
      <Typography
        variant="body2"
        sx={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          color: "text.primary",
          fontSize: "0.9375rem",
          lineHeight: 1.5,
        }}
      >
        {message.body}
      </Typography>
    </MessageRowFrame>
  );
}

export function Chat({
  rows,
  currentUserId,
  currentUserImage,
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
  autoFocusInput,
  appearance = "default",
  initialUnreadCount = 0,
}: Props) {
  const messenger = appearance === "messenger";
  const mobileActions = useMediaQuery(
    `(max-width: ${breakpointValues.tablet - 0.05}px), (hover: none)`,
    { noSsr: true },
  );
  const menuId = useId();
  const [messageMenu, setMessageMenu] = useState<{
    message: ChatMessageDto;
    position: { top: number; left: number };
  } | null>(null);
  const [copyNotice, setCopyNotice] = useState<{
    message: string;
    error: boolean;
    key: number;
  } | null>(null);

  async function copyMessage(message: ChatMessageDto) {
    try {
      await navigator.clipboard.writeText(message.body);
      setCopyNotice((previous) => ({
        message: "Текст скопирован",
        error: false,
        key: (previous?.key ?? 0) + 1,
      }));
    } catch {
      setCopyNotice((previous) => ({
        message: "Не удалось скопировать текст. Попробуйте ещё раз.",
        error: true,
        key: (previous?.key ?? 0) + 1,
      }));
    }
  }

  function openMessageMenu(
    message: ChatMessageDto,
    event: MouseEvent<HTMLElement>,
  ) {
    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      event.currentTarget.contains(selection.anchorNode)
    ) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setMessageMenu({
      message,
      position: {
        top: event.clientY || rect.top + rect.height / 2,
        left: event.clientX || rect.left + rect.width / 2,
      },
    });
  }

  useEffect(() => {
    if (
      messageMenu &&
      (!mobileActions || !rows.some((row) =>
        row.kind === "message" &&
        row.message.id === messageMenu.message.id &&
        row.message.conversationId === messageMenu.message.conversationId,
      ))
    ) setMessageMenu(null);
  }, [rows, mobileActions, messageMenu]);

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
            : "background.default",
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
                <MessageRow
                  message={row.message}
                  mine={mine}
                  currentUserImage={currentUserImage}
                  onReply={
                    readOnly || disabled
                      ? undefined
                      : () => onReplyToMessage(row.message)
                  }
                  onCopy={() => void copyMessage(row.message)}
                  onOpenActions={
                    mobileActions
                      ? (event) => openMessageMenu(row.message, event)
                      : undefined
                  }
                  menuId={menuId}
                  menuOpen={messageMenu?.message.id === row.message.id}
                />
              </Box>
            );
          }
          if (row.kind === "pending") {
            return (
              <MessageRowFrame
                key={`p-${row.clientMessageId}`}
                senderLabel="Вы"
                senderImage={currentUserImage}
                mine
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
                    overflowWrap: "anywhere",
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
              </MessageRowFrame>
            );
          }
          return (
            <MessageRowFrame
              key={`f-${row.clientMessageId}`}
              senderLabel="Вы"
              senderImage={currentUserImage}
              mine
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
                  overflowWrap: "anywhere",
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
            </MessageRowFrame>
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
            : theme.palette.background.secondary,
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
                bgcolor: messenger ? "transparent" : "background.paper",
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
                      overflowWrap: "anywhere",
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
            spacing={1}
            sx={{
              alignItems: "center",
              px: 2,
              py: 1.5,
            }}
          >
            <TextField
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder="Сообщение..."
              autoFocus={autoFocusInput}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              sx={(theme) => ({
                minWidth: 0,
                "& .MuiOutlinedInput-root": {
                  minHeight: 44,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                  color: theme.palette.text.primary,
                  "& fieldset": {
                    top: 0,
                    borderColor: theme.palette.divider,
                  },
                  "&:hover fieldset": {
                    borderColor: theme.palette.divider,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme.palette.primary.main,
                  },
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
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: theme.palette.primary.dark,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  bgcolor: darken(theme.palette.primary.dark, 0.12),
                },
                "&.Mui-disabled": {
                  bgcolor:
                    theme.palette.mode === "light"
                      ? alpha(theme.palette.common.black, 0.12)
                      : theme.palette.action.disabledBackground,
                  color: "text.disabled",
                },
              })}
            >
              <ArrowUpwardRoundedIcon />
            </IconButton>
          </Stack>
        )}
      </Box>
      {messageMenu ? (
        <Menu
          id={menuId}
          open
          anchorReference="anchorPosition"
          anchorPosition={messageMenu.position}
          onClose={() => setMessageMenu(null)}
          disableScrollLock
          slotProps={{
            paper: {
              sx: (theme) => ({
                bgcolor: "background.paper",
                backgroundImage: `linear-gradient(${theme.palette.background.secondary}, ${theme.palette.background.secondary})`,
              }),
            },
            list: { "aria-label": "Действия с сообщением" },
          }}
        >
          {!readOnly && !disabled ? (
            <MenuItem
              onClick={() => {
                onReplyToMessage(messageMenu.message);
                setMessageMenu(null);
              }}
            >
              <ListItemText>Ответить</ListItemText>
              <ListItemIcon
                sx={{
                  justifyContent: "flex-end",
                }}
              >
                <ReplyOutlinedIcon fontSize="small" />
              </ListItemIcon>
            </MenuItem>
          ) : null}
          <MenuItem
            onClick={() => {
              void copyMessage(messageMenu.message);
              setMessageMenu(null);
            }}
          >
            <ListItemText>Копировать</ListItemText>
            <ListItemIcon
              sx={{
                justifyContent: "flex-end",
              }}
            >
              <ContentCopyOutlinedIcon fontSize="small" />
            </ListItemIcon>
          </MenuItem>
        </Menu>
      ) : null}
      <Snackbar
        key={copyNotice?.key}
        open={!!copyNotice}
        autoHideDuration={2500}
        onClose={() => setCopyNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={copyNotice?.error ? "error" : "success"}
          role={copyNotice?.error ? "alert" : "status"}
          onClose={() => setCopyNotice(null)}
        >
          {copyNotice?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
