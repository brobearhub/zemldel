"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Box, Container, List, ListItemButton, ListItemText, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import type { ChatInboxItemDto } from "@/entities/chat/dto/chat.dto";
import { fetchChatInbox } from "@/entities/chat/api/chat-inbox";
import { getLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ChatsInboxPage() {
  const { unreadByRequestId } = useChatSocket();
  const [items, setItems] = useState<ChatInboxItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const role = useMemo(() => getLastCabinetRole(), []);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);

    (async () => {
      try {
        const list = await fetchChatInbox(role);
        if (!cancelled) setItems(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить чат");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role]);

  return (
    <main>
      <Container maxWidth="xl" sx={sitePageContainerSx}>
        <Paper sx={{ width: "100%", p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Чат
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Список заявок с последними сообщениями
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {!items ? (
              <Stack spacing={1}>
                <Skeleton height={56} />
                <Skeleton height={56} />
                <Skeleton height={56} />
              </Stack>
            ) : items.length === 0 ? (
              <Alert severity="info">Пока нет диалогов.</Alert>
            ) : (
              <List disablePadding>
                {items.map((row) => {
                  const unread = unreadByRequestId[row.serviceRequestId] ?? 0;
                  const secondary = row.lastSnippet ? `${row.lastSnippet}${row.lastMessageAt ? ` · ${formatTime(row.lastMessageAt)}` : ""}` : "";
                  return (
                    <ListItemButton
                      key={row.serviceRequestId}
                      component={Link}
                      href={`/chats/${row.serviceRequestId}`}
                      sx={{ borderRadius: 2, mb: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                              {row.title}
                            </Typography>
                            <Badge color="error" badgeContent={unread} max={99} invisible={unread === 0} />
                          </Box>
                        }
                        secondary={secondary}
                        secondaryTypographyProps={{ sx: { display: "block" }, noWrap: true }}
                      />
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

