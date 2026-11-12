"use client";

import type { ReactNode } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type RequestDetailHeaderCardProps = {
  subtitle: string;
  reference?: string;
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
  /** Строка под заголовком, на всю ширину. Для цены, чтобы чип не раздувал ряд. */
  lead?: ReactNode;
  nextStep?: ReactNode;
};

/**
 * Шапка заявки: заголовок, подпись, статус и блок текста — общий вид для кабинета клиента и компании.
 */
export function RequestDetailHeaderCard({
  subtitle,
  reference,
  statusLabel,
  body,
  details,
  afterBody,
  footerEnd,
  title = "Заявка",
  lead,
  nextStep,
}: RequestDetailHeaderCardProps) {
  const hasFooter = Boolean(afterBody || footerEnd);
  return (
    <Box
      sx={(theme) => ({
        bgcolor: alpha(theme.palette.common.black, 0.035),
        borderRadius: 1,
        p: { xs: 2, sm: 2.5 },
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
      })}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: "flex-start",
            justifyContent: "space-between",
            minWidth: 0,
            width: "100%",
            pb: { md: 2 },
          }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 0, flex: "1 1 auto" }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                overflowWrap: "anywhere",
              }}
            >
              {title}
            </Typography>
            {reference ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  overflowWrap: "anywhere",
                }}
              >
                {reference}
              </Typography>
            ) : null}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                display: "none",
              }}
            >
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
              bgcolor: "background.paper",
              color: "text.secondary",
              fontWeight: 600,
              border: "1px solid",
              borderColor: "divider",
              height: "auto",
              minHeight: 36,
              "& .MuiChip-label": { px: 1.25 },
            })}
          />
        </Stack>

        {nextStep}

        {lead ? <Box sx={{ minWidth: 0, maxWidth: "100%" }}>{lead}</Box> : null}

        {details || body ? (
          <Stack
            direction="column"
            spacing={2}
            useFlexGap
            sx={{
              alignItems: "stretch",
              minWidth: 0,
            }}
          >
            {details ? (
              <Box sx={{ minWidth: 0, maxWidth: "100%" }}>{details}</Box>
            ) : null}

            {body ? (
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: { xs: 1.5, sm: 2.5 },
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  border: `1px solid ${alpha(theme.palette.common.black, 0.06)}`,
                  boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                  minWidth: 0,
                })}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {body}
                </Typography>
              </Paper>
            ) : null}
          </Stack>
        ) : null}

        {hasFooter ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              width: "100%",
              pt: { xs: 2, sm: 1 },
            }}
          >
            <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>{afterBody}</Box>
            {footerEnd ? (
              <Box
                sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                {footerEnd}
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
