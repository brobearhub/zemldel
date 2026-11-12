"use client";

import Link from "next/link";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { Badge, IconButton } from "@mui/material";
import { attentionDotSx, attentionGradientSx } from "@/shared/ui/attention-gradient";
import { usePassportRequestsPending } from "@/widgets/customer-documents/model/PassportRequestsProvider";

export function CustomerNotificationsButton({ onNavigate }: { onNavigate?: () => void }) {
  const pending = usePassportRequestsPending();
  return (
    <IconButton
      component={Link}
      href="/profile?section=documents#passport-access"
      aria-label={pending ? "Запрошены документы паспорта" : "Документы и доступ к паспорту"}
      title={pending ? "Исполнитель запросил доступ к паспорту" : "Документы"}
      onClick={onNavigate}
      size="small"
      sx={{
        color: "inherit",
        flexShrink: 0,
      }}
    >
      <Badge
        variant="dot"
        invisible={!pending}
        color="error"
        sx={{
          "& .MuiBadge-badge": {
            ...attentionDotSx,
            ...(pending ? attentionGradientSx : {}),
            minWidth: 10,
            width: 10,
            height: 10,
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
