"use client";

import { Box, Typography } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useColorMode } from "@/core/theme/ColorModeContext";

type ColorModeToggleProps = {
  /** Подпись под иконкой — как у пунктов site-хедера. */
  readonly showLabel?: boolean;
};

export function ColorModeToggle({ showLabel = false }: ColorModeToggleProps) {
  const { mode, toggleMode } = useColorMode();
  const isDark = mode === "dark";
  const label = isDark ? "Светлая" : "Тёмная";
  const Icon = isDark ? LightModeOutlinedIcon : DarkModeOutlinedIcon;

  return (
    <Box
      component="button"
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.25,
        px: { xs: 0.75, sm: 1 },
        py: 0.75,
        borderRadius: 1.5,
        cursor: "pointer",
        background: "none",
        border: "none",
        color: "inherit",
        "&:hover": {
          "& .nav-label": { color: "info.main" },
          "& .MuiSvgIcon-root": { color: "info.main" },
        },
      }}
    >
      <Icon sx={{ fontSize: { xs: 22, sm: 24 }, color: "common.gray" }} />
      {showLabel ? (
        <Typography
          className="nav-label"
          variant="body2"
          sx={{
            color: "common.gray",
            display: { xs: "none", md: "block" },
            fontWeight: 600,
            fontSize: 12
          }}>
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}
