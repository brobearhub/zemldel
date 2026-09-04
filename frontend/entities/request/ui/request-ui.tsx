"use client";

import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
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

type StatusProgressStepperProps = {
  steps: StatusProgressStep[];
  activeStepId: string;
  muted?: boolean;
  orientation?: "horizontal" | "vertical";
};

export function StatusProgressStepper({
  steps,
  activeStepId,
  muted = false,
  orientation = "horizontal",
}: StatusProgressStepperProps) {
  const activeIndex = Math.max(
    steps.findIndex((step) => step.id === activeStepId),
    0,
  );
  const isVertical = orientation === "vertical";

  return (
    <Box
      sx={{
        width: isVertical ? "max-content" : "100%",
        maxWidth: "100%",
        display: isVertical ? "flex" : "block",
        justifyContent: isVertical ? "flex-end" : undefined,
        overflowX: isVertical ? "visible" : "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: isVertical ? undefined : "touch",
        ...(muted ? { opacity: 0.72 } : null),
      }}
    >
      <Stepper
        alternativeLabel={!isVertical}
        orientation={orientation}
        activeStep={activeIndex}
        sx={isVertical ? { width: "max-content", maxWidth: "100%" } : undefined}
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{
          alignItems: { md: "center" }
        }}>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: "center",
              flex: 1,
              minWidth: 0
            }}>
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
              <Typography variant="h6" sx={{
                fontWeight: 800
              }}>
                {heading}
              </Typography>
              <Typography sx={{
                color: "text.secondary"
              }}>{description}</Typography>
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
              <Typography variant="h5" sx={{
                fontWeight: 800
              }}>
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

      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
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
        sx={{
          justifyContent: "space-between",
          alignItems: { md: "flex-start" }
        }}>
        <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
              Заявка
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Typography variant="h6" sx={{
                fontWeight: 700
              }}>
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

          <Stack direction="row" spacing={1} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
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
            <Typography key={row.label} variant="body2" sx={{
              color: "text.secondary"
            }}>
              {row.label}: {row.value}
            </Typography>
          ))}
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {infoNote}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
