"use client";

import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Box, Chip, Paper, Stack, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { OrderDto, OrderStatus } from "../dto/order.dto";
import {
  buildOrderStatusFlowSteps,
  formatOrderDate,
  getOrderCardAccentColor,
  getOrderFlowActiveStepId,
  getOrderStatusColor,
  getOrderStatusLabel,
  isOpenOrderStatus,
  type OrderStatusFilter,
  type StatusProgressStep,
} from "./order-status-flow";

type StatusProgressStepperProps = {
  steps: StatusProgressStep[];
  activeStepId: string;
};

export function StatusProgressStepper({ steps, activeStepId }: StatusProgressStepperProps) {
  const activeIndex = Math.max(
    steps.findIndex((step) => step.id === activeStepId),
    0
  );

  return (
    <Stepper
      alternativeLabel
      activeStep={activeIndex}
      sx={{
        "& .MuiStepConnector-line": {
          borderTopWidth: 3,
          borderColor: "divider",
        },
        "& .MuiStepLabel-label": {
          mt: 1,
          fontSize: 12,
          color: "text.secondary",
        },
        "& .MuiStepLabel-label.Mui-active": {
          color: "text.primary",
          fontWeight: 700,
        },
        "& .MuiStepLabel-label.Mui-completed": {
          color: "text.primary",
        },
      }}
    >
      {steps.map((step) => (
        <Step key={step.id} completed={step.completed}>
          <StepLabel>{step.label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

type OrderOverviewPanelProps = {
  heading: string;
  description: string;
  summaryChipLabel: string;
  stats: Record<OrderStatusFilter, number>;
  selectedFilter: OrderStatusFilter;
};

export function OrderOverviewPanel({
  heading,
  description,
  summaryChipLabel,
  stats,
  selectedFilter,
}: OrderOverviewPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 2.5,
        borderColor: "info.main",
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
                bgcolor: "info.main",
                color: "info.contrastText",
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
          <Chip label={summaryChipLabel} color="info" variant="filled" />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          {([
            ["ALL", "Всего"],
            ["ACTIVE", "Активные"],
            ["COMPLETED", "Завершенные"],
            ["CANCELLED", "Отмененные"],
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
                {stats[status]}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

type OrderSearchAndFiltersProps = {
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  filter: OrderStatusFilter;
  onFilterChange: (filter: OrderStatusFilter) => void;
};

export function OrderSearchAndFilters({
  searchLabel,
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: OrderSearchAndFiltersProps) {
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
            "SERVICE_RENDERED",
            "PAYMENT_PENDING",
            "PAYMENT_PROCESSING",
            "PAID",
            "COMPLETED",
            "CANCELLED",
          ] as const
        ).map((status) => (
          <Chip
            key={status}
            label={status === "ALL" ? "Все" : getOrderStatusLabel(status)}
            color={filter === status ? "primary" : "default"}
            variant={filter === status ? "filled" : "outlined"}
            onClick={() => onFilterChange(status)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

type OrderCardInfoRow = {
  label: string;
  value: string;
};

type OrderCardProps = {
  order: OrderDto;
  partyChip: ReactNode;
  infoRows: OrderCardInfoRow[];
  infoNote: string;
  leftMeta?: ReactNode;
  infoPanelSx?: SxProps<Theme>;
};

export function OrderCard({
  order,
  partyChip,
  infoRows,
  infoNote,
  leftMeta,
  infoPanelSx,
}: OrderCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderLeft: 4,
        borderLeftColor: getOrderCardAccentColor(order.status),
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
              Заказ
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={700}>
                {order.serviceTitle}
              </Typography>
              <Chip
                size="small"
                label={getOrderStatusLabel(order.status)}
                color={getOrderStatusColor(order.status)}
                variant={order.status === "CANCELLED" ? "outlined" : "filled"}
              />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {partyChip}
          </Stack>

          {leftMeta}

          <Box sx={{ pt: 1 }}>
            <StatusProgressStepper
              steps={buildOrderStatusFlowSteps(order.status)}
              activeStepId={getOrderFlowActiveStepId(order.status)}
            />
          </Box>
        </Stack>

        <Box
          sx={[
            {
              px: 1.5,
              py: 1.25,
              // borderRadius: 2,
              bgcolor: "action.hover",
              width: { xs: "100%", md: 360 },
              flexShrink: 0,
            },
            ...(Array.isArray(infoPanelSx) ? infoPanelSx : infoPanelSx ? [infoPanelSx] : []),
          ]}
        >
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
            Сведения по заказу
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
