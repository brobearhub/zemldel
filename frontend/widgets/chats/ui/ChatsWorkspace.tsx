"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { DirectChatActions } from "@/widgets/favorites/DirectChatActions";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ChatInboxRole } from "@/entities/chat/api/chat-inbox";
import { getActiveMembership } from "@/core/auth/authorization";
import { formatRequestNumber } from "@/entities/request/lib/request-reference";
import { DownloadChatPdfButton } from "@/widgets/chat/ui/DownloadChatPdfButton";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import { useChatInbox } from "../model/use-chat-inbox";
import { useChatViewport } from "../model/use-chat-viewport";
import {
  chatHref,
  chatInitials,
  chatStatus,
  inboxTime,
} from "../model/inbox-format";

export function ChatsWorkspace({ role }: { role: ChatInboxRole }) {
  const { data: session } = useSession();
  const providerId =
    role === "provider"
      ? (getActiveMembership(session?.user ?? null)?.providerId ?? "")
      : "";
  const scope = `${role}:${session?.user?.id ?? ""}:${providerId}`;
  return (
    <Workspace
      key={scope}
      scope={scope}
      role={role}
    />
  );
}

function Workspace({ scope, role }: { scope: string; role: ChatInboxRole }) {
  const basePath = role === "provider" ? "/pro/chats" : "/profile/chats";
  const requestBasePath =
    role === "provider" ? "/pro/requests" : "/profile/requests";
  const peerLabel = role === "provider" ? "Клиент" : "Исполнитель";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { requestId, conversationId: directId } = useParams<{ requestId?: string; conversationId?: string }>();
  const threadId = directId ?? requestId;
  const requestedConversation = searchParams.get("conversation");
  const { items, error, refresh, onMessage, unreadByConversationId } =
    useChatInbox(scope, role);
  const [query, setQuery] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(
    () => searchParams.get("unread") === "1",
  );
  const scrollRef = useRef<HTMLUListElement>(null);
  const savedScroll = useRef(0);
  useChatViewport();

  useEffect(() => {
    setOnlyUnread(new URLSearchParams(searchParamsString).get("unread") === "1");
  }, [searchParamsString]);

  function setUnreadFilter(enabled: boolean) {
    setOnlyUnread(enabled);
    const params = new URLSearchParams(searchParamsString);
    if (enabled) params.set("unread", "1");
    else params.delete("unread");
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }

  // The route layout remains mounted: filters and scroll survive list ↔ thread navigation.
  useLayoutEffect(() => {
    if (!threadId && scrollRef.current)
      scrollRef.current.scrollTop = savedScroll.current;
  }, [threadId]);

  const rows = items ?? [];
  const own = rows.filter((row) => directId ? row.kind === "DIRECT" && row.conversationId === directId : row.serviceRequestId === requestId);
  const active = requestedConversation
    ? own.find((row) => row.conversationId === requestedConversation)
    : own.length === 1
      ? own[0]
      : undefined;
  const unread = (row: (typeof rows)[number]) =>
    (row.conversationId
      ? unreadByConversationId[row.conversationId]
      : undefined) ??
    row.unreadCount ??
    0;
  const unreadDialogs = rows.filter((row) => unread(row) > 0).length;
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const filtered = rows.filter(
    (row) =>
      (!onlyUnread || unread(row) > 0) &&
      `${row.peerName ?? ""} ${row.title} ${row.requestNumber ?? ""} ${row.serviceRequestId}`
        .toLocaleLowerCase("ru-RU")
        .includes(normalizedQuery),
  );

  return (
    <Box
      data-chat-messenger={role}
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        pb: {
          xs: 0,
          tablet: 2,
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          display: {
            xs: threadId ? "none" : "flex",
            md: "flex",
          },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: {
            xs: 2,
            tablet: 0,
          },
          py: {
            xs: 1.5,
            tablet: 0,
          },
          pb: {
            tablet: 2,
          },
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: "1.625rem",
                tablet: "2rem",
              },
              fontWeight: 700,
            }}
          >
            Чаты
          </Typography>
          <Typography
            variant="body2"
            sx={{
              display: {
                xs: "none",
                tablet: "block",
              },
              color: "text.secondary",
              mt: 0.5,
            }}
          >
            Переписка и заявка — в одном окне
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {unreadDialogs > 0
            ? `Непрочитанные: ${unreadDialogs}`
            : `Диалогов: ${rows.length}`}
        </Typography>
      </Stack>
      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          boxShadow: "none",
          borderRadius: {
            xs: 0,
            tablet: 2,
          },
          borderWidth: {
            xs: 0,
            tablet: 1,
          },
        }}
      >
        <Box
          component="section"
          aria-label="Список чатов"
          sx={{
            display: {
              xs: threadId ? "none" : "flex",
              md: "flex",
            },
            flexDirection: "column",
            width: {
              xs: "100%",
              md: 300,
              lg: 360,
            },
            flexShrink: 0,
            minHeight: 0,
            borderRight: {
              md: 1,
            },
            borderRightColor: {
              md: "divider",
            },
          }}
        >
          <Stack
            spacing={1.5}
            sx={{
              p: 2,
              flexShrink: 0,
            }}
          >
            <TextField
              size="small"
              placeholder="Имя, услуга или номер заявки"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              slotProps={{
                htmlInput: { "aria-label": "Поиск чатов" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="Очистить поиск"
                        onClick={() => setQuery("")}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: "wrap",
                rowGap: 1,
              }}
            >
              <Chip
                label={`Все · ${rows.length}`}
                onClick={() => setUnreadFilter(false)}
                aria-pressed={!onlyUnread}
                sx={
                  !onlyUnread
                    ? {
                        bgcolor: "text.primary",
                        color: "background.paper",
                        "&:hover": {
                          bgcolor: "text.primary",
                        },
                      }
                    : undefined
                }
                color={!onlyUnread ? "primary" : "default"}
                variant={!onlyUnread ? "filled" : "outlined"}
              />
              <Chip
                label={`Непрочитанные · ${unreadDialogs}`}
                onClick={() => setUnreadFilter(true)}
                aria-pressed={onlyUnread}
                sx={
                  onlyUnread
                    ? {
                        bgcolor: "text.primary",
                        color: "background.paper",
                        "&:hover": {
                          bgcolor: "text.primary",
                        },
                      }
                    : undefined
                }
                color={onlyUnread ? "primary" : "default"}
                variant={onlyUnread ? "filled" : "outlined"}
              />
            </Stack>
          </Stack>
          {error ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  onClick={refresh}
                >
                  Повторить
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}
          {!items && !error ? (
            <Stack
              spacing={1}
              sx={{
                px: 2,
              }}
            >
              <Skeleton height={88} />
              <Skeleton height={88} />
              <Skeleton height={88} />
            </Stack>
          ) : null}
          {items && filtered.length === 0 ? (
            <Stack
              spacing={1.5}
              sx={{
                p: 3,
              }}
            >
              <Typography>
                {rows.length === 0
                  ? "Пока нет диалогов"
                  : onlyUnread && !query
                    ? "Все сообщения прочитаны"
                    : "Чаты не найдены"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {rows.length === 0
                  ? role === "provider"
                    ? "Здесь появятся переписки с клиентами по заявкам."
                    : "Здесь появятся переписки с исполнителями по вашим заявкам."
                  : "Измените поиск или покажите все диалоги."}
              </Typography>
              {rows.length > 0 ? (
                <Button
                  onClick={() => {
                    setQuery("");
                    setUnreadFilter(false);
                  }}
                >
                  Показать все
                </Button>
              ) : null}
            </Stack>
          ) : null}
          <List
            ref={scrollRef}
            disablePadding
            aria-label="Диалоги"
            onScroll={(event) => {
              if (event.currentTarget.clientHeight > 0)
                savedScroll.current = event.currentTarget.scrollTop;
            }}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {filtered.map((row) => {
              const count = unread(row);
              const selected = active === row;
              const name = row.peerName || peerLabel;
              return (
                <ListItemButton
                  key={row.conversationId ?? row.serviceRequestId}
                  component={Link}
                  href={chatHref(row, role, onlyUnread)}
                  scroll={false}
                  selected={selected}
                  aria-current={selected ? "page" : undefined}
                  sx={(theme) => ({
                    gap: 1.5,
                    alignItems: "flex-start",
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor:
                      count > 0
                        ? alpha(theme.palette.primary.main, 0.045)
                        : undefined,
                    "&.Mui-selected": {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      boxShadow: `inset 3px 0 ${theme.palette.text.primary}`,
                    },
                  })}
                >
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.12),
                      color: "text.primary",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                    }}
                  >
                    {chatInitials(name)}
                  </Avatar>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          minWidth: 0,
                        }}
                      >
                        {name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          flexShrink: 0,
                        }}
                      >
                        {inboxTime(row.lastMessageAt)}
                      </Typography>
                    </Stack>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: "0.875rem",
                        mt: 0.25,
                      }}
                    >
                      {row.requestNumber != null
                        ? `${formatRequestNumber({ id: row.serviceRequestId ?? "", number: row.requestNumber })} · `
                        : ""}
                      {row.title}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        mt: 0.25,
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: "0.875rem",
                          color: "text.secondary",
                        }}
                      >
                        {row.lastSnippet || "Сообщений пока нет"}
                      </Typography>
                      {count > 0 ? (
                        <Box
                          aria-label={`Непрочитанных сообщений: ${count}`}
                          sx={{
                            minWidth: 20,
                            height: 20,
                            px: 0.5,
                            borderRadius: 10,
                            bgcolor: "accent.main",
                            color: "accent.contrastText",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.75rem",
                            flexShrink: 0,
                          }}
                        >
                          {count > 99 ? "99+" : count}
                        </Box>
                      ) : null}
                    </Stack>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        </Box>
        <Box
          component="section"
          aria-label="Переписка"
          sx={{
            display: {
              xs: threadId ? "flex" : "none",
              md: "flex",
            },
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {threadId ? (
            <>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              >
                <IconButton
                  component={Link}
                  href={basePath}
                  scroll={false}
                  aria-label="К чатам"
                  sx={{
                    display: {
                      md: "none",
                    },
                    width: 44,
                    height: 44,
                    ml: -1,
                  }}
                >
                  <ArrowBackRoundedIcon />
                </IconButton>
                {active ? (
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.12),
                      color: "text.primary",
                      fontSize: "0.875rem",
                    }}
                  >
                    {chatInitials(active.peerName || peerLabel)}
                  </Avatar>
                ) : null}
                <Box
                  sx={{
                    minWidth: 0,
                  }}
                >
                  <Typography
                    component="h2"
                    noWrap
                    sx={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                    }}
                  >
                    {active?.peerName || "Переписка по заявке"}
                  </Typography>
                  {active ? (
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                      }}
                    >
                      {peerLabel}
                    </Typography>
                  ) : null}
                </Box>
                {active && active.kind !== "DIRECT" ? (
                  <Box sx={{ ml: "auto" }}>
                    <DownloadChatPdfButton conversationId={active.conversationId} serviceRequestId={active.serviceRequestId ?? undefined} title={active.peerName || "Чат по заявке"} viewerRole={role === "provider" ? "PROVIDER" : "CUSTOMER"} counterpartyName={active.peerName} />
                  </Box>
                ) : null}
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    noWrap
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                    }}
                  >
                    {active?.title ?? own[0]?.title ?? "Заявка"}
                  </Typography>
                  {!directId ? (
                    <Typography
                      noWrap
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                      }}
                    >
                      {formatRequestNumber({ id: requestId ?? "", number: active?.requestNumber ?? own[0]?.requestNumber })}
                      {active && chatStatus(active)
                        ? ` · ${chatStatus(active)}`
                        : ""}
                    </Typography>
                  ) : null}
                </Box>
                {!directId ? <Button
                  component={Link}
                  href={`${requestBasePath}/${encodeURIComponent(requestId ?? "")}`}
                  endIcon={<ChevronRightRoundedIcon />}
                  sx={{
                    flexShrink: 0,
                    minHeight: 44,
                    fontSize: "0.75rem",
                    color: "text.primary",
                    px: 0.5,
                  }}
                >
                  К заявке
                </Button> : null}
              </Stack>
              {!items && !error ? (
                <Skeleton
                  sx={{
                    m: 2,
                  }}
                  height={100}
                />
              ) : null}
              {error && !items ? (
                <Alert
                  severity="error"
                  action={<Button onClick={refresh}>Повторить</Button>}
                >
                  {error}
                </Alert>
              ) : null}
              {items && !active ? (
                <Stack
                  spacing={1}
                  sx={{
                    p: 2,
                  }}
                >
                  <Alert severity="info">
                    {own.length
                      ? "Выберите диалог по этой заявке."
                      : "Переписка недоступна или ещё не началась."}
                  </Alert>
                  {own.map((row) => (
                    <Button
                      key={row.conversationId ?? row.serviceRequestId}
                      component={Link}
                      href={chatHref(row, role, onlyUnread)}
                    >
                      {row.peerName || "Открыть переписку"}
                    </Button>
                  ))}
                </Stack>
              ) : null}
              {active?.kind === "DIRECT" && role === "customer" && active.conversationId ? <DirectChatActions conversationId={active.conversationId} state={active.directState} onChange={refresh} /> : null}
              {active ? (
                <ServiceRequestChatPanel
                  key={active.conversationId ?? active.serviceRequestId}
                  serviceRequestId={active.serviceRequestId ?? undefined}
                  conversationId={active.conversationId}
                  title={active.peerName || peerLabel}
                  appearance="messenger"
                  initialUnreadCount={unread(active)}
                  onMessage={onMessage}
                />
              ) : null}
            </>
          ) : (
            <Stack
              spacing={2}
              sx={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                textAlign: "center",
              }}
            >
              <ChatBubbleOutlineRoundedIcon
                sx={{
                  fontSize: 40,
                  color: "text.secondary",
                }}
              />
              <Typography variant="h6">Выберите диалог</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Сообщения и связанная заявка появятся здесь.
              </Typography>
            </Stack>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
