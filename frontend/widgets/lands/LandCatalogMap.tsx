"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Box, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { landOfferCount } from "@/entities/land/catalog-query";
import {
  formatArea,
  landAddress,
  landPrice,
  type LandCatalogResult,
} from "@/entities/land/types";
import { LandMap } from "./LandMap";
import { LandFavoriteButton, LandPhoto, listingHref } from "./LandCard";

const markerPrice = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function LandCatalogMap({
  data,
  bbox,
  onSearch,
  returnTo,
  pendingIds,
  onFavorite,
}: {
  data: LandCatalogResult;
  bbox?: string;
  onSearch: (bbox: string) => void;
  returnTo: string;
  pendingIds: string[];
  onFavorite: (id: string) => void;
}) {
  const [selectedNumber, setSelectedNumber] = useState("");
  const byId = useMemo(
    () => new Map(data.items.map((row) => [row.id, row])),
    [data.items],
  );
  const markers = useMemo(
    () =>
      data.markers.map((marker) => {
        const price = byId.get(marker.listingIds[0])?.priceRubles;
        return {
          ...marker,
          label: price == null ? undefined : markerPrice.format(price) + " ₽",
        };
      }),
    [byId, data.markers],
  );
  const selected = markers.find(
    (marker) => marker.cadastralNumber === selectedNumber,
  );
  return (
    <LandMap
      markers={markers}
      bbox={bbox}
      onSearch={onSearch}
      onSelect={(marker) => setSelectedNumber(marker.cadastralNumber)}
      selectedNumber={selected?.cadastralNumber}
    >
      {selected && (
        <Paper
          role="region"
          aria-label="Предложения выбранного участка"
          elevation={3}
          sx={{
            position: "absolute",
            zIndex: 3,
            left: 12,
            bottom: 24,
            width: "min(370px, calc(100% - 24px))",
            maxHeight: "47%",
            overflowY: "auto",
            p: 1,
          }}
        >
          <IconButton
            aria-label="Закрыть выбранный участок"
            size="small"
            onClick={() => setSelectedNumber("")}
            sx={{
              position: "absolute",
              right: 4,
              top: 4,
            }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
          {selected.listingIds.length > 1 && (
            <Typography
              variant="subtitle2"
              sx={{
                pr: 4,
                pb: 0.5,
              }}
            >
              {landOfferCount(selected.listingIds.length)} на участке
            </Typography>
          )}
          {selected.listingIds.map((id) => {
            const row = byId.get(id);
            if (!row) return null;
            return (
              <Box
                key={id}
                sx={{
                  display: "flex",
                  alignItems: "end",
                }}
              >
                <Box
                  component={Link}
                  href={listingHref(row, returnTo)}
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    alignItems: "center",
                    minWidth: 0,
                    flex: 1,
                    py: 0.5,
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover strong": { textDecoration: "underline" },
                  }}
                >
                  <Box
                    sx={{
                      width: 78,
                      height: 58,
                      borderRadius: 1,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <LandPhoto row={row} />
                  </Box>
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography
                      component="strong"
                      variant="subtitle2"
                    >
                      {row.title}
                    </Typography>
                    <Typography variant="body2">
                      {landPrice(row)} · {formatArea(row.areaM2)}
                      {row.dealType === "SHARE" ? " всего" : ""}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {landAddress(row)}
                    </Typography>
                  </Stack>
                </Box>
                <LandFavoriteButton
                  favorite={data.favoriteIds.includes(id)}
                  busy={pendingIds.includes(id)}
                  onFavorite={() => onFavorite(id)}
                />
              </Box>
            );
          })}
        </Paper>
      )}
    </LandMap>
  );
}
