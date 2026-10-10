"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/core/store/hooks";
import CheckIcon from "@mui/icons-material/Check";
import { Box, Button, CircularProgress, Tooltip, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";
import {
  getRequestStatusLabel,
  orderReplyPreview,
  ReplyPreviewLines,
  visibleReplyPreview,
  type RequestProDto,
} from "@/entities/request";
import { CdnAvatar, CdnImage } from "@/shared/ui/cdn-image";
import {
  formatRequestOpenedStamp,
  getRequestOpenAge,
  replySentMarkDelay,
  requestCustomerInitials,
  serviceRequestRowBody,
} from "../lib/format-service-request";

type Props = {
  request: RequestProDto;
  title: string;
  showCustomerAvatar?: boolean;
  sending?: boolean;
  onReply: (request: RequestProDto) => void;
};

function customerAvatarSrc(image: string | null): string | undefined {
  const trimmed = image?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function requestCityName(request: RequestProDto): string {
  return request.requestCity?.name?.trim() ?? "";
}

function useReplySentMark(sentAt: string | null): boolean {
  const [visible, setVisible] = useState(() => replySentMarkDelay(sentAt) != null);

  useEffect(() => {
    const delay = replySentMarkDelay(sentAt);
    if (delay == null) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), delay);
    return () => window.clearTimeout(timer);
  }, [sentAt]);

  return visible;
}

function ReplyAction({ awaiting, onReply }: { awaiting: boolean; onReply: () => void }) {
  if (awaiting) {
    return (
      <Typography variant="caption" sx={{ flexShrink: 0, m: 0, px: 1, color: "text.secondary", whiteSpace: "nowrap" }}>
        Ждем ответ
      </Typography>
    );
  }

  return (
    <Button size="small" variant="contained" onClick={onReply} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
      Ответить
    </Button>
  );
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
    <CdnAvatar
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
    </CdnAvatar>
  );

  if (!src) return avatar;

  return (
    <Tooltip
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      placement="right"
      title={
        <CdnImage
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

export function ServiceRequestRow({ request, title, showCustomerAvatar = false, sending = false, onReply }: Props) {
  const viewer = useAppSelector((state) => state.auth.user);
  const stamp = formatRequestOpenedStamp(request.createdAt);
  const sentAt = request.awaitingCustomerReply ? request.lastMessageAt : null;
  const showSentMark = useReplySentMark(sentAt);
  const age = getRequestOpenAge(request.lastMessageAt ?? request.createdAt);
  const city = requestCityName(request);
  const body = serviceRequestRowBody({
    title,
    customerName: request.customerName,
    message: request.message,
  });
  const lines = visibleReplyPreview({
    lines: orderReplyPreview({
      customerMessage: request.customerLastMessage,
      providerMessage: request.providerLastMessage,
      providerSpokeLast: request.awaitingCustomerReply,
    }),
    waitingForReply: request.awaitingCustomerReply,
    ownAuthor: "provider",
  });
  const customerReply = lines.some((line) => line.author === "customer");
  const hasPreview = lines.length > 0;
  const lineColumn = stamp ? 2 : 1;
  const avatarColumn = showCustomerAvatar ? lineColumn + 1 : null;
  const textColumn = (avatarColumn ?? lineColumn) + 1;
  const statusColumn = textColumn + 1;
  const actionColumn = customerReply ? statusColumn + 1 : null;
  const ageColumn = statusColumn + (customerReply ? 2 : 1);
  const gridTemplateColumns = [
    stamp ? "52px" : null,
    "1px",
    showCustomerAvatar ? "auto" : null,
    "minmax(0, 1fr)",
    "auto",
    customerReply ? "auto" : null,
    "48px",
  ]
    .filter((column) => column != null)
    .join(" ");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns,
        gridTemplateRows: hasPreview ? "auto auto" : "auto",
        columnGap: 2,
        alignItems: "center",
        px: 2,
        pt: 1,
        pb: 1,
        borderTop: "1px solid",
        borderColor: "divider",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Link
        href={`/pro/requests/${request.id}`}
        sx={{
          gridColumn: "1 / -1",
          gridRow: "1 / -1",
          display: "grid",
          gridTemplateColumns: "subgrid",
          gridTemplateRows: "subgrid",
          columnGap: 2,
          alignItems: "center",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {stamp ? (
          <Box sx={{ gridColumn: 1, gridRow: "1 / -1", textAlign: "center" }}>
            <Typography sx={{ fontSize: 11, lineHeight: 1.2, color: "text.secondary" }}>{stamp.month}</Typography>
            <Typography sx={{ my: 0.25, fontWeight: 800, fontSize: 22, lineHeight: 1, color: "text.secondaryLight" }}>{stamp.day}</Typography>
            
            <Typography sx={{ fontSize: 12, lineHeight: 1.3, color: "text.secondary" }}>{stamp.time}</Typography>
          </Box>
        ) : null}

        <Box
          sx={{
            gridColumn: lineColumn,
            gridRow: "1 / -1",
            width: "1px",
            justifySelf: "center",
            alignSelf: "stretch",
            bgcolor: "divider",
          }}
        />

        {showCustomerAvatar ? (
          <Box sx={{ gridColumn: avatarColumn ?? undefined, gridRow: "1 / -1", justifySelf: "center" }}>
            <CustomerAvatar src={customerAvatarSrc(request.customerImage)} name={request.customerName?.trim() || "Заказчик"} />
          </Box>
        ) : null}

        <Box sx={{ gridColumn: textColumn, gridRow: 1, minWidth: 0 }}>
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
          {body.length > 0 && !customerReply ? (
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

        <Typography
          sx={{
            gridColumn: statusColumn,
            gridRow: "1 / -1",
            alignSelf: "center",
            justifySelf: "end",
            m: 0,
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1.3,
            color: "warning.light",
            whiteSpace: "nowrap",
            pr: 2.5,
            textTransform: "uppercase",
          }}
        >
          {getRequestStatusLabel(request.status)}
        </Typography>

        <Box
          sx={{
            gridColumn: ageColumn,
            gridRow: "1 / -1",
            alignSelf: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {sending ? (
            <CircularProgress size={22} aria-label="Отправка" />
          ) : showSentMark ? (
            <CheckIcon
              titleAccess="Ответ отправлен"
              aria-label="Ответ отправлен"
              sx={{ fontSize: 22, color: "primary.main" }}
            />
          ) : (
            <>
              <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1, color: "text.secondaryLight" }}>{age.count}</Typography>
              <Typography sx={{ fontSize: 12, lineHeight: 1.4, color: "text.secondaryLight" }}>{age.label}</Typography>
            </>
          )}
        </Box>
      </Link>
      {/* Why: пара реплик под именем. Кнопка вне ссылки, чтобы клик не открывал заявку. */}
      {hasPreview ? (
        <Box sx={{ gridColumn: textColumn, gridRow: 2, mt: 1, minWidth: 0, position: "relative", zIndex: 1, pointerEvents: "none" }}>
          <ReplyPreviewLines
            lines={lines}
            ownAuthor="provider"
            ownAvatar={{ src: viewer?.image ?? null, name: viewer?.name ?? null }}
          />
        </Box>
      ) : null}
      {customerReply ? (
        <Box
          sx={{
            gridColumn: actionColumn ?? undefined,
            gridRow: "1 / -1",
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <ReplyAction awaiting={request.awaitingCustomerReply} onReply={() => onReply(request)} />
        </Box>
      ) : null}
    </Box>
  );
}
