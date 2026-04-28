"use client";

import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type RequestDetailHeaderCardProps = {
  subtitle: string;
  statusLabel: string;
  /** Текст заявки в белой карточке; если null — карточка скрыта */
  body: string | null;
  title?: string;
};

/**
 * Шапка заявки: заголовок, подпись, статус и блок текста — общий вид для кабинета клиента и компании.
 */
export function RequestDetailHeaderCard({
  subtitle,
  statusLabel,
  body,
  title = "Заявка",
}: RequestDetailHeaderCardProps) {
  return (
    <Box
      sx={(theme) => ({
        bgcolor: alpha(theme.palette.common.black, 0.035),
        borderRadius: "16px",
        p: { xs: 2, sm: 2.5 },
      })}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={statusLabel}
            sx={(theme) => ({
              flexShrink: 0,
              alignSelf: "flex-start",
              mt: 0.25,
              bgcolor: alpha(theme.palette.common.black, 0.08),
              color: "text.secondary",
              fontWeight: 600,
              border: "none",
              height: 28,
              "& .MuiChip-label": { px: 1.25 },
            })}
          />
        </Stack>

        {body ? (
          <Paper
            elevation={0}
            sx={(theme) => ({
              p: 2.5,
              borderRadius: "10px",
              bgcolor: "background.paper",
              border: `1px solid ${alpha(theme.palette.common.black, 0.06)}`,
              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
            })}
          >
            <Typography fontWeight={700} color="text.primary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {body}
            </Typography>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
