"use client";

import type { ReactNode } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type RequestDetailHeaderCardProps = {
  subtitle: string;
  statusLabel: string;
  /** Текст заявки в белой карточке; если null — карточка скрыта */
  body: string | null;
  /** Произвольный контент между заголовком и текстом заявки */
  details?: ReactNode;
  /** Контент после описания (lifecycle-кнопки/мета); без body — сразу после details */
  afterBody?: ReactNode;
  /** Контент в нижнем правом углу блока заявки (например иконка клиента/исполнителя) */
  footerEnd?: ReactNode;
  title?: string;
};

/**
 * Шапка заявки: заголовок, подпись, статус и блок текста — общий вид для кабинета клиента и компании.
 */
export function RequestDetailHeaderCard({
  subtitle,
  statusLabel,
  body,
  details,
  afterBody,
  footerEnd,
  title = "Заявка",
}: RequestDetailHeaderCardProps) {
  const hasFooter = Boolean(afterBody || footerEnd);
  const sideBySide = Boolean(details && body);

  return (
    <Box
      sx={(theme) => ({
        bgcolor: alpha(theme.palette.common.black, 0.035),
        borderRadius: "16px",
        p: { xs: 2, sm: 2.5 },
      })}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "flex-start",
            justifyContent: "space-between",
            pb: { md: 2 }
          }}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "text.primary"
              }}>
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                display: "none"
              }}>
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

        {details || body ? (
          <Stack
            direction={sideBySide ? { xs: "row-reverse", md: "column" } : "column"}
            spacing={sideBySide ? { xs: 3, md: 2 } : 2}
            useFlexGap
            sx={{
              alignItems: "stretch"
            }}
          >
            {details ? (
              <Box sx={sideBySide ? { flexShrink: 0 } : undefined }>{details}</Box>
            ) : null}

            {body ? (
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: { xs: 1.5, sm: 2.5 },
                  borderRadius: "10px",
                  bgcolor: "background.paper",
                  border: `1px solid ${alpha(theme.palette.common.black, 0.06)}`,
                  boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                  ...(sideBySide
                    ? {
                        flex: { xs: "1 1 auto", md: "none" },
                        minWidth: 0,
                      }
                    : null),
                })}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5
                  }}>
                  {body}
                </Typography>
              </Paper>
            ) : null}
          </Stack>
        ) : null}

        {hasFooter ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              pt: { xs: 2, sm: 1 }
            }}>
            <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>{afterBody}</Box>
            {footerEnd ? (
              <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{footerEnd}</Box>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
