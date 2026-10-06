"use client";

import { Box, Paper, Typography } from "@mui/material";
import { brown, grey } from "@mui/material/colors";
import { alpha } from "@mui/material/styles";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Link from "next/link";
import type { ServiceCardItem } from "../types";
import { formatRubPriceLabel } from "@/shared/lib/money/format-rub-price-label";

export type ServiceCardVariant = "myCity" | "otherCities";

type Props = {
  item: ServiceCardItem;
  variant?: ServiceCardVariant;
};

function ServiceCardImage({ item, imageHeight }: { item: ServiceCardItem; imageHeight: number }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: imageHeight,
        flexShrink: 0,
        overflow: "hidden",
        bgcolor: (theme) => theme.custom?.gradients?.glass ?? theme.palette.action.hover,
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
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Фото
        </Box>
      )}

      {item.stockBadge ? (
        <Box
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            py: 0.65,
            px: 1.5,
            borderRadius: "999px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.72),
            color: "primary.contrastText",
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.28),
            backdropFilter: "blur(6px)",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.15,
          }}
        >
          {item.stockBadge}
        </Box>
      ) : null}
    </Box>
  );
}

function ServiceCardRating({ rating }: { rating: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
      <StarRoundedIcon sx={{ fontSize: 16, color: "info.main" }} />
      <Typography
        component="span"
        sx={{
          fontSize: 12,
          lineHeight: 1.66,
          letterSpacing: "0.4px",
          color: brown[300],
        }}
      >
        {rating.toFixed(1)}
      </Typography>
    </Box>
  );
}

function ServiceCardPrice({ price }: { price: string }) {
  return (
    <Typography
      sx={{
        fontWeight: 800,
        fontSize: 18,
        lineHeight: 1.334,
        color: brown[600],
        whiteSpace: "nowrap",
      }}
    >
      {formatRubPriceLabel(price)}
    </Typography>
  );
}

function ServiceCardTitle({ title }: { title: string }) {
  return (
    <Typography
      sx={{
        fontSize: 16,
        lineHeight: 1.5,
        letterSpacing: "0.15px",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {title}
    </Typography>
  );
}

export function ServiceCard({ item, variant = "myCity" }: Props) {
  const cityName = item.provider?.city?.name ?? null;
  const imageHeight = variant === "myCity" ? 178 : 210;

  return (
    <Paper
      component={Link}
      href={`/services/${item.id}`}
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.paper",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <ServiceCardImage item={item} imageHeight={imageHeight} />

      {variant === "myCity" ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            flex: 1,
            px: 1.5,
            pt: 1.75,
            pb: 2.25,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              minHeight: 30,
            }}
          >
            <ServiceCardPrice price={item.price} />
            {item.rating != null ? <ServiceCardRating rating={item.rating} /> : null}
          </Box>
          <ServiceCardTitle title={item.title} />
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            minHeight: 143,
            px: 1.5,
            py: 1,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <ServiceCardPrice price={item.price} />
            <ServiceCardTitle title={item.title} />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              minHeight: 30,
            }}
          >
            {cityName ? (
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: grey[400],
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {cityName}
              </Typography>
            ) : (
              <Box />
            )}
            {item.rating != null ? <ServiceCardRating rating={item.rating} /> : null}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
