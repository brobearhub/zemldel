"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, Button, Divider, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import type { ServiceDto, ServiceStatus } from "@/entities/service";
import { serviceAttention, serviceAttentionLabel } from "../lib/service-attention";

type Props = {
  service: ServiceDto;
  canArchiveOrDelete: boolean;
  busy: boolean;
  deleting: boolean;
  onStatusChange: (status: ServiceStatus) => void;
  onDelete: () => void;
  onCopyLink: () => void;
};

// Цвет статуса несёт только точка: мелкий текст держим в text.primary ради контраста.
const STATUS_META: Record<ServiceStatus, { label: string; dot: string }> = {
  PUBLISHED: { label: "В каталоге", dot: "success.main" },
  DRAFT: { label: "Черновик", dot: "warning.main" },
  ARCHIVED: { label: "Архив", dot: "text.disabled" },
};

export function ProServiceCardActions({
  service,
  canArchiveOrDelete,
  busy,
  deleting,
  onStatusChange,
  onDelete,
  onCopyLink,
}: Props) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const editHref = `/pro/services/${service.id}/edit`;
  const status = STATUS_META[service.status];
  const attention = serviceAttention(service);
  const menuId = `service-actions-${service.id}`;

  function runFromMenu(action: () => void) {
    setMenuAnchor(null);
    action();
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        px: 1.5,
        pt: 1.25,
        pb: 1.5,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, minHeight: 20 }}>
        <Typography
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontSize: 12, fontWeight: 700, color: "text.primary" }}
        >
          <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: status.dot }} />
          {status.label}
        </Typography>
        {attention ? (
          <Box
            component={Link}
            href={editHref}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              fontSize: 12,
              fontWeight: 700,
              color: (theme) => (theme.palette.mode === "dark" ? theme.palette.warning.main : theme.palette.warning.dark),
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
            {serviceAttentionLabel(attention)}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ display: "flex", gap: 0.75 }}>
        <Button
          component={Link}
          href={editHref}
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          disabled={busy}
          sx={{ flex: 1, minHeight: 44 }}
        >
          Редактировать
        </Button>
        <IconButton
          aria-label="Ещё действия"
          aria-controls={menuAnchor ? menuId : undefined}
          aria-haspopup="menu"
          aria-expanded={menuAnchor ? "true" : undefined}
          aria-busy={busy}
          // Не disabled на время запроса: иначе Menu вернёт фокус в отключённую кнопку и он уйдёт в <body>.
          loading={deleting}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{ width: 44, height: 44, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}
        >
          <MoreHorizRoundedIcon />
        </IconButton>
      </Box>

      <Menu id={menuId} anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {service.status === "PUBLISHED" ? (
          <MenuItem component={Link} href={`/services/${service.id}`} onClick={() => setMenuAnchor(null)}>
            Открыть в каталоге
          </MenuItem>
        ) : null}
        {service.status === "PUBLISHED" ? (
          <MenuItem onClick={() => runFromMenu(onCopyLink)}>Скопировать ссылку</MenuItem>
        ) : null}
        {service.status === "DRAFT" ? (
          <MenuItem onClick={() => runFromMenu(() => onStatusChange("PUBLISHED"))}>Опубликовать</MenuItem>
        ) : null}
        {service.status === "PUBLISHED" ? (
          <MenuItem onClick={() => runFromMenu(() => onStatusChange("DRAFT"))}>Снять с публикации</MenuItem>
        ) : null}
        {service.status !== "ARCHIVED" && canArchiveOrDelete ? (
          <MenuItem onClick={() => runFromMenu(() => onStatusChange("ARCHIVED"))}>В архив</MenuItem>
        ) : null}
        {service.status === "ARCHIVED" ? (
          <MenuItem onClick={() => runFromMenu(() => onStatusChange("DRAFT"))}>Вернуть в черновик</MenuItem>
        ) : null}
        {canArchiveOrDelete ? <Divider /> : null}
        {canArchiveOrDelete ? (
          <MenuItem onClick={() => runFromMenu(onDelete)} sx={{ color: "error.main" }}>
            Удалить…
          </MenuItem>
        ) : null}
      </Menu>
    </Box>
  );
}
