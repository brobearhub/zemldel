"use client";

import {
  Alert,
  Box,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { type RequestProDto, type RequestStatus } from "@/entities/request";
import {
  DEFAULT_ENABLED_PRO_REQUEST_STATUSES,
  groupProRequestsByStatus,
  mergeProRequestFeedItems,
  toggleProRequestStatus,
} from "@/widgets/pro-requests/lib/group-requests-by-status";
import { useProRequestsFeed } from "@/widgets/pro-requests/model/useProRequestsFeed";
import { ProRequestBoardColumn } from "@/widgets/pro-requests/ui/ProRequestBoardColumn";
import { ProRequestsFeedFilters } from "@/widgets/pro-requests/ui/ProRequestsFeedFilters";
import { ProRequestsFeedHeader } from "@/widgets/pro-requests/ui/ProRequestsFeedHeader";

type Props = { initialItems: RequestProDto[]; initialOrders: RequestProDto[] };

const COLUMN_MIN_WIDTH = 340;

async function fetchProviderOrders(): Promise<RequestProDto[]> {
  const res = await fetch("/api/pro/requests", { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as
    | RequestProDto[]
    | { error?: string }
    | null;
  if (!res.ok) {
    throw new Error(
      payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        payload.error
        ? payload.error
        : "Не удалось загрузить заявки",
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
  const [includeUncategorized, setIncludeUncategorized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [enabledStatuses, setEnabledStatuses] = useState<RequestStatus[]>([
    ...DEFAULT_ENABLED_PRO_REQUEST_STATUSES,
  ]);
  const [mobileStatus, setMobileStatus] = useState<RequestStatus>("NEW");

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const filterInboxItems = useMemo(() => {
    const hasCategoryFilters = activeCategoryIds.length > 0;
    const hasFreeformFilter = includeFreeform;
    if (!hasCategoryFilters && !hasFreeformFilter && !includeUncategorized) {
      return (items: RequestProDto[]) => items;
    }

    const set = new Set(activeCategoryIds);
    return (items: RequestProDto[]) =>
      items.filter((item) => {
        if (hasCategoryFilters && item.categoryId && set.has(item.categoryId))
          return true;
        if (hasFreeformFilter && item.subjectType === "FREEFORM") return true;
        if (includeUncategorized && !item.categoryId) return true;
        return false;
      });
  }, [activeCategoryIds, includeFreeform, includeUncategorized]);

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
  }, [
    feed.archiveItems,
    feed.itemsByStatus.DISCUSSING,
    feed.itemsByStatus.NEW,
    filterInboxItems,
    orders,
  ]);

  function handleToggleCategory(categoryId: string) {
    setActiveCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  function handleResetFilters() {
    setActiveCategoryIds([]);
    setIncludeFreeform(false);
    setIncludeUncategorized(false);
  }

  async function refreshAll() {
    setRefreshing(true);
    setOrdersError(null);
    try {
      await Promise.all([
        feed.refresh(),
        fetchProviderOrders()
          .then(setOrders)
          .catch((error) => setOrdersError(
            error instanceof Error ? error.message : "Не удалось загрузить заявки",
          )),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const visibleColumns = columns.filter((column) =>
    enabledStatuses.includes(column.status),
  );
  const mobileColumn =
    columns.find((column) => column.status === mobileStatus) ??
    columns[0] ??
    null;
  const totalVisibleItems = columns.reduce(
    (sum, column) => sum + column.items.length,
    0,
  );
  const showFreeformEmptyState =
    includeFreeform &&
    !includeUncategorized &&
    activeCategoryIds.length === 0 &&
    totalVisibleItems === 0;

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <ProRequestsFeedHeader
        onRefresh={() => void refreshAll()}
        refreshing={refreshing}
      />
      <ProRequestsFeedFilters
        isDesktop={isDesktop}
        eligibleCategories={feed.eligibleCategories}
        activeCategoryIds={activeCategoryIds}
        includeFreeform={includeFreeform}
        includeUncategorized={includeUncategorized}
        onToggleCategory={handleToggleCategory}
        onToggleFreeform={() => setIncludeFreeform((value) => !value)}
        onToggleUncategorized={() => setIncludeUncategorized((value) => !value)}
        onResetFilters={handleResetFilters}
        statusFilters={columns.map((column) => ({
          status: column.status,
          label: column.label,
          count: column.items.length,
        }))}
        enabledStatuses={enabledStatuses}
        onToggleStatus={(status) => setEnabledStatuses((current) => toggleProRequestStatus(current, status))}
        mobileStatus={mobileStatus}
        onSelectMobileStatus={setMobileStatus}
      />

      {feed.error ? <Alert severity="error">{feed.error}</Alert> : null}
      {ordersError ? <Alert severity="error">{ordersError}</Alert> : null}
      {isDesktop && visibleColumns.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>
          Выберите хотя бы один статус
        </Typography>
      ) : null}
      {showFreeformEmptyState ? (
        <Alert severity="info">
          Пока нет свободных заявок. Они появятся здесь, когда заказчики
          создадут новые обращения.
        </Alert>
      ) : null}

      {!showFreeformEmptyState && isDesktop ? (
        <Box
          role="region"
          aria-label="Доска заявок по статусам"
          tabIndex={0}
          sx={{
            display: "flex",
            alignItems: "stretch",
            gap: 4,
            overflowX: "auto",
            pb: 2,
            minWidth: 0,
          }}
        >
          {visibleColumns.map((column) => (
            <Box
              key={column.status}
              sx={{
                position: "relative",
                flex: `0 0 ${COLUMN_MIN_WIDTH}px`,
                width: COLUMN_MIN_WIDTH,
                minWidth: 0,
                "&:not(:last-child)::after": {
                  content: '""',
                  position: "absolute",
                  top: 8,
                  bottom: 8,
                  insetInlineEnd: (theme) => theme.spacing(-2),
                  borderInlineEnd: "1px dashed",
                  borderColor: (theme) => alpha(theme.palette.text.primary, 0.3),
                  pointerEvents: "none",
                },
                '@media (min-width: 1440px)': {
                  flexBasis: 380,
                  width: 380,
                },
              }}
            >
              <ProRequestBoardColumn column={column} />
            </Box>
          ))}
        </Box>
      ) : !showFreeformEmptyState && mobileColumn ? (
        <ProRequestBoardColumn column={mobileColumn} />
      ) : null}
    </Stack>
  );
}
