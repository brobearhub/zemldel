"use client";

import { Box, Paper, Typography } from "@mui/material";
import type { RequestProDto } from "@/entities/request";
import {
  REQUEST_LIST_STAGES,
  countOpenRequests,
  getRequestListStageLabel,
  type RequestListStage,
} from "../lib/request-list-stage";
import type { RequestListStageCounts } from "../lib/request-list-cache";
import { useRequestList } from "../model/use-request-list";
import { ServiceRequestRow } from "./ServiceRequestRow";

type Props = {
  serviceId: string | null;
  serviceTitle?: string;
  titleFor?: (request: RequestProDto) => string;
  emptyLabel?: string;
  showCustomerAvatar?: boolean;
};

function rowTitle(request: RequestProDto, serviceTitle: string | undefined, titleFor?: (request: RequestProDto) => string) {
  if (titleFor) return titleFor(request);
  const title = serviceTitle?.trim() ?? "";
  return title.length > 0 ? title : "Заявка";
}

type FiltersProps = {
  counts: RequestListStageCounts;
  selected: RequestListStage;
  onSelect: (stage: RequestListStage) => void;
};

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        bgcolor: active ? "primary.dark" : "primary.light",
        color: active ? "common.black" : "common.white",
      }}
    >
      {count}
    </Box>
  );
}

function RequestListFilters({ counts, selected, onSelect }: FiltersProps) {
  return (
    <Box
      component="nav"
      aria-label="Фильтр заявок"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.25,
        p: 0.25,
      }}
    >
      {REQUEST_LIST_STAGES.map((stage) => {
        const active = selected === stage;
        const count = counts[stage];
        return (
          <Box
            key={stage}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(stage)}
            sx={{
              m: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              border: 0,
              borderRadius: 999,
              outline: "none",
              bgcolor: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              fontWeight: active ? 700 : 600,
              fontSize: 14,
              lineHeight: 1.2,
              color: active ? "text.primary" : "action.disabled",
              "&:focus": { outline: "none" },
              "&:focus-visible": { outline: "none" },
            }}
          >
            {getRequestListStageLabel(stage)}
            {typeof count === "number" && count > 0 ? <CountBadge count={count} active={active} /> : null}
          </Box>
        );
      })}
    </Box>
  );
}

export function ServiceRequestsPanel({
  serviceId,
  serviceTitle,
  titleFor,
  emptyLabel = "Пока нет заявок",
  showCustomerAvatar = false,
}: Props) {
  const { stage, selectStage, requests, counts, error, isLoading } = useRequestList(serviceId);

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2.5,
          py: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: "text.primary" }}>
            Заявки
          </Typography>
          {requests !== null ? (
            <Typography component="span" sx={{ fontWeight: 700, fontSize: 14, color: "text.primary" }}>
              {countOpenRequests(counts)}
            </Typography>
          ) : null}
        </Box>
        <RequestListFilters counts={counts} selected={stage} onSelect={selectStage} />
      </Box>

      {isLoading ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>Загрузка…</Typography>
      ) : error ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>{error}</Typography>
      ) : requests && requests.length === 0 ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>{emptyLabel}</Typography>
      ) : (
        requests?.map((request) => (
          <ServiceRequestRow
            key={request.id}
            request={request}
            title={rowTitle(request, serviceTitle, titleFor)}
            showCustomerAvatar={showCustomerAvatar}
          />
        ))
      )}
    </Paper>
  );
}
