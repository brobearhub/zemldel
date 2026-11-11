import type { ReactNode } from "react";
import { Box, Button, Chip, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import Link from "@/shared/ui/Link";

export function ProRequestDocumentFileCard({
  title,
  status,
  actions,
}: {
  title: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 1.5,
        minWidth: 0,
        bgcolor: alpha(theme.palette.primary.main, 0.05),
        borderColor: "divider",
        boxShadow: "none",
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          tablet: "minmax(0, 1fr) auto",
        },
        gridTemplateAreas: {
          xs: '"info" "actions"',
          tablet: '"info actions"',
        },
        alignItems: "center",
        gap: 1,
      })}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={{
          gridArea: "info",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            overflowWrap: "anywhere",
            minWidth: 0,
          }}
        >
          {title}
        </Typography>
        {status === undefined ? (
          <Chip
            size="small"
            label="Вложение"
            sx={(theme) => ({
              display: { xs: "inline-flex", tablet: "none" },
              bgcolor: alpha(theme.palette.primary.main, 0.16),
            })}
          />
        ) : (
          status
        )}
      </Stack>
      {actions ? (
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gridArea: "actions",
            gap: { xs: 2, tablet: 1 },
            flexWrap: "wrap",
            justifyContent: { xs: "flex-end", tablet: "flex-start" },
          }}
        >
          {actions}
        </Stack>
      ) : null}
    </Paper>
  );
}

const actionSx = (color: "success" | "error") => ({
  minWidth: { xs: 0, tablet: 40 },
  minHeight: 40,
  width: { xs: "auto", tablet: 40 },
  p: { xs: 0, tablet: 1 },
  borderRadius: { xs: 1, tablet: "50%" },
  bgcolor: "transparent",
  color: { xs: `${color}.dark`, tablet: `${color}.main` },
  "&:hover": {
    bgcolor: { xs: "action.hover", tablet: `${color}.main` },
    color: { xs: `${color}.dark`, tablet: `${color}.contrastText` },
  },
  "&.Mui-disabled": {
    bgcolor: "transparent",
    color: "action.disabled",
  },
});

export function ProRequestDocumentDownload({
  href,
  name,
  disabled,
}: {
  href: string;
  name: string;
  disabled: boolean;
}) {
  const label = `Скачать ${name}`;
  return (
    <Tooltip title={disabled ? "" : label}>
      <Button
        component={Link}
        href={href}
        prefetch={false}
        variant="text"
        aria-label={label}
        disabled={disabled}
        sx={actionSx("success")}
      >
        <DownloadOutlinedIcon
          fontSize="small"
          sx={{
            display: { xs: "none", tablet: "block" },
          }}
        />
        <Box
          component="span"
          sx={{
            display: { xs: "inline", tablet: "none" },
          }}
        >
          Скачать
        </Box>
      </Button>
    </Tooltip>
  );
}

export function ProRequestDocumentDelete({
  name,
  text = "Удалить",
  disabled,
  loading,
  onClick,
}: {
  name: string;
  text?: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const label = `Удалить ${name}`;
  return (
    <Tooltip title={disabled || loading ? "" : label}>
      <Button
        color="error"
        variant="text"
        aria-label={label}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
        sx={actionSx("error")}
      >
        <CloseIcon
          fontSize="small"
          sx={{
            display: { xs: "none", tablet: "block" },
          }}
        />
        <Box
          component="span"
          sx={{
            display: { xs: "inline", tablet: "none" },
          }}
        >
          {text}
        </Box>
      </Button>
    </Tooltip>
  );
}
