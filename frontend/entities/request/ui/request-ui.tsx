"use client";

import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import LinearScaleOutlinedIcon from "@mui/icons-material/LinearScaleOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import {
  Box,
  Chip,
  List,
  ListItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { RequestCustomerDto, RequestStatus } from "../dto/request.dto";
import {
  buildCustomerRequestFlowSteps,
  buildRequestFlowSteps,
  formatRequestDate,
  getRequestCardAccentColor,
  getCustomerRequestFlowActiveStepId,
  getRequestFlowActiveStepId,
  getRequestStatusColor,
  isOpenRequestStatus,
  type RequestStatusFilter,
  type StatusProgressStep,
} from "./request-status-flow";
import { getRequestStatusLabel } from "../dto/request.dto";

export type { StatusProgressStep };

export type StatusProgressView = "chain" | "list";

const STATUS_PROGRESS_VIEW_STORAGE_KEY = "request.statusProgressView";

export function useStatusProgressView(defaultView: StatusProgressView = "chain") {
  const [view, setView] = useState<StatusProgressView>(defaultView);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STATUS_PROGRESS_VIEW_STORAGE_KEY);
      if (raw === "chain" || raw === "list") setView(raw);
    } catch {
      // ignore storage errors
    }
  }, []);

  const update = useCallback((next: StatusProgressView) => {
    setView(next);
    try {
      window.localStorage.setItem(STATUS_PROGRESS_VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  return [view, update] as const;
}

type StatusProgressViewToggleProps = {
  value: StatusProgressView;
  onChange: (next: StatusProgressView) => void;
  disabled?: boolean;
};

export function StatusProgressViewToggle({ value, onChange, disabled }: StatusProgressViewToggleProps) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      disabled={disabled}
      onChange={(_, next) => {
        if (next === "chain" || next === "list") onChange(next);
      }}
      sx={{
        bgcolor: "background.paper",
        "& .MuiToggleButton-root": { px: 1, py: 0.25 },
      }}
    >
      <ToggleButton value="chain" aria-label="Цепочка шагов">
        <LinearScaleOutlinedIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="list" aria-label="Список статусов">
        <FormatListBulletedOutlinedIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

type StatusProgressStepperProps = {
  steps: StatusProgressStep[];
  activeStepId: string;
  muted?: boolean;
};

export function StatusProgressStepper({ steps, activeStepId, muted = false }: StatusProgressStepperProps) {
  const activeIndex = Math.max(
    steps.findIndex((step) => step.id === activeStepId),
    0
  );

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Stepper
        alternativeLabel
        activeStep={activeIndex}
      >
        {steps.map((step, index) => (
          <Step key={step.id} completed={step.completed}>
            <StepLabel icon={index + 1}>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

export function StatusProgressList({ steps, activeStepId, muted = false }: StatusProgressStepperProps) {
  return (
    <List dense disablePadding>
      {steps.map((step, index) => {
        const isActive = step.id === activeStepId;
        const isCompleted = step.completed;
        const badgeBg = muted
          ? "action.disabledBackground"
          : isActive
            ? "primary.main"
            : isCompleted
              ? "primary.dark"
              : "action.hover";
        const badgeColor = muted ? "text.disabled" : isActive || isCompleted ? "common.white" : "text.secondary";
        const labelColor = muted ? "text.disabled" : isActive || isCompleted ? "text.primary" : "text.secondary";

        return (
          <ListItem key={step.id} disableGutters sx={{ py: 0.5 }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ width: "100%" }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  bgcolor: badgeBg,
                  color: badgeColor,
                  fontSize: 12,
                  fontWeight: 900,
                  border: 1,
                  borderColor: muted ? "action.disabledBackground" : isActive || isCompleted ? "primary.main" : "divider",
                }}
              >
                {index + 1}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  pt: "3px",
                  color: labelColor,
                  fontWeight: muted ? 700 : isActive ? 900 : isCompleted ? 800 : 700,
                }}
              >
                {step.label}
              </Typography>
            </Stack>
          </ListItem>
        );
      })}
    </List>
  );
}

type RequestOverviewPanelProps = {
  heading: string;
  description: string;
  summaryChipLabel: string;
  stats: Record<RequestStatusFilter, number>;
  selectedFilter: RequestStatusFilter;
};

export function RequestOverviewPanel({
  heading,
  description,
  summaryChipLabel,
  stats,
  selectedFilter,
}: RequestOverviewPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 2.5,
        borderColor: "secondary.main",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(180deg, rgba(61,90,122,0.18) 0%, rgba(15,18,14,0) 100%)"
            : "linear-gradient(180deg, rgba(61,90,122,0.08) 0%, rgba(255,255,255,0.92) 100%)",
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
                bgcolor: "primary.dark",
                color: "common.white",
                flexShrink: 0,
              }}
            >
              <ReceiptLongOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {heading}
              </Typography>
              <Typography color="text.secondary">{description}</Typography>
            </Box>
          </Stack>
          <Chip label={summaryChipLabel} color="primary" variant="filled" />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          {([
            ["ALL", "Всего"],
            ["ACTIVE", "Активные"],
            ["COMPLETED", "Завершённые"],
            ["CANCELLED", "Отменённые"],
          ] as const).map(([status, label]) => (
            <Paper
              key={status}
              variant="outlined"
              sx={{ p: 1.5, flex: 1, minWidth: 0, borderColor: selectedFilter === status ? "primary.main" : "divider" }}
            >
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                {label}
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {stats[status] ?? 0}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

type RequestSearchAndFiltersProps = {
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  filter: RequestStatusFilter;
  onFilterChange: (filter: RequestStatusFilter) => void;
};

export function RequestSearchAndFilters({
  searchLabel,
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: RequestSearchAndFiltersProps) {
  return (
    <Stack spacing={2}>
      <TextField
        label={searchLabel}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        fullWidth
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {(
          [
            "ALL",
            "ACTIVE",
            "ACCEPTANCE_PENDING",
            "ACCEPTED",
            "COMPLETED",
            "CANCELLED",
          ] as const
        ).map((status) => (
          <Chip
            key={status}
            label={status === "ALL" ? "Все" : getRequestStatusLabel(status)}
            color={filter === status ? "primary" : "default"}
            variant={filter === status ? "filled" : "outlined"}
            onClick={() => onFilterChange(status)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

type RequestCardInfoRow = {
  label: string;
  value: string;
};

type RequestCardProps = {
  request: RequestCustomerDto;
  partyChip: ReactNode;
  infoRows: RequestCardInfoRow[];
  infoNote: string;
  leftMeta?: ReactNode;
  infoPanelSx?: SxProps<Theme>;
};

export function RequestCard({
  request,
  partyChip,
  infoRows,
  infoNote,
  leftMeta,
  infoPanelSx,
}: RequestCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderLeft: 4,
        borderLeftColor: getRequestCardAccentColor(request.status),
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
              Заявка
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={700}>
                {request.serviceTitle ?? "Заявка"}
              </Typography>
              <Chip
                size="small"
                label={getRequestStatusLabel(request.status)}
                color={getRequestStatusColor(request.status)}
                variant={request.status === "CANCELLED" || request.status === "CLOSED" ? "outlined" : "filled"}
              />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {partyChip}
          </Stack>

          {leftMeta}

          <Box sx={{ pt: 4 }}>
            <StatusProgressStepper
              steps={buildCustomerRequestFlowSteps(request)}
              activeStepId={getCustomerRequestFlowActiveStepId(request)}
            />
          </Box>
        </Stack>

        <Box
          sx={[
            {
              px: 1.5,
              py: 1.25,
              bgcolor: "action.hover",
              width: { xs: "100%", md: 360 },
              flexShrink: 0,
            },
            ...(Array.isArray(infoPanelSx) ? infoPanelSx : infoPanelSx ? [infoPanelSx] : []),
          ]}
        >
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
            Сведения по заявке
          </Typography>
          {infoRows.map((row) => (
            <Typography key={row.label} variant="body2" color="text.secondary">
              {row.label}: {row.value}
            </Typography>
          ))}
          <Typography variant="body2" color="text.secondary">
            {infoNote}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
