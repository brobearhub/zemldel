"use client";

import Link from "next/link";
import { Box } from "@mui/material";
import { ServiceCard, type ServiceDto, type ServiceStatus } from "@/entities/service";
import { ProServiceCardActions } from "./ProServiceCardActions";

type Props = {
  service: ServiceDto;
  /** Только что опубликованная услуга: обводка и лента «Только что опубликована» вместо бейджа. */
  highlighted?: boolean;
  canArchiveOrDelete: boolean;
  busy: boolean;
  deleting: boolean;
  onStatusChange: (status: ServiceStatus) => void;
  onDelete: () => void;
  onCopyLink: () => void;
};

/** Карточка услуги в кабинете: та же карточка, что в каталоге, плюс полоса управления под ней. */
export function ProServiceManageCard({ service, highlighted = false, ...actions }: Props) {
  // Без paletteColor лента тёмная с белым текстом — читается на любом фото.
  const item = highlighted ? { ...service, stockBadge: "Только что опубликована", paletteColor: null } : service;

  return (
    <Box
      component="article"
      aria-label={service.title}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: (theme) => (highlighted ? `0 0 0 2px ${theme.palette.success.main}` : "none"),
        // Скругление даёт обёртка — у вложенной карточки углы прямые, чтобы стыковаться с полосой.
        "& > .service-card-slot > .MuiPaper-root": { borderRadius: 0 },
      }}
    >
      {/* Тело карточки ведёт в редактор — в том числе заглушка «+ Фото». */}
      <Box
        component={Link}
        href={`/pro/services/${service.id}/edit`}
        className="service-card-slot"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          color: "inherit",
          textDecoration: "none",
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
        }}
      >
        <ServiceCard item={item} linked={false} titleComponent="h2" />
      </Box>
      <ProServiceCardActions service={service} {...actions} />
    </Box>
  );
}
