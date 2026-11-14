"use client";

import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import { Box, Link as MuiLink, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useChatUnreadCount } from "@/widgets/chat/socket/ChatSocketContext";
import { usePassportRequestsPending } from "@/widgets/customer-documents/model/PassportRequestsProvider";
import { useFreeRequestNotifications } from "@/widgets/pro-my-services/model/FreeRequestNotificationsProvider";

type Props = { role: "customer" | "provider" };

export function CabinetNotificationsBlock({ role }: Props) {
  const unreadCount = useChatUnreadCount();
  const passportPending = usePassportRequestsPending();
  const { hasNew: hasNewFreeRequests } = useFreeRequestNotifications();
  const chatsHref = `${role === "provider" ? "/pro/chats" : "/profile/chats"}?unread=1`;
  const notifications = [
    ...(role === "provider" && hasNewFreeRequests
      ? [{
          href: "/pro/requests/feed",
          label: "Новые свободные заявки",
          detail: "Откройте ленту свободных заявок",
          icon: <DynamicFeedOutlinedIcon />,
        }]
      : []),
    ...(unreadCount > 0
      ? [{
          href: chatsHref,
          label: "Непрочитанные сообщения в чатах",
          detail: `Непрочитанных сообщений: ${unreadCount}`,
          icon: <ChatOutlinedIcon />,
        }]
      : []),
    ...(role === "customer" && passportPending
      ? [{
          href: "/profile?section=documents#passport-access",
          label: "Запрошен доступ к документам паспорта",
          detail: "Откройте документы, чтобы посмотреть запрос",
          icon: <DescriptionOutlinedIcon />,
        }]
      : []),
  ];

  return (
    <Box
      component="section"
      aria-labelledby="cabinet-notifications-title"
      sx={{
        mb: 2.5,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 1.5,
        }}
      >
        <NotificationsNoneOutlinedIcon color="action" />
        <Typography
          id="cabinet-notifications-title"
          component="h2"
          variant="h6"
          sx={{ fontWeight: 700 }}
        >
          Оповещения
        </Typography>
      </Stack>
      {notifications.length ? (
        <Stack spacing={1}>
          {notifications.map((item) => (
            <MuiLink
              key={item.href}
              component={Link}
              href={item.href}
              underline="none"
              color="inherit"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: "action.hover",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  color: "primary.main",
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {item.detail}
                </Typography>
              </Box>
            </MuiLink>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Новых оповещений пока нет.
        </Typography>
      )}
    </Box>
  );
}
