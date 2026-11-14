"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import Link from "@/shared/ui/Link";
import { teamApi } from "@/shared/lib/team-api";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";
import { ServiceRequestChatPanel } from "@/widgets/chat/ui/ServiceRequestChatPanel";
import type {
  RequestAssignedMemberDto,
  RequestStatus,
} from "@/entities/request/dto/request.dto";
import { RequestAssignee } from "./RequestAssignee";

type AssignedRequest = {
  id: string;
  number: number | null;
  status: RequestStatus;
  title: string;
  message: string | null;
  location: string | null;
  cadastralNumbers: string[];
  city: string | null;
  customerName: string | null;
  providerName: string | null;
  assignedMember: RequestAssignedMemberDto | null;
};

const statusLabel: Record<RequestStatus, string> = {
  NEW: "Новая",
  DISCUSSING: "Обсуждение",
  TERMS_AGREED: "Согласование договора",
  ACTIVE: "В работе",
  ACCEPTANCE_PENDING: "Приёмка",
  ACCEPTED: "Работа принята",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
  CLOSED: "Закрыта",
};

export function AssignedRequests({ requestId }: { requestId?: string }) {
  const user = useAppSelector((state) => state.auth.user);
  const membership = getActiveMembership(user);
  const router = useRouter();
  const { update } = useSession();
  const [items, setItems] = useState<AssignedRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const refresh = useVisibleRefresh({
    scope: `assigned:${membership?.providerId}:${requestId ?? "all"}`,
    requestId,
    onRefresh: async (signal) => {
      try {
        const data = await teamApi<
          AssignedRequest | { items: AssignedRequest[] }
        >(`/api/employee/requests${requestId ? `/${requestId}` : ""}`, {
          signal,
        });
        if (signal.aborted) return;
        setItems("items" in data ? data.items : [data]);
        setError(null);
      } catch (reason) {
        if (signal.aborted) return;
        setItems([]);
        setError(
          reason instanceof Error
            ? reason.message
            : "Не удалось загрузить заявки",
        );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
  });
  useEffect(() => {
    if (requestId) return;
    window.addEventListener("request:changed", refresh);
    return () => window.removeEventListener("request:changed", refresh);
  }, [requestId, refresh]);

  const request = requestId ? items[0] : null;
  return (
    <Stack spacing={3}>
      <Box>
        {requestId ? (
          <Link href="/pro/assigned">Все назначенные заявки</Link>
        ) : null}
        <Typography
          component="h1"
          variant="h4"
          sx={{ mt: 1 }}
        >
          {request
            ? `${request.title}${request.number ? ` · № ${request.number}` : ""}`
            : "Назначенные мне заявки"}
        </Typography>
        <Typography sx={{ mt: 1 }}>{membership?.providerName}</Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary" }}
        >
          {[membership?.jobTitle, user?.name].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
      {!requestId && (user?.memberships.length ?? 0) > 1 ? (
        <TextField
          select
          label="Профиль исполнителя"
          value={membership?.providerId ?? ""}
          size="small"
          disabled={switching}
          onChange={async (event) => {
            setSwitching(true);
            try {
              const providerId = event.target.value;
              await teamApi(`/api/providers/${providerId}/activate`, {
                method: "POST",
              });
              await update();
              router.push(
                user?.memberships.find((item) => item.providerId === providerId)
                  ?.role === "EMPLOYEE"
                  ? "/pro/assigned"
                  : "/pro/requests/feed",
              );
              router.refresh();
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Не удалось переключить профиль",
              );
            } finally {
              setSwitching(false);
            }
          }}
        >
          {user?.memberships.map((item) => (
            <MenuItem
              key={item.providerId}
              value={item.providerId}
            >
              {item.providerName}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {loading ? <Typography>Загружаем заявки…</Typography> : null}
      {error ? (
        <Alert
          severity="error"
          action={<Button onClick={refresh}>Повторить</Button>}
        >
          {error}
        </Alert>
      ) : null}
      {!loading && !error && !items.length ? (
        <Typography>Вам пока не назначены заявки.</Typography>
      ) : null}
      {request ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 3,
          }}
        >
          <Paper
            sx={{
              p: 2.5,
              alignSelf: "start",
            }}
          >
            <Stack spacing={2}>
              <RequestAssignee
                providerName={request.providerName}
                member={request.assignedMember}
              />
              <Typography>Статус: {statusLabel[request.status]}</Typography>
              {request.customerName ? (
                <Typography>Клиент: {request.customerName}</Typography>
              ) : null}
              {request.message ? (
                <Typography
                  sx={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {request.message}
                </Typography>
              ) : null}
              {request.city ? (
                <Typography>Город: {request.city}</Typography>
              ) : null}
              {request.location ? (
                <Typography>Адрес: {request.location}</Typography>
              ) : null}
              {request.cadastralNumbers.length ? (
                <Typography>
                  Кадастровые номера: {request.cadastralNumbers.join(", ")}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
          {request.status !== "CLOSED" ? (
            <Box
              sx={{
                minWidth: 0,
                height: { xs: 560, md: 680 },
              }}
            >
              <ServiceRequestChatPanel
                serviceRequestId={request.id}
                title="Чат с клиентом"
                subtitle={request.customerName ?? undefined}
              />
            </Box>
          ) : null}
        </Box>
      ) : (
        items.map((item) => (
          <Paper
            key={item.id}
            sx={{ p: 2.5 }}
          >
            <Stack spacing={1}>
              <Typography variant="h6">
                {item.title}
                {item.number ? ` · № ${item.number}` : ""}
              </Typography>
              <Typography>
                {statusLabel[item.status]}
                {item.city ? ` · ${item.city}` : ""}
              </Typography>
              {item.customerName ? (
                <Typography variant="body2">
                  Клиент: {item.customerName}
                </Typography>
              ) : null}
              <Button
                component={Link}
                href={`/pro/assigned/${item.id}`}
                sx={{ alignSelf: "flex-start" }}
              >
                Открыть заявку
              </Button>
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  );
}
