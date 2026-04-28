"use client";

import { useMemo, useState } from "react";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Box, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { formatRequestDate, getRequestStatusLabel, isOpenRequestStatus, type RequestCustomerDto, type RequestStatus } from "@/entities/request";

type Props = {
  initialOrders: RequestCustomerDto[];
};

type ClientSummary = {
  id: string;
  customerUserId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  ordersCount: number;
  lastOrderAt: string;
  statuses: Partial<Record<RequestStatus, number>>;
  recentServiceTitles: string[];
};

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

function getClientLabel(client: ClientSummary) {
  if (client.customerName && client.customerEmail) {
    return `${client.customerName} · ${client.customerEmail}`;
  }

  if (client.customerName) {
    return client.customerName;
  }

  if (client.customerEmail) {
    return client.customerEmail;
  }

  return "Клиент без имени";
}

function summarizeClients(orders: RequestCustomerDto[]) {
  const clients = new Map<string, ClientSummary>();

  for (const order of orders) {
    const key = getClientKey(order);
    const existing = clients.get(key);

    if (existing) {
      existing.ordersCount += 1;
      existing.statuses[order.status] = (existing.statuses[order.status] ?? 0) + 1;

      if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
        existing.lastOrderAt = order.createdAt;
      }

      if (!existing.customerName && order.customerName) {
        existing.customerName = order.customerName;
      }

      if (!existing.customerEmail && order.customerEmail) {
        existing.customerEmail = order.customerEmail;
      }

      const title = order.serviceTitle ?? "";
      if (title && !existing.recentServiceTitles.includes(title) && existing.recentServiceTitles.length < 3) {
        existing.recentServiceTitles.push(title);
      }

      continue;
    }

    clients.set(key, {
      id: key,
      customerUserId: order.customerUserId || null,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      ordersCount: 1,
      lastOrderAt: order.createdAt,
      statuses: { [order.status]: 1 },
      recentServiceTitles: order.serviceTitle ? [order.serviceTitle] : [],
    });
  }

  return [...clients.values()].sort((left, right) => {
    return new Date(right.lastOrderAt).getTime() - new Date(left.lastOrderAt).getTime();
  });
}

export function ProClientsBoard({ initialOrders }: Props) {
  const [search, setSearch] = useState("");

  const clients = useMemo(() => summarizeClients(initialOrders), [initialOrders]);
  const stats = useMemo(() => {
    return clients.reduce(
      (acc, client) => {
        acc.totalClients += 1;
        acc.totalOrders += client.ordersCount;
        if (client.ordersCount > 1) {
          acc.repeatClients += 1;
        }
        return acc;
      },
      {
        totalClients: 0,
        totalOrders: 0,
        repeatClients: 0,
      }
    );
  }, [clients]);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return clients;
    }

    return clients.filter((client) => {
      return [client.customerName, client.customerEmail, ...client.recentServiceTitles]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [clients, search]);

  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={(theme) => ({
          p: 2.5,
          borderColor: "primary.main",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(90,127,160,0.18) 0%, rgba(15,18,14,0) 100%)"
              : "linear-gradient(180deg, rgba(90,127,160,0.08) 0%, rgba(255,255,255,0.92) 100%)",
        })}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  flexShrink: 0,
                }}
              >
                <Groups2OutlinedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  База клиентов по заказам
                </Typography>
                <Typography color="text.secondary">
                  Здесь собраны все заказчики, которые уже оформили хотя бы один заказ у активного provider.
                </Typography>
              </Box>
            </Stack>
            <Chip label={`${stats.totalClients} клиентов`} color="primary" variant="filled" />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                Всего клиентов
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {stats.totalClients}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                Всего заказов
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {stats.totalOrders}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                Повторные клиенты
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {stats.repeatClients}
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      <TextField
        label="Поиск по имени, email или услуге"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        fullWidth
      />

      {clients.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            Пока нет клиентов
          </Typography>
          <Typography color="text.secondary">
            Клиенты появятся здесь после того, как по услугам активного provider будут оформлены первые заказы.
          </Typography>
        </Paper>
      ) : null}

      <Stack spacing={2}>
        {filteredClients.map((client) => {
          const openCount = Object.entries(client.statuses).reduce((sum, [status, count]) => {
            return isOpenRequestStatus(status as RequestStatus) ? sum + (count ?? 0) : sum;
          }, 0);
          const completedCount = client.statuses.COMPLETED ?? 0;
          const cancelledCount = client.statuses.CANCELLED ?? 0;

          return (
            <Paper
              key={client.id}
              variant="outlined"
              sx={{
                p: 2.5,
                borderLeft: 4,
                borderLeftColor: "primary.main",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ md: "flex-start" }}
              >
                <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
                      Клиент
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {getClientLabel(client)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<PersonOutlineOutlinedIcon />}
                      label={client.customerName || client.customerEmail || "Контакт не заполнен"}
                    />
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      icon={<ReceiptLongOutlinedIcon />}
                      label={`${client.ordersCount} заказ${client.ordersCount === 1 ? "" : client.ordersCount < 5 ? "а" : "ов"}`}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {openCount > 0 ? (
                      <Chip size="small" color="info" variant="filled" label={`В работе: ${openCount}`} />
                    ) : null}
                    {completedCount > 0 ? (
                      <Chip size="small" color="success" variant="filled" label={`Завершенных: ${completedCount}`} />
                    ) : null}
                    {cancelledCount > 0 ? (
                      <Chip size="small" color="default" variant="outlined" label={`Отмененных: ${cancelledCount}`} />
                    ) : null}
                  </Stack>

                  {client.recentServiceTitles.length > 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Услуги: {client.recentServiceTitles.join(", ")}
                    </Typography>
                  ) : null}
                </Stack>

                <Box
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    bgcolor: "action.hover",
                    width: { xs: "100%", md: 320 },
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
                    История клиента
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Последний заказ: {formatRequestDate(client.lastOrderAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Статусы:{" "}
                    {Object.entries(client.statuses)
                      .filter(([, count]) => (count ?? 0) > 0)
                      .map(([status, count]) => `${getRequestStatusLabel(status as RequestStatus)} ${count}`)
                      .join(", ")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Раздел агрегирует клиентов только из заказов активного provider, без отдельной CRM-сущности.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          );
        })}

        {clients.length > 0 && filteredClients.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography color="text.secondary">
              По текущему запросу клиенты не найдены. Попробуйте изменить строку поиска.
            </Typography>
          </Paper>
        ) : null}
      </Stack>
    </Stack>
  );
}
