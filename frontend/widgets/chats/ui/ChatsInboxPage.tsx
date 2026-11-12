"use client";

import { useEffect, useMemo, useState } from "react";
import { chatHref } from "../model/inbox-format";
import Link from "next/link";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { getRequestStatusLabel, type RequestStatus } from "@/entities/request";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import type { ChatInboxItemDto } from "@/entities/chat/dto/chat.dto";
import { fetchChatInbox } from "@/entities/chat/api/chat-inbox";
import { getLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import type { CabinetRole } from "@/widgets/cabinet-chrome/model/nav-config";

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatsInboxPage({ cabinetRole }: { cabinetRole?: CabinetRole }) {
  const { unreadByRequestId } = useChatSocket();
  const [items, setItems] = useState<ChatInboxItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);
  const role = useMemo(() => cabinetRole ?? getLastCabinetRole(), [cabinetRole]);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);

    (async () => {
      try {
        const list = await fetchChatInbox(role);
        if (!cancelled) setItems(list);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Не удалось загрузить чат");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, attempt]);

  return (
    <main>
      <Container
        maxWidth={role === "provider" ? false : "xl"}
        disableGutters={role === "provider"}
        sx={sitePageContainerSx}
      >
        <Paper sx={{ width: "100%", p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography component="h1" variant="h1" sx={{ fontWeight: 700 }}>
                Чаты
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                Список заявок с последними сообщениями
              </Typography>
            </Box>

            {error ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    onClick={() => setAttempt((n) => n + 1)}
                  >
                    Повторить
                  </Button>
                }
              >
                {error}
              </Alert>
            ) : null}

            {!items && !error ? (
              <Stack spacing={1}>
                <Skeleton height={56} />
                <Skeleton height={56} />
                <Skeleton height={56} />
              </Stack>
            ) : !items ? null : items.length === 0 ? (
              <Alert severity="info">Пока нет диалогов.</Alert>
            ) : (
              <List disablePadding>
                {items.map((row) => {
                  const unread = unreadByRequestId[row.serviceRequestId ?? ""] ?? 0;
                  const secondary = row.lastSnippet ?? "";
                  return (
                    <ListItemButton
                      key={row.conversationId ?? row.serviceRequestId}
                      component={Link}
                      href={chatHref(row, "provider")}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        alignItems: "stretch",
                        flexDirection: "column",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {row.peerName ?? "Переписка"} · №{" "}
                        {row.kind === "DIRECT" ? "Без заявки" : row.serviceRequestId?.slice(0, 8)}
                        {row.requestStatus
                          ? ` · ${row.contractPhase ? "Договор" : getRequestStatusLabel(row.requestStatus as RequestStatus)}`
                          : ""}
                      </Typography>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
                            >
                              {row.title}
                            </Typography>
                            <Badge
                              color="error"
                              badgeContent={unread}
                              max={99}
                              invisible={unread === 0}
                            />
                          </Box>
                        }
                        secondary={secondary}
                        slotProps={{
                          secondary: {
                            sx: { display: "block" },
                            noWrap: false,
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(row.lastMessageAt)}
                      </Typography>
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}
