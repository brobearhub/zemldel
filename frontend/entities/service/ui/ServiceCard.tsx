"use client";

import {
  Box,
  Button,
  IconButton,
  Paper,
  Divider,
  Typography,
} from "@mui/material";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/core/store/hooks";
import type { ServiceCardItem } from "../types";
import {
  REQUESTS_PROFILE_RESUME_URL as SERVICE_REQUESTS_PROFILE_RESUME_URL,
  buildRequestAuthHref as buildServiceRequestAuthHref,
  savePendingRequestDraft as savePendingServiceRequestDraft,
} from "@/entities/request";

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
          aspectRatio: { xs: "16/10", md: "16/10" },
          bgcolor: (theme) => theme.custom?.gradients?.glass ?? theme.palette.action.hover,
          overflow: "hidden",
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.18) 100%)",
            pointerEvents: "none",
          },
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
              transform: "scale(1.01)",
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
              fontSize: 46,
              letterSpacing: "-0.02em",
              fontWeight: 800,
            }}
          >
            Фото
          </Box>
        )}

        <IconButton
          size="small"
          aria-label="В избранное"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            p: 0.5,
            bgcolor: "transparent",
            borderRadius: 0,
            color: "common.white",
            "&:hover": {
              bgcolor: "transparent",
              "& .favorite-heart-fill": { opacity: 0.55 },
            },
          }}
        >
          <Box sx={{ position: "relative", width: 22, height: 22 }}>
            <FavoriteRoundedIcon
              className="favorite-heart-fill"
              sx={{
                position: "absolute",
                inset: 0,
                fontSize: 22,
                color: "common.white",
                opacity: 0.1,
              }}
            />
            <FavoriteBorderRoundedIcon
              sx={{
                position: "absolute",
                inset: 0,
                fontSize: 22,
                color: "common.white",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
              }}
            />
          </Box>
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
        <Divider />
        <Button
          variant="text"
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
        cadastralNumbers: [],
      });

            if (status === "authenticated") {
              router.push(SERVICE_REQUESTS_PROFILE_RESUME_URL);
              return;
            }

            router.push(buildServiceRequestAuthHref("signup", { kind: "SERVICE", serviceId: item.id }));
          }}
          sx={{
            mt: 1.5,
            // py: 1.25,
            // borderRadius: 2,
            // fontWeight: 700,
            // textTransform: "none",
            // bgcolor: "primary.main",
            // color: "common.white",
            // "&:hover": { bgcolor: "primary.light" },
          }}
        >
          {item.ctaText}
        </Button>
      </Box>
    </Paper>
  );
}
