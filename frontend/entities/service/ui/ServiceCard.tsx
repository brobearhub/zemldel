"use client";

import { Box, Paper, Typography } from "@mui/material";
import { brown } from "@mui/material/colors";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Link from "next/link";
import type { ServiceCardItem, ServicePaletteColor } from "../types";
import { formatRubPriceLabel } from "@/shared/lib/money/format-rub-price-label";
import { CdnImage } from "@/shared/ui/cdn-image";
import { ServicePlaces } from "./ServicePlaces";

export type ServiceCardVariant = "myCity" | "otherCities";

type Props = {
  item: ServiceCardItem;
  variant?: ServiceCardVariant;
  /** В каталоге карточка ведёт на страницу услуги. В превью редактора ссылка не нужна. */
  linked?: boolean;
  /** Тег заголовка: в списках, где карточки — разделы страницы, передают "h2". */
  titleComponent?: "p" | "h2" | "h3";
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
        <CdnImage
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
            // Полосы светлые в обеих темах, поэтому и подпись фиксированно тёмная.
            color: "grey.700",
            fontSize: 14,
            fontWeight: 600,
            // На макете полосы идут «\», здесь наоборот — «/».
            backgroundImage:
              "repeating-linear-gradient(135deg, #e6e4dc 0 12px, #f6f5f0 12px 24px)",
          }}
        >
          + Фото
        </Box>
      )}

      {item.stockBadge ? (
        <ServiceCardBadge label={item.stockBadge} color={item.paletteColor ?? null} />
      ) : null}
    </Box>
  );
}

function ServiceCardBadge({
  label,
  color,
}: {
  label: string;
  color: ServicePaletteColor | null;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: 12,
        height: 28,
        pl: 1.5,
        pr: 1.25,
        borderRadius: "8px 0 0 8px",
        display: "flex",
        alignItems: "center",
        bgcolor: color ? `${color}.main` : "rgba(0,0,0,0.72)",
        color: color ? `${color}.contrastText` : "common.white",
        backdropFilter: color ? "none" : "blur(6px)",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1,
        textBoxTrim: "trim-both",
        textBoxEdge: "cap alphabetic",
      }}
    >
      {label}
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

function ServiceCardTitle({ title, component = "p" }: { title: string; component?: "p" | "h2" | "h3" }) {
  return (
    <Typography
      component={component}
      sx={{
        m: 0,
        fontWeight: "inherit",
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

export function ServiceCard({ item, variant = "myCity", linked = true, titleComponent }: Props) {
  const imageHeight = variant === "myCity" ? 178 : 210;
  const places = item.places ?? [];

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.paper",
        textDecoration: "none",
        color: "inherit",
        minWidth: 0,
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        ...(linked
          ? {
              "&:hover": {
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                transform: "translateY(-2px)",
              },
            }
          : null),
      }}
    >
      <Box
        {...(linked
          ? { component: Link, href: `/services/${item.id}` }
          : { component: "div" as const })}
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          color: "inherit",
          textDecoration: "none",
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
          <ServiceCardTitle title={item.title} component={titleComponent} />
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
            <ServiceCardTitle title={item.title} component={titleComponent} />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
              minHeight: 30,
            }}
          >
            {item.rating != null ? <ServiceCardRating rating={item.rating} /> : null}
          </Box>
        </Box>
      )}
      </Box>
      {places.length ? (
        <Box sx={{ px: 1.5, pb: 1.5, minWidth: 0 }}>
          <ServicePlaces places={places} />
        </Box>
      ) : null}
    </Paper>
  );
}
