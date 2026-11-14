"use client";

import Link from "next/link";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { Badge, IconButton } from "@mui/material";
import { attentionDotSx, attentionGradientSx } from "@/shared/ui/attention-gradient";
import { UnreadCountBadge } from "@/shared/ui/UnreadCountBadge";
import { usePassportRequestsPending } from "@/widgets/customer-documents/model/PassportRequestsProvider";
import { useChatUnreadCount } from "@/widgets/chat/socket/ChatSocketContext";

export function CustomerNotificationsButton({ onNavigate }: { onNavigate?: () => void }) {
  const pending = usePassportRequestsPending();
  const unreadCount = useChatUnreadCount();
  const hasNotifications = pending || unreadCount > 0;
  const label = unreadCount
    ? `Открыть оповещения: ${unreadCount} непрочитанных сообщений`
    : pending
      ? "Открыть оповещения: запрошен доступ к документам паспорта"
      : "Открыть оповещения";
  return (
    <IconButton
      component={Link}
      href="/profile/notifications"
      aria-label={label}
      title={hasNotifications ? "Оповещения и напоминания" : "Оповещения"}
      onClick={onNavigate}
      size="small"
      sx={{
        color: "inherit",
        flexShrink: 0,
      }}
    >
      {unreadCount > 0 ? (
        <UnreadCountBadge count={unreadCount} horizontalOffset={3}>
          <NotificationsNoneOutlinedIcon sx={{ fontSize: 23 }} />
        </UnreadCountBadge>
      ) : pending ? (
        <Badge
          variant="dot"
          sx={{
            "& .MuiBadge-badge": {
              ...attentionDotSx,
              ...attentionGradientSx,
              minWidth: 10,
              width: 10,
              height: 10,
            },
          }}
        >
          <NotificationsNoneOutlinedIcon sx={{ fontSize: 23 }} />
        </Badge>
      ) : (
        <NotificationsNoneOutlinedIcon sx={{ fontSize: 23 }} />
      )}
    </IconButton>
  );
}
