"use client";

import Link from "next/link";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import LandscapeOutlined from "@mui/icons-material/LandscapeOutlined";
import {
  DEAL_LABELS,
  formatArea,
  landAddress,
  landPrice,
  landPriceCaption,
  type LandListing,
} from "@/entities/land/types";

export function listingHref(row: LandListing, returnTo: string) {
  return `/lands/${row.id}?from=${encodeURIComponent(returnTo)}`;
}

export function LandPhoto({ row }: { row: LandListing }) {
  const photo = row.photos[0];
  return photo ? (
    <Box
      component="img"
      src={photo.url}
      alt=""
      loading="lazy"
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  ) : (
    <Box
      sx={{
        display: "grid",
        height: "100%",
        placeItems: "center",
        bgcolor: "action.hover",
        color: "text.secondary",
      }}
    >
      <LandscapeOutlined />
    </Box>
  );
}

export function LandFavoriteButton({
  favorite,
  busy,
  onFavorite,
}: {
  favorite: boolean;
  busy: boolean;
  onFavorite: () => void;
}) {
  return (
    <IconButton
      size="small"
      aria-label={favorite ? "Убрать из избранного" : "В избранное"}
      aria-pressed={favorite}
      disabled={busy}
      onClick={onFavorite}
      sx={{ color: favorite ? "text.primary" : "text.secondary" }}
    >
      {favorite ? (
        <FavoriteRounded fontSize="small" />
      ) : (
        <FavoriteBorderRounded fontSize="small" />
      )}
    </IconButton>
  );
}

function locationSummary(row: LandListing) {
  if (row.kind === "SELECTION")
    return row.details.allRussia
      ? "Вся Россия"
      : row.places.map((place) => place.name).join(", ");
  return [
    `${formatArea(row.areaM2)}${row.dealType === "SHARE" ? " всего" : ""}`,
    landAddress(row),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function LandCard({
  row,
  favorite,
  busy,
  onFavorite,
  returnTo,
  view,
}: {
  row: LandListing;
  favorite: boolean;
  busy: boolean;
  onFavorite: () => void;
  returnTo: string;
  view: "list" | "tiles";
}) {
  const tile = view === "tiles";
  const muted = {
    color: "text.secondary",
    fontSize: "0.9375rem",
    lineHeight: 1.4,
  };
  const title = (
    <Typography
      component="h3"
      variant="h6"
      sx={{
        fontWeight: 700,
        overflowWrap: "anywhere",
      }}
    >
      {row.title}
    </Typography>
  );
  const deal = (
    <Typography
      variant="body2"
      sx={muted}
    >
      {row.kind === "SELECTION" ? "Подбор участка" : DEAL_LABELS[row.dealType]}
    </Typography>
  );
  const location = (
    <Typography
      variant="body2"
      sx={{ ...muted, color: "text.primary" }}
    >
      {locationSummary(row)}
    </Typography>
  );
  const price = (
    <Typography
      sx={{
        fontSize: tile ? "1.375rem" : "1.0625rem",
        fontWeight: 800,
      }}
    >
      {landPrice(row)}
    </Typography>
  );
  const caption = (
    <Typography
      variant="body2"
      sx={muted}
    >
      {landPriceCaption(row)}
    </Typography>
  );
  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        display: "flex",
        alignItems: tile ? "stretch" : "center",
        minWidth: 0,
        border: tile ? "1px solid" : 0,
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: tile ? 1 : 0,
        bgcolor: tile ? "background.paper" : "transparent",
      }}
    >
      <Box
        component={Link}
        href={listingHref(row, returnTo)}
        aria-label={row.title}
        sx={{
          display: tile ? "flex" : "grid",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          alignItems: tile ? "stretch" : "center",
          gridTemplateColumns: {
            xs: "84px minmax(0, 1fr)",
            sm: "134px minmax(0, 1fr) minmax(140px, 191px)",
          },
          columnGap: {
            xs: 1,
            sm: 2,
          },
          rowGap: tile ? 0 : 0.5,
          py: tile ? 0 : 1.5,
          color: "text.primary",
          textDecoration: "none",
          "&:hover h3": { textDecoration: "underline" },
        }}
      >
        <Box
          sx={{
            height: tile
              ? 178
              : {
                  xs: 64,
                  sm: 87,
                },
            width: "100%",
            borderRadius: tile ? "8px 8px 0 0" : 1,
            overflow: "hidden",
            gridRow: {
              xs: "1 / span 2",
              sm: "auto",
            },
          }}
        >
          <LandPhoto row={row} />
        </Box>
        {tile ? (
          <Stack
            spacing={0.5}
            sx={{ p: 1.5 }}
          >
            {deal}
            {price}
            {caption}
            {title}
            {location}
            {row.kind === "SELECTION" && row.details.scope && (
              <Typography variant="body2">{row.details.scope}</Typography>
            )}
            {row.kind === "SELECTION" && (
              <Typography
                variant="body2"
                sx={muted}
              >
                {row.authorName}
              </Typography>
            )}
          </Stack>
        ) : (
          <>
            <Stack
              spacing={0.25}
              sx={{ minWidth: 0 }}
            >
              {deal}
              {title}
              {location}
            </Stack>
            <Stack
              spacing={0.25}
              sx={{
                gridColumn: {
                  xs: 2,
                  sm: "auto",
                },
              }}
            >
              {price}
              {caption}
            </Stack>
          </>
        )}
      </Box>
      <Box
        sx={{
          alignSelf: tile
            ? undefined
            : {
                xs: "flex-start",
                sm: "center",
              },
          position: tile ? "absolute" : "relative",
          top: tile
            ? 8
            : {
                xs: 8,
                sm: 0,
              },
          right: tile ? 8 : 0,
          ml: tile ? 0 : 1,
          borderRadius: "50%",
          bgcolor: tile ? "background.paper" : undefined,
        }}
      >
        <LandFavoriteButton
          favorite={favorite}
          busy={busy}
          onFavorite={onFavorite}
        />
      </Box>
    </Box>
  );
}
