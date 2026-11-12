"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/core/store/hooks";
import CheckIcon from "@mui/icons-material/Check";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import Link from "@/shared/ui/Link";
import {
  formatRequestNumber,
  getRequestDisplayStatusLabel,
  orderReplyPreview,
  ReplyPreviewLines,
  resolveRequestPriceView,
  visibleReplyPreview,
  type RequestCustomerDto,
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

type Props<T extends RequestProDto | RequestCustomerDto> = {
  request: T;
  title: string;
  customerView?: boolean;
  showCustomerAvatar?: boolean;
  sending?: boolean;
  deleting?: boolean;
  onDelete?: (request: T) => void;
  onReply: (request: T) => void;
};

function customerAvatarSrc(image: string | null): string | undefined {
  const trimmed = image?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function requestCityName(request: RequestProDto | RequestCustomerDto): string {
  return request.requestCity?.name?.trim() ?? "";
}

function useReplySentMark(sentAt: string | null): boolean {
  const [visible, setVisible] = useState(
    () => replySentMarkDelay(sentAt) != null,
  );

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

function ReplyAction({
  awaiting,
  onReply,
}: {
  awaiting: boolean;
  onReply: () => void;
}) {
  if (awaiting) {
    return (
      <Typography
        variant="caption"
        sx={{
          flexShrink: 0,
          m: 0,
          px: 1,
          color: "text.secondary",
          whiteSpace: "nowrap",
        }}
      >
        Ждем ответ
      </Typography>
    );
  }

  return (
    <Button
      size="small"
      variant="contained"
      onClick={onReply}
      sx={{
        flexShrink: 0,
        minHeight: 32,
        px: 1.25,
        py: 0.5,
        fontSize: 14,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      Ответить
    </Button>
  );
}

function CustomerAvatar({
  src,
  name,
}: {
  src: string | undefined;
  name: string;
}) {
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
          sx={{
            width: 250,
            height: 250,
            objectFit: "cover",
            display: "block",
            borderRadius: 1,
          }}
        />
      }
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: "background.paper",
            p: 0.5,
            maxWidth: "none",
            boxShadow: 8,
          },
        },
      }}
    >
      {avatar}
    </Tooltip>
  );
}

export function ServiceRequestRow<T extends RequestProDto | RequestCustomerDto>({
  request,
  title,
  customerView = false,
  showCustomerAvatar = false,
  sending = false,
  deleting = false,
  onDelete,
  onReply,
}: Props<T>) {
  const viewer = useAppSelector((state) => state.auth.user);
  const stamp = formatRequestOpenedStamp(request.createdAt);
  const awaitingReply = customerView
    ? "awaitingProviderReply" in request && request.awaitingProviderReply
    : "awaitingCustomerReply" in request && request.awaitingCustomerReply;
  const lastMessageAt = "lastMessageAt" in request ? request.lastMessageAt : null;
  const sentAt = awaitingReply ? lastMessageAt : null;
  const showSentMark = useReplySentMark(sentAt);
  const age = getRequestOpenAge(lastMessageAt ?? request.createdAt);
  const city = requestCityName(request);
  const body = serviceRequestRowBody({
    title,
    customerName:
      customerView && "providerName" in request
        ? request.providerName
        : request.customerName,
    message: request.message,
  });
  const priceView = customerView
    ? resolveRequestPriceView({
        totalAmountRubles: request.totalAmountRubles,
        servicePriceRubles: request.servicePriceRubles,
        priceProposal: request.priceProposal,
      })
    : null;
  const lines = visibleReplyPreview({
    lines: orderReplyPreview({
      customerMessage:
        customerView && request.status !== "DISCUSSING"
          ? null
          : request.customerLastMessage,
      providerMessage:
        customerView && request.status !== "DISCUSSING"
          ? null
          : request.providerLastMessage,
      providerSpokeLast: customerView ? !awaitingReply : awaitingReply,
    }),
    waitingForReply: awaitingReply,
    ownAuthor: customerView ? "customer" : "provider",
  });
  const needsAction = lines.some(
    (line) => line.author === (customerView ? "provider" : "customer"),
  );
  const hasPreview = lines.length > 0;
  const lineColumn = stamp ? 2 : 1;
  const showAvatar = customerView || showCustomerAvatar;
  const avatarColumn = showAvatar ? lineColumn + 1 : null;
  const textColumn = (avatarColumn ?? lineColumn) + 1;
  const statusColumn = textColumn + 1;
  const actionColumn = needsAction ? statusColumn + 1 : null;
  const ageColumn = statusColumn + (needsAction ? 2 : 1);
  const gridTemplateColumns = [
    stamp ? "52px" : null,
    "1px",
    showAvatar ? "auto" : null,
    "minmax(0, 1fr)",
    "auto",
    needsAction ? "auto" : null,
    "48px",
  ]
    .filter((column) => column != null)
    .join(" ");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr) auto",
          md: gridTemplateColumns,
        },
        gridTemplateRows: {
          xs: "auto auto auto auto",
          md: hasPreview ? "auto auto" : "auto",
        },
        columnGap: { xs: 1, md: 2 },
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
        href={customerView ? `/profile/requests/${request.id}` : `/pro/requests/${request.id}`}
        aria-disabled={customerView && request.status === "CLOSED" ? true : undefined}
        onClick={
          customerView && request.status === "CLOSED"
            ? (event) => event.preventDefault()
            : undefined
        }
        sx={{
          gridColumn: "1 / -1",
          gridRow: "1 / -1",
          display: "grid",
          gridTemplateColumns: "subgrid",
          gridTemplateRows: "subgrid",
          columnGap: { xs: 1, md: 2 },
          alignItems: "center",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {stamp ? (
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              gridColumn: 1,
              gridRow: "1 / -1",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                lineHeight: 1.2,
                color: "text.secondary",
              }}
            >
              {stamp.month}
            </Typography>
            <Typography
              sx={{
                my: 0.25,
                fontWeight: 800,
                fontSize: 22,
                lineHeight: 1,
                color: "text.secondaryLight",
              }}
            >
              {stamp.day}
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                lineHeight: 1.3,
                color: "text.secondary",
              }}
            >
              {stamp.time}
            </Typography>
          </Box>
        ) : null}

        <Box
          sx={{
            display: { xs: "none", md: "block" },
            gridColumn: lineColumn,
            gridRow: "1 / -1",
            width: "1px",
            justifySelf: "center",
            alignSelf: "stretch",
            bgcolor: "divider",
          }}
        />

        {showAvatar ? (
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              gridColumn: avatarColumn ?? undefined,
              gridRow: "1 / -1",
              justifySelf: "center",
            }}
          >
            <CustomerAvatar
              src={customerAvatarSrc(
                customerView && "providerImage" in request
                  ? request.providerImage
                  : "customerImage" in request
                    ? request.customerImage
                    : null,
              )}
              name={
                customerView && "providerName" in request
                  ? request.providerName?.trim() || "Исполнитель"
                  : request.customerName?.trim() || "Заказчик"
              }
            />
          </Box>
        ) : null}

        <Box
          sx={{
            gridColumn: { xs: "1 / -1", md: textColumn },
            gridRow: 1,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              minWidth: 0,
              fontSize: 16,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: { xs: "normal", md: "nowrap" },
              overflowWrap: "anywhere",
            }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {request.number != null ? `${formatRequestNumber(request)} · ` : ""}
              {title}
            </Box>
            {city.length > 0 ? (
              <Box
                component="span"
                sx={{ fontWeight: 400, color: "text.secondary" }}
              >{` · ${city}`}</Box>
            ) : null}
          </Typography>
          {body.length > 0 && !needsAction ? (
            <Typography
              sx={{
                mt: 0.25,
                color: "text.primary",
                fontSize: 15,
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: { xs: "normal", md: "nowrap" },
                overflowWrap: "anywhere",
              }}
            >
              {body}
            </Typography>
          ) : null}
          {priceView ? (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 0.25,
              }}
            >
              {priceView.headline}
            </Typography>
          ) : null}
          {priceView?.servicePriceLabel ? (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
              }}
            >
              {priceView.servicePriceLabel}
            </Typography>
          ) : null}
        </Box>

        <Typography
          sx={{
            gridColumn: { xs: 1, md: statusColumn },
            gridRow: { xs: 2, md: "1 / -1" },
            alignSelf: "center",
            justifySelf: { xs: "start", md: "end" },
            m: 0,
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1.3,
            color: "text.secondary",
            whiteSpace: { xs: "normal", md: "nowrap" },
            overflowWrap: "anywhere",
            pr: 2.5,
            textTransform: "uppercase",
          }}
        >
          {getRequestDisplayStatusLabel(request)}
        </Typography>

        <Box
          sx={{
            gridColumn: { xs: 2, md: ageColumn },
            gridRow: { xs: 2, md: "1 / -1" },
            alignSelf: "center",
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            gap: 0.5,
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
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: 12, md: 22 },
                  lineHeight: 1,
                  color: "text.secondary",
                }}
              >
                {age.count}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "text.secondary",
                }}
              >
                {age.label}
              </Typography>
            </>
          )}
        </Box>
      </Link>
      {/* Why: пара реплик под именем. Кнопка вне ссылки, чтобы клик не открывал заявку. */}
      {hasPreview ? (
        <Box
          sx={{
            gridColumn: { xs: "1 / -1", md: textColumn },
            gridRow: { xs: 3, md: 2 },
            mt: 1,
            minWidth: 0,
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <ReplyPreviewLines
            lines={lines}
            ownAuthor={customerView ? "customer" : "provider"}
            ownAvatar={{
              src: viewer?.image ?? null,
              name: viewer?.name ?? null,
            }}
          />
        </Box>
      ) : null}
      {needsAction ? (
        <Box
          sx={{
            gridColumn: { xs: "1 / -1", md: actionColumn ?? undefined },
            gridRow: { xs: 4, md: "1 / -1" },
            justifySelf: { xs: "end", md: "auto" },
            mt: { xs: 1, md: 0 },
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <ReplyAction
            awaiting={awaitingReply}
            onReply={() => onReply(request)}
          />
        </Box>
      ) : null}
      {customerView && "canDeleteByCustomer" in request && request.canDeleteByCustomer && onDelete ? (
        <IconButton
          size="small"
          color="error"
          aria-label="Удалить заявку"
          loading={deleting}
          onClick={() => onDelete(request)}
          sx={{
            gridColumn: { xs: 2, md: ageColumn },
            gridRow: { xs: 4, md: 2 },
            justifySelf: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {customerView && request.serviceId ? (
        <Link
          href={`/services/${request.serviceId}`}
          sx={{
            gridColumn: "1 / -1",
            gridRow: { xs: 5, md: hasPreview ? 3 : 2 },
            justifySelf: "end",
            position: "relative",
            zIndex: 1,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Услуга
        </Link>
      ) : null}
    </Box>
  );
}
