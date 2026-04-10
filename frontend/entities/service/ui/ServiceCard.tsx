"use client";

import {
  Box,
  Button,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/core/store/hooks";
import type { ServiceCardItem } from "../types";
import {
  SERVICE_REQUESTS_PROFILE_RESUME_URL,
  buildServiceRequestAuthHref,
  savePendingServiceRequestDraft,
} from "@/entities/service-request";

type Props = {
  item: ServiceCardItem;
};

function formatReviews(count: number): string {
  if (count === 1) return "1 отзыв";
  if (count >= 2 && count <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
}

export function ServiceCard({ item }: Props) {
  const router = useRouter();
  const { status } = useAppSelector((state) => state.auth);

  const providerName = item.provider?.name ?? null;
  const cityName = item.provider?.city?.name ?? null;
  const providerLine = [providerName, cityName].filter(Boolean).join(" • ");

  return (
    <Paper
      component={Link}
      href={`/services/${item.id}`}
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 0.6,
        overflow: "hidden",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        textDecoration: "none",
        color: "inherit",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          transform: "translateY(-2px)",
        },
      }}
    >
      {/* Image area + favorite */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1",
          bgcolor: "action.hover",
          overflow: "hidden",
        }}
      >
        {item.image ? (
          <Box
            component="img"
            src={item.image}
            alt=""
            sx={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.disabled",
              fontSize: 48,
            }}
          >
            —
          </Box>
        )}

        <IconButton
          size="small"
          aria-label="В избранное"
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "background.paper",
            color: "text.secondary",
            "&:hover": { bgcolor: "action.selected", color: "text.primary" },
          }}
        >
          <FavoriteBorderRoundedIcon fontSize="small" />
        </IconButton>

        {item.stockBadge ? (
          <Box
            sx={{
              position: "absolute",
              left: 12,
              top: 12,
              py: 0.75,
              px: 1.5,
              borderRadius: "999px",
              bgcolor: "error.main",
              color: "error.contrastText",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {item.stockBadge}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "1.125rem",
            color: "success.main",
            lineHeight: 1.2,
            mb: 0.75,
          }}
        >
          {item.price}
        </Typography>

        <Box sx={{ flex: 1, minHeight: 0, mb: 1 }}>
          <Typography
            sx={{
              fontSize: 14,
              color: "text.primary",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              mb: 0.5,
            }}
          >
            {item.title}
          </Typography>
          {providerLine ? (
            <Typography
              sx={{
                fontSize: 12,
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {providerLine}
            </Typography>
          ) : null}
        </Box>

        {(item.rating != null || (item.reviewCount != null && item.reviewCount > 0)) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.5,
              color: "text.secondary",
              fontSize: 14,
            }}
          >
            {item.rating != null && (
              <>
                <StarRoundedIcon sx={{ fontSize: 18, color: "warning.main" }} />
                <Typography component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
                  {item.rating.toFixed(1)}
                </Typography>
              </>
            )}
            {item.reviewCount != null && item.reviewCount > 0 && (
              <>
                <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 16, ml: 0.5 }} />
                <Typography component="span" sx={{ fontSize: 14 }}>
                  {formatReviews(item.reviewCount)}
                </Typography>
              </>
            )}
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          component="span"
          startIcon={<ShoppingBagOutlinedIcon />}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            savePendingServiceRequestDraft({
              kind: "SERVICE",
              serviceId: item.id,
              customerName: null,
              customerEmail: null,
              customerPhone: null,
              message: null,
              requestCityId: null,
            });

            if (status === "authenticated") {
              router.push(SERVICE_REQUESTS_PROFILE_RESUME_URL);
              return;
            }

            router.push(buildServiceRequestAuthHref("signup", { kind: "SERVICE", serviceId: item.id }));
          }}
          sx={{
            py: 1.25,
            borderRadius: 2,
            fontWeight: 700,
            textTransform: "none",
            bgcolor: "secondary.main",
            color: "secondary.contrastText",
            "&:hover": { bgcolor: "secondary.light" },
          }}
        >
          {item.ctaText}
        </Button>
      </Box>
    </Paper>
  );
}
