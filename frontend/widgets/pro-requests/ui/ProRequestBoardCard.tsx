"use client";

import Link from "next/link";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { resolveRequestPriceView, type RequestProDto } from "@/entities/request";
import { getServiceRequestTitle } from "@/widgets/pro-requests/lib/serviceRequestView";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ProRequestBoardCard({ item }: { item: RequestProDto }) {
  const href = `/pro/requests/${item.id}`;
  const title = getServiceRequestTitle(item);
  const customerName = item.customerName?.trim() || "Заказчик";
  const initials = customerName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const price = resolveRequestPriceView(item);
  const isAgreed = price.agreedAmount != null;
  const canReply = item.status === "NEW" && !item.isLocked && !item.awaitingCustomerReply && !isAgreed;
  const subjectLabel = item.subjectType === "SERVICE"
    ? "Услуга"
    : item.subjectType === "CATEGORY"
      ? "Категория"
      : "Свободная";

  return (
    <Paper
      component="article"
      aria-label={title}
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.text.primary, 0.1),
        borderRadius: 1.5,
        minWidth: 0,
        transition: "border-color 150ms ease",
        "&:hover, &:focus-within": {
          borderColor: "primary.main",
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Chip
            component={item.serviceId && !item.isLocked ? Link : "div"}
            href={item.serviceId && !item.isLocked ? `/services/${item.serviceId}` : undefined}
            clickable={Boolean(item.serviceId && !item.isLocked)}
            label={subjectLabel}
            size="small"
            sx={{
              height: "auto",
              borderRadius: 0.75,
              py: 0.25,
              color: "text.secondary",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
              "& .MuiChip-label": {
                px: 1,
                fontSize: 13,
                lineHeight: 1.5,
              },
            }}
          />
          <Typography
            component="time"
            dateTime={item.createdAt}
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: 13,
              textAlign: "right",
            }}
          >
            {dateFormatter.format(new Date(item.createdAt))}
          </Typography>
        </Stack>

        <Typography
          component={Link}
          href={href}
          sx={{
            fontWeight: 700,
            fontSize: 16,
            lineHeight: 1.45,
            color: "text.primary",
            textDecoration: "none",
            overflowWrap: "anywhere",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          {title}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <Avatar
            src={item.customerImage ?? undefined}
            alt={customerName}
            sx={{
              width: 28,
              height: 28,
              fontSize: 12,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.24),
              color: "text.primary",
            }}
          >
            {initials}
          </Avatar>
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              overflowWrap: "anywhere",
            }}
          >
            {customerName}
          </Typography>
          {item.customerRating != null ? (
            <Stack
              direction="row"
              spacing={0.25}
              aria-label={`Рейтинг заказчика: ${item.customerRating.toFixed(1)}`}
              sx={{
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <StarRoundedIcon
                sx={{
                  fontSize: 18,
                  color: "warning.main",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: 13,
                  color: "text.secondary",
                }}
              >
                {item.customerRating.toFixed(1)}
              </Typography>
            </Stack>
          ) : null}
        </Stack>

        {item.message ? (
          <Typography
            variant="body2"
            sx={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "text.secondary",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {item.message}
          </Typography>
        ) : null}

        {item.isLocked ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontSize: 13 }}>
              Клиент уже работает с другой компанией
            </Typography>
          </Stack>
        ) : null}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            pt: 1.5,
            borderTop: "1px solid",
            borderColor: (theme) => alpha(theme.palette.text.primary, 0.08),
          }}
        >
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              minWidth: 0,
              alignItems: "center",
            }}
          >
            {isAgreed ? (
              <CheckCircleRoundedIcon
                sx={{
                  fontSize: 16,
                  color: "success.main",
                }}
              />
            ) : null}
            <Typography
              variant="body2"
              sx={{
                fontSize: 14,
                fontWeight: isAgreed ? 700 : 400,
                color: isAgreed ? "text.primary" : "warning.main",
              }}
            >
              {price.headline}
            </Typography>
          </Stack>
          <Button
            component={Link}
            href={href}
            variant="contained"
            size="small"
            disableElevation
            sx={{
              flexShrink: 0,
              fontSize: 13,
              minHeight: 34,
              px: 1.5,
              bgcolor: (theme) => theme.palette.mode === "light"
                ? theme.palette.text.primary
                : theme.palette.primary.main,
              color: "background.paper",
              "&:hover": {
                bgcolor: (theme) => theme.palette.mode === "light"
                  ? alpha(theme.palette.text.primary, 0.9)
                  : theme.palette.primary.light,
              },
            }}
          >
            {canReply ? "Ответить" : "Открыть заявку"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
