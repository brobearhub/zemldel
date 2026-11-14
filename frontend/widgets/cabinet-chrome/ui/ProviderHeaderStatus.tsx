"use client";

import { getActiveMembership } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import Link from "next/link";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { IconButton } from "@mui/material";
import { useReminderCount } from "../model/ReminderCountProvider";
import { CabinetHeaderStatus } from "./CabinetHeaderStatus";
import { useChatUnreadCount } from "@/widgets/chat/socket/ChatSocketContext";
import { useFreeRequestNotifications } from "@/widgets/pro-my-services/model/FreeRequestNotificationsProvider";
import { UnreadCountBadge } from "@/shared/ui/UnreadCountBadge";

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
  const unreadCount = useChatUnreadCount();
  const { hasNew } = useFreeRequestNotifications();
  const notificationCount = count + unreadCount + (hasNew ? 1 : 0);
  const isEmployee = useAppSelector((state) => getActiveMembership(state.auth.user)?.role === "EMPLOYEE");
  if (isEmployee) return null;
  return (
    <IconButton
      component={Link}
      href="/pro/reminders"
      aria-label={notificationCount > 0 ? `${label}: ${notificationCount}` : label}
      title={notificationCount > 0 ? `Оповещения и напоминания: ${notificationCount}` : label}
      onClick={onNavigate}
      size="small"
      sx={{
        color: "inherit",
        width: buttonSize,
        height: buttonSize,
        flexShrink: 0,
      }}
    >
      <UnreadCountBadge
        count={notificationCount}
        horizontalOffset={3}
      >
        <NotificationsNoneOutlinedIcon
          sx={{
            fontSize: 23,
          }}
        />
      </UnreadCountBadge>
    </IconButton>
  );
}
