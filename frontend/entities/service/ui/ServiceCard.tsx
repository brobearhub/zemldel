"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { brown } from "@mui/material/colors";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Link from "next/link";
import type { ServiceCardItem, ServicePaletteColor } from "../types";
import { formatRubPriceLabel } from "@/shared/lib/money/format-rub-price-label";
import { CdnFillImage, CdnImage } from "@/shared/ui/cdn-image";
import { ServicePlaces } from "./ServicePlaces";

export type ServiceCardVariant = "myCity" | "otherCities";

type Props = {
  item: ServiceCardItem;
  variant?: ServiceCardVariant;
  /** В каталоге карточка ведёт на страницу услуги. В превью редактора ссылка не нужна. */
  linked?: boolean;
  /** Тег заголовка: в списках, где карточки — разделы страницы, передают "h2". */
  titleComponent?: "p" | "h2" | "h3";
  compact?: boolean;
  favoriteAction?: ReactNode;
  /** Ширина изображения в сетке, если карточка использует оптимизацию Next.js. */
  imageSizes?: string;
};

function ServiceCardImage({
  item,
  imageHeight,
  compact,
  imageSizes,
}: {
  item: ServiceCardItem;
  imageHeight: number;
  compact: boolean;
  imageSizes?: string;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: imageHeight,
        flexShrink: 0,
        overflow: "hidden",
        bgcolor: (theme) =>
          theme.custom?.gradients?.glass ?? theme.palette.action.hover,
      }}
    >
      {item.image && imageSizes ? (
        <CdnFillImage
          key={item.image}
          src={item.image}
          alt=""
          sizes={imageSizes}
          unoptimized={process.env.NODE_ENV !== "production"}
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : item.image ? (
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
            fontSize: compact ? 14 : "1rem",
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
        <ServiceCardBadge
          label={item.stockBadge}
          color={item.paletteColor ?? null}
          compact={compact}
        />
      ) : null}
    </Box>
  );
}

function ServiceCardBadge({
  label,
  color,
  compact,
}: {
  label: string;
  color: ServicePaletteColor | null;
  compact: boolean;
}) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const badge = badgeRef.current;
    const text = textRef.current;
    const image = badge?.parentElement;
    if (!badge || !text || !image) return;

    let active = true;
    const fitToText = () => {
      if (!active) return;
      badge.style.width = "max-content";
      const range = document.createRange();
      range.selectNodeContents(text);
      if (typeof range.getClientRects !== "function") return;
      const lines = Array.from(range.getClientRects());
      if (lines.length < 2) return;

      const styles = getComputedStyle(badge);
      const padding =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      badge.style.width = `${Math.ceil(
        Math.max(...lines.map((line) => line.width)) + padding,
      )}px`;
    };

    fitToText();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fitToText);
    if (observer) observer.observe(image);
    else window.addEventListener("resize", fitToText);
    void document.fonts?.ready.then(fitToText);

    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", fitToText);
    };
  }, [label]);

  return (
    <Box
      ref={badgeRef}
      sx={{
        position: "absolute",
        right: 0,
        top: 12,
        minHeight: compact ? 28 : 36,
        boxSizing: "border-box",
        maxWidth: "calc(100% - 16px)",
        py: compact ? 0 : 0.75,
        pl: 1.5,
        pr: 1.25,
        borderRadius: "8px 0 0 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        textAlign: "right",
        bgcolor: color ? `${color}.main` : "rgba(0,0,0,0.72)",
        color: color ? `${color}.contrastText` : "common.white",
        backdropFilter: color ? "none" : "blur(6px)",
        fontSize: compact ? 13 : "1rem",
        fontWeight: 600,
        lineHeight: compact ? 1 : 1.5,
        overflowWrap: "anywhere",
      }}
    >
      <span ref={textRef}>{label}</span>
    </Box>
  );
}

function ServiceCardRating({
  rating,
  compact,
}: {
  rating: number;
  compact: boolean;
}) {
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
    >
      <StarRoundedIcon sx={{ fontSize: 16, color: "info.main" }} />
      <Typography
        component="span"
        sx={{
          fontSize: compact ? 12 : "1rem",
          lineHeight: 1.66,
          letterSpacing: "0.4px",
          color: compact ? brown[300] : "text.secondary",
        }}
      >
        {rating.toFixed(1)}
      </Typography>
    </Box>
  );
}

function ServiceCardPrice({
  price,
  compact,
}: {
  price: string;
  compact: boolean;
}) {
  return (
    <Typography
      sx={{
        fontWeight: compact ? 800 : 700,
        fontSize: compact ? 18 : "1.375rem",
        lineHeight: compact ? 1.334 : 30 / 22,
        color: compact ? brown[600] : "text.primary",
        whiteSpace: compact ? "nowrap" : "normal",
        overflowWrap: compact ? "normal" : "anywhere",
      }}
    >
      {formatRubPriceLabel(price)}
    </Typography>
  );
}

function ServiceCardTitle({
  title,
  component = "p",
  compact,
}: {
  title: string;
  component?: "p" | "h2" | "h3";
  compact: boolean;
}) {
  return (
    <Typography
      component={component}
      sx={{
        m: 0,
        fontWeight: compact ? "inherit" : 600,
        fontSize: compact ? 16 : "1.125rem",
        lineHeight: compact ? 1.5 : 26 / 18,
        letterSpacing: "0.15px",
        display: compact ? "-webkit-box" : "block",
        WebkitLineClamp: compact ? 2 : undefined,
        WebkitBoxOrient: compact ? "vertical" : undefined,
        overflow: compact ? "hidden" : undefined,
        overflowWrap: compact ? "normal" : "anywhere",
      }}
    >
      {title}
    </Typography>
  );
}

export function ServiceCard({
  item,
  variant = "myCity",
  linked = true,
  titleComponent,
  compact = false,
  favoriteAction,
  imageSizes,
}: Props) {
  const imageHeight = variant === "myCity" ? 178 : 210;
  const places = item.places ?? [];

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
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
      {favoriteAction ? (
        <Box
          sx={{
            position: "absolute",
            left: 8,
            top: imageHeight - 44 - 8,
            zIndex: 2,
          }}
        >
          {favoriteAction}
        </Box>
      ) : null}
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
        <ServiceCardImage
          item={item}
          imageHeight={imageHeight}
          compact={compact}
          imageSizes={imageSizes}
        />

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
                flexWrap: compact ? "nowrap" : "wrap",
                gap: 1,
                minHeight: 30,
              }}
            >
              <ServiceCardPrice
                price={item.price}
                compact={compact}
              />
              {item.rating != null ? (
                <ServiceCardRating
                  rating={item.rating}
                  compact={compact}
                />
              ) : null}
            </Box>
            <ServiceCardTitle
              title={item.title}
              component={titleComponent}
              compact={compact}
            />
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
              <ServiceCardPrice
                price={item.price}
                compact={compact}
              />
              <ServiceCardTitle
                title={item.title}
                component={titleComponent}
                compact={compact}
              />
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
              {item.rating != null ? (
                <ServiceCardRating
                  rating={item.rating}
                  compact={compact}
                />
              ) : null}
            </Box>
          </Box>
        )}
      </Box>
      {places.length ? (
        <Box sx={{ px: 1.5, pb: 1.5, minWidth: 0 }}>
          <ServicePlaces places={places} compact={compact} />
        </Box>
      ) : null}
    </Paper>
  );
}
