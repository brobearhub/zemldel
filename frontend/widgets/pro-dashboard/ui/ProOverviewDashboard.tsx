"use client";

import Link from "next/link";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { AuthMembership } from "@/core/auth/authorization";
import type { RequestCustomerDto, RequestProDto, RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
import { TodayRemindersWidget } from "./TodayRemindersWidget";

type Props = {
  provider: Pick<AuthMembership, "providerName" | "providerType" | "role">;
  services: ServiceDto[];
  requests: RequestProDto[];
  orders: RequestCustomerDto[];
  todayReminders: RequestReminderDto[];
};

function providerTypeLabel(type: AuthMembership["providerType"]) {
  return type === "SELF_EMPLOYED" ? "самозанятый / физлицо" : "компания / организация";
}

function providerRoleLabel(role: AuthMembership["role"]) {
  return role === "OWNER" ? "владелец" : "менеджер";
}

function getClientKey(order: RequestCustomerDto) {
  const normalizedEmail = order.customerEmail?.trim().toLowerCase();
  if (order.customerUserId) {
    return `user:${order.customerUserId}`;
  }

  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  return `order:${order.id}`;
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Пока нет событий";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function OverviewStatCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
            {label}
          </Typography>
          <Box
            sx={(theme) => ({
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              flexShrink: 0,
            })}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {caption}
        </Typography>
      </Stack>
    </Paper>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function ProOverviewDashboard({ provider, services, requests, orders, todayReminders }: Props) {

  const servicesStats = services.reduce(
    (acc, service) => {
      acc.total += 1;
      acc[service.status] += 1;
      return acc;
    },
    {
      total: 0,
      DRAFT: 0,
      PUBLISHED: 0,
      ARCHIVED: 0,
    }
  );

  const requestStats = requests.reduce(
    (acc, req) => {
      if (req.subjectType !== "SERVICE") return acc;
      acc.total += 1;
      acc[req.status] += 1;
      return acc;
    },
    {
      total: 0,
      NEW: 0,
      DISCUSSING: 0,
      TERMS_AGREED: 0,
      ACTIVE: 0,
      ACCEPTANCE_PENDING: 0,
      ACCEPTED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      CLOSED: 0,
    } as Record<string, number>
  );

  const ordersStats = orders.reduce(
    (acc, order) => {
      acc.total += 1;
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
    } as { total: number } & Partial<Record<string, number>>
  );

  const clients = orders.reduce((acc, order) => {
    const key = getClientKey(order);
    const existing = acc.get(key);

    if (existing) {
      existing.ordersCount += 1;
      return acc;
    }

    acc.set(key, {
      ordersCount: 1,
    });
    return acc;
  }, new Map<string, { ordersCount: number }>());

  const clientStats = [...clients.values()].reduce(
    (acc, client) => {
      acc.total += 1;
      if (client.ordersCount > 1) {
        acc.repeat += 1;
      }
      return acc;
    },
    { total: 0, repeat: 0 }
  );

  const latestActivityAt = [requests[0]?.updatedAt ?? null, orders[0]?.updatedAt ?? null]
    .filter(Boolean)
    .sort((left, right) => new Date(String(right)).getTime() - new Date(String(left)).getTime())[0] ?? null;

  const requestsInWork =
    requestStats.NEW + requestStats.DISCUSSING + (requestStats.TERMS_AGREED ?? 0);

  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={(theme) => ({
          p: { xs: 2.5, md: 3 },
          borderColor: alpha(theme.palette.primary.main, 0.32),
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(
                  theme.palette.background.paper,
                  0.82
                )} 48%, ${alpha(theme.palette.background.paper, 0.92)} 100%)`
              : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(
                  "#FFFFFF",
                  0.96
                )} 52%, ${alpha("#FFFFFF", 0.98)} 100%)`,
        })}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={2.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", xl: "flex-start" }}
          >
            <Stack spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  {provider.providerName}
                </Typography>
                <Typography color="text.secondary">
                  Обзор по активному provider: здесь собраны ключевые показатели по услугам, входящим заявкам,
                  заказам и клиентской базе.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={providerTypeLabel(provider.providerType)} variant="outlined" />
                <Chip label={`Роль: ${providerRoleLabel(provider.role)}`} variant="outlined" />
                <Chip label={`Последняя активность: ${formatDateTime(latestActivityAt)}`} variant="outlined" />
              </Stack>
            </Stack>

            <Paper
              variant="outlined"
              sx={(theme) => ({
                p: 1.5,
                width: { xs: "100%", xl: 320 },
                flexShrink: 0,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.white, 0.03)
                    : alpha(theme.palette.primary.main, 0.025),
              })}
            >
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={800}>
                  Быстрые действия
                </Typography>
                <Stack direction={{ xs: "column", sm: "row", xl: "column" }} spacing={1}>
                  <Button
                    component={Link}
                    href="/pro/services/list"
                    variant="contained"
                    endIcon={<ArrowOutwardIcon />}
                    fullWidth
                  >
                    К услугам
                  </Button>
                  <Button component={Link} href="/pro" variant="outlined" fullWidth>
                    Заявки
                  </Button>
                  <Button component={Link} href="/pro/requests" variant="outlined" fullWidth>
                    Заказы
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            <OverviewStatCard
              label="Создано услуг"
              value={servicesStats.total}
              caption={`${servicesStats.PUBLISHED} опубликовано и ${servicesStats.DRAFT} в подготовке`}
              icon={<BuildOutlinedIcon fontSize="small" />}
            />
            <OverviewStatCard
              label="Заявки в работе"
              value={requestsInWork}
              caption={`${requestStats.NEW} новых и ${requestStats.DISCUSSING} в обсуждении`}
              icon={<AssignmentTurnedInOutlinedIcon fontSize="small" />}
            />
            <OverviewStatCard
              label="Всего заказов"
              value={ordersStats.total}
              caption={`${ordersStats.ACTIVE ?? 0} активных и ${ordersStats.COMPLETED ?? 0} завершенных`}
              icon={<ReceiptLongOutlinedIcon fontSize="small" />}
            />
            <OverviewStatCard
              label="Клиентская база"
              value={clientStats.total}
              caption={`${clientStats.repeat} клиентов уже вернулись повторно`}
              icon={<Groups2OutlinedIcon fontSize="small" />}
            />
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <BuildOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="h6" fontWeight={800}>
                Услуги
              </Typography>
            </Stack>
            <Typography color="text.secondary">
              Сколько карточек уже создано и какая часть каталога готова к приему заявок.
            </Typography>
            <MetricRow label="Всего создано" value={String(servicesStats.total)} />
            <MetricRow label="Опубликовано" value={String(servicesStats.PUBLISHED)} />
            <MetricRow label="Черновики" value={String(servicesStats.DRAFT)} />
            <MetricRow label="Архив" value={String(servicesStats.ARCHIVED)} />
            <MetricRow label="Доля опубликованных" value={formatPercent(servicesStats.PUBLISHED, servicesStats.total)} />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AssignmentTurnedInOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="h6" fontWeight={800}>
                Заявки
              </Typography>
            </Stack>
            <Typography color="text.secondary">
              Воронка первых откликов: от новых обращений до перевода в заказ или закрытия без сделки.
            </Typography>
            <MetricRow label="Всего заявок" value={String(requestStats.total)} />
            <MetricRow label="Новые" value={String(requestStats.NEW)} />
            <MetricRow label="В обсуждении" value={String(requestStats.DISCUSSING)} />
            <MetricRow label="Заказы (активные)" value={String(requestStats.ACTIVE)} />
            <MetricRow label="Закрыто" value={String(requestStats.CLOSED)} />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TrendingUpOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="h6" fontWeight={800}>
                Заказы и клиенты
              </Typography>
            </Stack>
            <Typography color="text.secondary">
              Итог по сделкам и клиентской базе, сформированной из заказов активного provider.
            </Typography>
            <MetricRow label="Всего заказов" value={String(ordersStats.total)} />
            <MetricRow label="Активные" value={String(ordersStats.ACTIVE ?? 0)} />
            <MetricRow label="Завершенные" value={String(ordersStats.COMPLETED ?? 0)} />
            <MetricRow label="Уникальные клиенты" value={String(clientStats.total)} />
            <MetricRow label="Повторные клиенты" value={String(clientStats.repeat)} />
          </Stack>
        </Paper>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.3fr 1fr 1fr" },
          gap: 2,
        }}
      >
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>
              Что сейчас требует внимания
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                  Входящий поток
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {requestStats.NEW}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Новых обращений ожидают первичной реакции.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                  Активная работа
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {ordersStats.ACTIVE ?? 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Заказов находятся в исполнении прямо сейчас.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                  Потенциал каталога
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {servicesStats.DRAFT}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Услуг еще можно подготовить и вывести в публикацию.
                </Typography>
              </Paper>
            </Box>
          </Stack>
        </Paper>

        <TodayRemindersWidget reminders={todayReminders} />

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={800}>
              Быстрые переходы
            </Typography>
            <Typography color="text.secondary">
              Самые важные рабочие разделы профессионального кабинета.
            </Typography>
            <Button component={Link} href="/pro/clients" variant="outlined" fullWidth>
              Клиенты
            </Button>
            <Button component={Link} href="/pro/services/create" variant="outlined" fullWidth>
              Создать услугу
            </Button>
            <Button component={Link} href="/pro/team" variant="outlined" fullWidth>
              Команда
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
