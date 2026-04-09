"use client";

import { useEffect, useMemo, useState } from "react";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import {
  OrderCard,
  OrderOverviewPanel,
  OrderSearchAndFilters,
  formatOrderDate,
  getOrderStatusLabel,
  type OrderDto,
  type OrderStatus,
  type OrderStatusFilter,
} from "@/entities/order";
import { ChatThreadLinkButton } from "@/widgets/chat/ui/ChatThreadLinkButton";

export function CustomerOrdersSection() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.ALL += 1;
        acc[order.status] += 1;
        return acc;
      },
      {
        ALL: 0,
        ACTIVE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      } satisfies Record<OrderStatusFilter, number>
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return orders.filter((order) => {
      const byStatus = filter === "ALL" ? true : order.status === filter;
      const bySearch = normalizedSearch.length
        ? [order.serviceTitle, order.providerName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true;
      return byStatus && bySearch;
    });
  }, [filter, orders, search]);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/profile/orders", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as OrderDto[] | { error?: string } | null;

        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
              ? payload.error
              : "Не удалось загрузить заказы"
          );
        }

        setOrders(payload as OrderDto[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить заказы");
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Заказы
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Здесь отображаются ваши заказы после того, как provider переведет заявку в сделку.
        </Typography>
      </Box>

      <OrderOverviewPanel
        heading="Активные сделки"
        description="Заказы уже созданы и ждут исполнения, завершения или отмены."
        summaryChipLabel={`${orders.length} всего`}
        stats={stats}
        selectedFilter={filter}
      />

      <OrderSearchAndFilters
        searchLabel="Поиск по услуге или provider"
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">Загрузка заказов...</Typography>
        </Paper>
      ) : null}

      {!loading && orders.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            У вас пока нет заказов
          </Typography>
          <Typography color="text.secondary">
            После перевода заявки в заказ сделка появится здесь и будет доступна для отслеживания.
          </Typography>
        </Paper>
      ) : null}

      {!loading ? (
        <Stack spacing={2}>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              leftMeta={
                <ChatThreadLinkButton href={`/orders/${order.id}`} serviceRequestId={order.id} label="Открыть" />
              }
              partyChip={
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<StorefrontOutlinedIcon />}
                  label={order.providerName}
                />
              }
              infoRows={[
                { label: "Дата оформления", value: formatOrderDate(order.createdAt) },
                { label: "Статус исполнения", value: getOrderStatusLabel(order.status) },
              ]}
              infoNote="Заказ сформирован на основании ранее согласованной заявки и ведется как отдельная запись."
            />
          ))}

          {orders.length > 0 && filteredOrders.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography color="text.secondary">
                По текущему фильтру заказов нет. Попробуйте изменить строку поиска или статус.
              </Typography>
            </Paper>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
