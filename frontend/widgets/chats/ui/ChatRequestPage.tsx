"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Container,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import { fetchChatInbox } from "@/entities/chat/api/chat-inbox";
import type { ChatInboxItemDto } from "@/entities/chat/dto/chat.dto";
import { getLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { getRequestStatusLabel, type RequestStatus } from "@/entities/request";
import type { CabinetRole } from "@/widgets/cabinet-chrome/model/nav-config";

export function ChatRequestPage({ requestId, cabinetRole }: { requestId: string; cabinetRole?: CabinetRole }) {
  const role = useMemo(() => cabinetRole ?? getLastCabinetRole(), [cabinetRole]);
  const params = useSearchParams();
  const requestedConversation = params.get("conversation");
  const [items, setItems] = useState<ChatInboxItemDto[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setItems(null);
    setError(null);
    setSelected(null);
    void fetchChatInbox(role)
      .then((rows) => {
        if (!current) return;
        const own = rows.filter((row) => row.serviceRequestId === requestId);
        setItems(own);
        setSelected(
          own.find((row) => row.conversationId === requestedConversation)
            ?.conversationId ??
            (own.length === 1 ? (own[0].conversationId ?? null) : null),
        );
      })
      .catch((reason) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Не удалось загрузить переписку",
          );
      });
    return () => {
      current = false;
    };
  }, [role, requestId, requestedConversation, attempt]);
  const active = items?.find((row) => row.conversationId === selected);
  return (
    <main>
      <Container
        maxWidth={role === "provider" ? false : "xxl"}
        disableGutters={role === "provider"}
        sx={sitePageContainerSx}
      >
        <Paper sx={{ width: "100%", p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Button color="inherit" component={Link} href="/pro/chats">
                К чатам
              </Button>
              <Button
                color="inherit"
                component={Link}
                href={`${role === "provider" ? "/pro" : "/profile"}/requests/${requestId}`}
              >
                К заявке
              </Button>
            </Stack>
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
            ) : !items ? (
              <Skeleton height={100} />
            ) : items.length === 0 ? (
              <Alert severity="info">
                Переписка недоступна или ещё не началась. Откройте заявку, чтобы
                проверить её состояние.
              </Alert>
            ) : (
              <>
                <Typography
                  component="h1"
                  variant="h1"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {items[0].title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Заявка № {requestId.slice(0, 8)}
                  {items[0].requestStatus
                    ? ` · ${items[0].contractPhase ? "Договор" : getRequestStatusLabel(items[0].requestStatus as RequestStatus)}`
                    : ""}
                </Typography>
                {items.length > 1 ? (
                  <TextField
                    select
                    label="Собеседник"
                    value={selected ?? ""}
                    onChange={(event) => setSelected(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="" disabled>
                      Выберите исполнителя
                    </MenuItem>
                    {items.map((row) => (
                      <MenuItem
                        key={row.conversationId}
                        value={row.conversationId}
                      >
                        {row.peerName ?? "Исполнитель"}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}
                {active ? (
                  <ServiceRequestChatPanel
                    key={active.conversationId}
                    serviceRequestId={requestId}
                    conversationId={active.conversationId}
                    title={active.peerName ?? "Переписка"}
                  />
                ) : (
                  <Alert severity="info">
                    Выберите собеседника, чтобы открыть переписку.
                  </Alert>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}
