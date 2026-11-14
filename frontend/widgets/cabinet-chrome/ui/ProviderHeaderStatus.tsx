"use client";

import { getActiveMembership } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import Link from "next/link";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { Badge, IconButton } from "@mui/material";
import { useReminderCount } from "../model/ReminderCountProvider";
import { CabinetHeaderStatus } from "./CabinetHeaderStatus";

export function ProviderHeaderStatus() {
  return <CabinetHeaderStatus notification={<ProviderNotificationsButton />} />;
}

export function ProviderNotificationsButton({
  onNavigate,
  label = "Открыть напоминания",
  buttonSize = 40,
}: {
  onNavigate?: () => void;
  label?: string;
  buttonSize?: number;
} = {}) {
  const count = useReminderCount();
  const isEmployee = useAppSelector((state) => getActiveMembership(state.auth.user)?.role === "EMPLOYEE");
  if (isEmployee) return null;
  return (
    <IconButton
      component={Link}
      href="/pro/reminders"
      aria-label={count > 0 ? `${label}: ${count} в ближайший час` : label}
      title={count > 0 ? `В ближайший час: ${count}` : label}
      onClick={onNavigate}
      size="small"
      sx={{
        color: "inherit",
        width: buttonSize,
        height: buttonSize,
        flexShrink: 0,
      }}
    >
      <Badge
        badgeContent={count}
        max={99}
        sx={{
          "& .MuiBadge-badge": {
            bgcolor: "#ed6c02",
            color: "#1f160d",
            fontSize: "0.6875rem",
            fontWeight: 800,
            height: 18,
            minWidth: 18,
            px: 0.5,
            borderRadius: "9px",
          },
        }}
      >
        <NotificationsNoneOutlinedIcon
          sx={{
            fontSize: 23,
          }}
        />
      </Badge>
    </IconButton>
  );
}
