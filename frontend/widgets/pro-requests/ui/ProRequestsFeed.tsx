"use client";

import { Alert, Chip, Stack, Tab, Tabs, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { isOpenOrderStatus, type OrderDto } from "@/entities/order";
import type { ServiceRequestProDto } from "@/entities/service-request";
import { useProRequestsFeed } from "@/widgets/pro-requests/model/useProRequestsFeed";
import type { DialogScope } from "@/widgets/pro-requests/model/types";
import { FeedColumn } from "@/widgets/pro-requests/ui/FeedColumn";
import { ProRequestsFeedFilters } from "@/widgets/pro-requests/ui/ProRequestsFeedFilters";
import { ProRequestsFeedHeader } from "@/widgets/pro-requests/ui/ProRequestsFeedHeader";
import { OrderList } from "@/widgets/pro-requests/ui/OrderList";
import { ServiceRequestList } from "@/widgets/pro-requests/ui/ServiceRequestList";

type Props = { initialItems: ServiceRequestProDto[]; initialActiveOrders: OrderDto[] };

type MobileTab = "NEW" | "DISCUSSING" | "ORDERS";
function isDialogScope(value: unknown): value is DialogScope {
  return value === "ACTIVE" || value === "ARCHIVE";
}

const DESKTOP_COL_HEADER_HEIGHT = 44;

async function fetchActiveOrders(): Promise<OrderDto[]> {
  const res = await fetch("/api/pro/orders", { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as OrderDto[] | { error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && !Array.isArray(payload) && payload.error ? payload.error : "Не удалось загрузить заказы"
    );
  }
  const list = Array.isArray(payload) ? payload : [];
  return list.filter((o) => o && typeof o === "object" && isOpenOrderStatus((o as OrderDto).status)) as OrderDto[];
}

export function ProRequestsFeed({ initialItems, initialActiveOrders }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const feed = useProRequestsFeed({ initialItems, isDesktop });
  const [activeOrders, setActiveOrders] = useState<OrderDto[]>(initialActiveOrders);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [mobileTab, setMobileTab] = useState<MobileTab>(feed.settings.status);
  useEffect(() => {
    if (isDesktop) return;
    if (mobileTab === "ORDERS") return;
    setMobileTab(feed.settings.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.settings.status, isDesktop]);

  const mobileTabs = useMemo(
    () =>
      [
        { id: "NEW" as const, label: "Новые" },
        { id: "DISCUSSING" as const, label: "Диалог" },
        { id: "ORDERS" as const, label: "Заказы" },
      ] as const,
    []
  );

  async function refreshAll() {
    setOrdersError(null);
    await Promise.all([
      feed.refresh(),
      fetchActiveOrders()
        .then((list) => setActiveOrders(list))
        .catch((e) => setOrdersError(e instanceof Error ? e.message : "Не удалось загрузить заказы")),
    ]);
  }

  const baseMinRows = isDesktop ? 10 : 8;
  const desktopRows = Math.max(baseMinRows, feed.itemsByStatus.NEW.length, feed.itemsByStatus.DISCUSSING.length, activeOrders.length);

  return (
    <Stack spacing={2}>
      <ProRequestsFeedHeader onRefresh={() => void refreshAll()} />

      {!isDesktop ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {mobileTabs.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              color={mobileTab === t.id ? "primary" : "default"}
              variant={mobileTab === t.id ? "filled" : "outlined"}
              onClick={() => {
                if (t.id === "ORDERS") {
                  setMobileTab("ORDERS");
                  return;
                }
                setMobileTab(t.id);
                feed.setSettings((current) => ({ ...current, status: t.id }));
              }}
              sx={{ height: 40, fontWeight: 700 }}
            />
          ))}
        </Stack>
      ) : null}

      {isDesktop || mobileTab !== "ORDERS" ? (
        <ProRequestsFeedFilters
          isDesktop={isDesktop}
          statusChips={feed.statusChips}
          eligibleCategories={feed.eligibleCategories}
          settings={feed.settings}
          onChangeSettings={feed.setSettings}
          showStatusChips={false}
        />
      ) : null}

      {feed.error ? <Alert severity="error">{feed.error}</Alert> : null}
      {ordersError ? <Alert severity="error">{ordersError}</Alert> : null}

      {isDesktop ? (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
          <FeedColumn
            headerMinHeight={DESKTOP_COL_HEADER_HEIGHT}
            header={
              <Typography variant="h6" fontWeight={900}>
                Новые
              </Typography>
            }
          >
            <ServiceRequestList items={feed.itemsByStatus.NEW} minRows={desktopRows} />
          </FeedColumn>

          <FeedColumn
            headerMinHeight={DESKTOP_COL_HEADER_HEIGHT}
            header={
              <Tabs
                value={feed.settings.dialogScope}
                onChange={(_, value) =>
                  feed.setSettings((current) => ({ ...current, dialogScope: isDialogScope(value) ? value : "ACTIVE" }))
                }
                textColor="primary"
                indicatorColor="primary"
                variant="standard"
                sx={{ minHeight: DESKTOP_COL_HEADER_HEIGHT }}
              >
                <Tab
                  value="ACTIVE"
                  label="Активные диалоги"
                  sx={{ minHeight: DESKTOP_COL_HEADER_HEIGHT, fontWeight: 800, px: 1.25 }}
                />
                <Tab value="ARCHIVE" label="Архив" sx={{ minHeight: DESKTOP_COL_HEADER_HEIGHT, fontWeight: 800, px: 1.25 }} />
              </Tabs>
            }
          >
            <ServiceRequestList
              items={feed.itemsByStatus.DISCUSSING}
              minRows={desktopRows}
              allowLockedClick={feed.settings.dialogScope === "ARCHIVE"}
            />
          </FeedColumn>

          <FeedColumn
            headerMinHeight={DESKTOP_COL_HEADER_HEIGHT}
            header={
              <Typography variant="h6" fontWeight={900}>
                Заказы
              </Typography>
            }
          >
            <OrderList items={activeOrders} minRows={desktopRows} />
          </FeedColumn>
        </Stack>
      ) : (
        mobileTab === "ORDERS" ? (
          <OrderList items={activeOrders} minRows={baseMinRows} />
        ) : (
          <Stack spacing={0}>
            {mobileTab === "DISCUSSING" ? (
              <Tabs
                value={feed.settings.dialogScope}
                onChange={(_, value) =>
                  feed.setSettings((current) => ({ ...current, dialogScope: isDialogScope(value) ? value : "ACTIVE" }))
                }
                textColor="primary"
                indicatorColor="primary"
                variant="fullWidth"
              >
                <Tab value="ACTIVE" label="Активные диалоги" sx={{ fontWeight: 800 }} />
                <Tab value="ARCHIVE" label="Архив" sx={{ fontWeight: 800 }} />
              </Tabs>
            ) : null}

            <ServiceRequestList
              items={feed.mobileItems}
              minRows={baseMinRows}
              allowLockedClick={mobileTab === "DISCUSSING" && feed.settings.dialogScope === "ARCHIVE"}
            />
          </Stack>
        )
      )}
    </Stack>
  );
}

