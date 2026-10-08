"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, Box, Tooltip, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";
import type { RequestProDto } from "@/entities/request";
import { toPublicAssetSrc } from "@/shared/lib/public-asset-src";
import {
  formatRequestOpenedStamp,
  getRequestOpenAge,
  requestCustomerInitials,
  serviceRequestRowBody,
} from "../lib/format-service-request";

type Props = {
  request: RequestProDto;
  title: string;
  showCustomerAvatar?: boolean;
};

function customerAvatarSrc(image: string | null): string | undefined {
  const trimmed = image?.trim() ?? "";
  return trimmed.length > 0 ? toPublicAssetSrc(trimmed) : undefined;
}

function requestCityName(request: RequestProDto): string {
  return request.requestCity?.name?.trim() ?? "";
}

function CustomerAvatar({ src, name }: { src: string | undefined; name: string }) {
  const [open, setOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Why: клик по фото не должен открывать заявку. Слушатель на самом аватаре останавливает событие раньше ссылки строки.
  useEffect(() => {
    const node = avatarRef.current;
    if (!node || !src) return;
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };
    node.addEventListener("click", onClick);
    return () => node.removeEventListener("click", onClick);
  }, [src]);

  const avatar = (
    <Avatar
      ref={avatarRef}
      src={src}
      alt={name}
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        bgcolor: "primary.main",
        color: "text.primary",
        fontSize: 14,
        fontWeight: 700,
        cursor: src ? "zoom-in" : undefined,
      }}
    >
      {requestCustomerInitials(name)}
    </Avatar>
  );

  if (!src) return avatar;

  return (
    <Tooltip
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      placement="right"
      title={
        <Box
          component="img"
          src={src}
          alt={name}
          sx={{ width: 250, height: 250, objectFit: "cover", display: "block", borderRadius: 1 }}
        />
      }
      slotProps={{
        tooltip: {
          sx: { bgcolor: "background.paper", p: 0.5, maxWidth: "none", boxShadow: 8 },
        },
      }}
    >
      {avatar}
    </Tooltip>
  );
}

export function ServiceRequestRow({ request, title, showCustomerAvatar = false }: Props) {
  const stamp = formatRequestOpenedStamp(request.createdAt);
  const age = getRequestOpenAge(request.createdAt);
  const city = requestCityName(request);
  const body = serviceRequestRowBody({
    title,
    customerName: request.customerName,
    message: request.message,
  });

  return (
    <Link
      href={`/pro/requests/${request.id}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 1.75,
        textDecoration: "none",
        color: "inherit",
        borderTop: "1px solid",
        borderColor: "divider",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {stamp ? (
        <Box sx={{ width: 52, flexShrink: 0, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1, color: "text.primary" }}>{stamp.day}</Typography>
          <Typography sx={{ mt: 0.25, fontSize: 11, lineHeight: 1.2, color: "text.secondary" }}>{stamp.month}</Typography>
          <Typography sx={{ fontSize: 12, lineHeight: 1.3, color: "text.secondary" }}>{stamp.time}</Typography>
        </Box>
      ) : null}

      <Box sx={{ width: "1px", alignSelf: "stretch", bgcolor: "divider" }} />

      {showCustomerAvatar ? (
        <CustomerAvatar src={customerAvatarSrc(request.customerImage)} name={request.customerName?.trim() || "Заказчик"} />
      ) : null}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            minWidth: 0,
            fontSize: 16,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
            {title}
          </Box>
          {city.length > 0 ? (
            <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>{` · ${city}`}</Box>
          ) : null}
        </Typography>
        {body.length > 0 ? (
          <Typography
            sx={{
              mt: 0.25,
              color: "text.primary",
              fontSize: 15,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {body}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ width: 48, flexShrink: 0, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1, color: "text.primary" }}>{age.count}</Typography>
        <Typography sx={{ fontSize: 12, lineHeight: 1.4, color: "text.secondary" }}>{age.label}</Typography>
      </Box>
    </Link>
  );
}
