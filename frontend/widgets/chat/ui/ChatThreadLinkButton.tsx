"use client";

import Link from "next/link";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { Badge, Button, Tooltip } from "@mui/material";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

type Props = {
  href: string;
  serviceRequestId: string;
  label?: string;
  disabled?: boolean;
  tooltip?: string;
  size?: "small" | "medium";
};

export function ChatThreadLinkButton({
  href,
  serviceRequestId,
  label = "Открыть",
  disabled,
  tooltip,
  size = "small",
}: Props) {
  const { unreadByRequestId } = useChatSocket();
  const count = unreadByRequestId[serviceRequestId] ?? 0;

  const button = (
    <Badge color="error" badgeContent={count} max={99} invisible={count === 0}>
      <span>
        <Button
          component={Link}
          href={href}
          variant="outlined"
          size={size}
          startIcon={<ChatOutlinedIcon fontSize="small" />}
          disabled={disabled}
        >
          {label}
        </Button>
      </span>
    </Badge>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip title={tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
}

