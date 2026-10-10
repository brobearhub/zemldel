"use client";

import { Alert, Box, Chip, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { type RequestProDto, type RequestStatus } from "@/entities/request";
import {
  DEFAULT_ENABLED_PRO_REQUEST_STATUSES,
  groupProRequestsByStatus,
  mergeProRequestFeedItems,
  toggleProRequestStatus,
} from "@/widgets/pro-requests/lib/group-requests-by-status";
import { useProRequestsFeed } from "@/widgets/pro-requests/model/useProRequestsFeed";
import { FeedColumn } from "@/widgets/pro-requests/ui/FeedColumn";
import { ProRequestsFeedFilters } from "@/widgets/pro-requests/ui/ProRequestsFeedFilters";
import { ProRequestsFeedHeader } from "@/widgets/pro-requests/ui/ProRequestsFeedHeader";
import { ServiceRequestList } from "@/widgets/pro-requests/ui/ServiceRequestList";

type Props = { initialItems: RequestProDto[]; initialOrders: RequestProDto[] };

const DESKTOP_COL_HEADER_HEIGHT = 52;
const COLUMN_MIN_WIDTH = 280;

async function fetchProviderOrders(): Promise<RequestProDto[]> {
  const res = await fetch("/api/pro/requests", { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as RequestProDto[] | { error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && !Array.isArray(payload) && payload.error ? payload.error : "Не удалось загрузить заявки"
    );
  }
  return Array.isArray(payload) ? payload : [];
}

export function ProRequestsFeed({ initialItems, initialOrders }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const feed = useProRequestsFeed({ initialItems });
  const [orders, setOrders] = useState<RequestProDto[]>(initialOrders);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [includeFreeform, setIncludeFreeform] = useState(false);
  const [enabledStatuses, setEnabledStatuses] = useState<RequestStatus[]>([...DEFAULT_ENABLED_PRO_REQUEST_STATUSES]);
  const [mobileStatus, setMobileStatus] = useState<RequestStatus>("NEW");

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const filterInboxItems = useMemo(() => {
    const hasCategoryFilters = activeCategoryIds.length > 0;
    const hasFreeformFilter = includeFreeform;
    if (!hasCategoryFilters && !hasFreeformFilter) {
      return (items: RequestProDto[]) => items;
    }

    const set = new Set(activeCategoryIds);
    return (items: RequestProDto[]) =>
      items.filter((item) => {
        if (hasCategoryFilters && item.categoryId && set.has(item.categoryId)) return true;
        if (hasFreeformFilter && item.subjectType === "FREEFORM") return true;
        return false;
      });
  }, [activeCategoryIds, includeFreeform]);

  const columns = useMemo(() => {
    const merged = mergeProRequestFeedItems([
      feed.itemsByStatus.NEW,
      feed.itemsByStatus.DISCUSSING,
      feed.archiveItems,
      orders,
    ]);
    return groupProRequestsByStatus(merged).map((column) => ({
      ...column,
      items: filterInboxItems(column.items),
    }));
  }, [feed.archiveItems, feed.itemsByStatus.DISCUSSING, feed.itemsByStatus.NEW, filterInboxItems, orders]);

  function handleToggleCategory(categoryId: string) {
    setActiveCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId]
    );
  }

  function handleResetFilters() {
    setActiveCategoryIds([]);
    setIncludeFreeform(false);
  }

  async function refreshAll() {
    setOrdersError(null);
    await Promise.all([
      feed.refresh(),
      fetchProviderOrders()
        .then((list) => setOrders(list))
        .catch((e) => setOrdersError(e instanceof Error ? e.message : "Не удалось загрузить заявки")),
    ]);
  }

  const visibleColumns = columns.filter((column) => enabledStatuses.includes(column.status));
  const mobileColumn =
    visibleColumns.find((column) => column.status === mobileStatus) ?? visibleColumns[0] ?? null;

  return (
    <Stack spacing={2}>
      <ProRequestsFeedHeader onRefresh={() => void refreshAll()} />

      {!isDesktop ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {visibleColumns.map((column) => (
            <Chip
              key={column.status}
              label={`${column.label} · ${column.items.length}`}
              color={mobileColumn?.status === column.status ? "primary" : "default"}
              variant={mobileColumn?.status === column.status ? "filled" : "outlined"}
              onClick={() => setMobileStatus(column.status)}
              sx={{ height: 40, fontWeight: 700 }}
            />
          ))}
        </Stack>
      ) : null}

      <ProRequestsFeedFilters
        isDesktop={isDesktop}
        statusChips={feed.statusChips}
        settings={feed.settings}
        onChangeSettings={feed.setSettings}
        showStatusChips={false}
        eligibleCategories={feed.eligibleCategories}
        activeCategoryIds={activeCategoryIds}
        includeFreeform={includeFreeform}
        onToggleCategory={handleToggleCategory}
        onToggleFreeform={() => setIncludeFreeform((v) => !v)}
        onResetFilters={handleResetFilters}
        statusFilters={columns.map((column) => ({ status: column.status, label: column.label }))}
        enabledStatuses={enabledStatuses}
        onToggleStatus={(status) => {
          const enabling = !enabledStatuses.includes(status);
          setEnabledStatuses((current) => toggleProRequestStatus(current, status));
          if (enabling) setMobileStatus(status);
        }}
      />

      {feed.error ? <Alert severity="error">{feed.error}</Alert> : null}
      {ordersError ? <Alert severity="error">{ordersError}</Alert> : null}
      {visibleColumns.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>Выберите хотя бы один статус</Typography>
      ) : null}

      {isDesktop ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            overflowX: "auto",
            pb: 1,
          }}
        >
          {visibleColumns.map((column) => (
            <Box key={column.status} sx={{ flex: `0 0 ${COLUMN_MIN_WIDTH}px`, width: COLUMN_MIN_WIDTH }}>
              <FeedColumn
                headerMinHeight={DESKTOP_COL_HEADER_HEIGHT}
                header={
                  <Typography variant="h6" sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>
                    {column.label}
                    <Typography component="span" sx={{ ml: 0.75, fontWeight: 700, fontSize: 14, color: "text.secondary" }}>
                      {column.items.length}
                    </Typography>
                  </Typography>
                }
              >
                <ServiceRequestList items={column.items} minRows={4} allowLockedClick />
              </FeedColumn>
            </Box>
          ))}
        </Box>
      ) : mobileColumn ? (
        <ServiceRequestList items={mobileColumn.items} minRows={8} allowLockedClick />
      ) : null}
    </Stack>
  );
}
