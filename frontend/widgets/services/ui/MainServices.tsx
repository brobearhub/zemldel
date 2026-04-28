"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  SERVICE_ICON_MAP,
  type MainServiceItem,
} from "@/widgets/services/model/mainServices";
import { MainServiceCard } from "@/widgets/services/ui/MainServiceCard";
import type { ServiceDto } from "@/entities/service";
import MapRoundedIcon from "@mui/icons-material/MapRounded";

function recordToMainItem(record: ServiceDto): MainServiceItem {
  const mappedIcon = record.icon != null ? SERVICE_ICON_MAP[record.icon] : undefined;
  const Icon = mappedIcon ?? MapRoundedIcon;
  return {
    title: record.title,
    description: record.description ?? "",
    badge: record.badge ?? undefined,
    highlight: record.highlight ?? undefined,
    paletteColor: record.paletteColor ?? "primary",
    Icon,
  };
}

export const MainServices = () => {
  const [items, setItems] = useState<MainServiceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch services");
        return res.json() as Promise<ServiceDto[]>;
      })
      .then((services) =>
        services
          .filter((s) => s.category?.slug === "main")
          .map(recordToMainItem)
      )
      .then(setItems)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Ошибка загрузки")
      );
  }, []);

  if (error) {
    return (
      <Typography color="error">{error}</Typography>
    );
  }

  if (!items) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }}>
      <Stack spacing={0.75}>
        <Typography
          component="h2"
          sx={{ fontWeight: 900, letterSpacing: "-0.01em", fontSize: 28 }}
          color="primary"
        >
          Основные услуги
        </Typography>
        {/* <Typography sx={{ color: "text.secondary", maxWidth: 860 }}>
          Работаем с земельными участками: от оформления документов до
          представительства в суде.
        </Typography> */}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
          alignItems: "stretch",
        }}
      >
        {items.map((item) => (
          <MainServiceCard key={item.title} item={item} />
        ))}
      </Box>
    </Stack>
  );
};
