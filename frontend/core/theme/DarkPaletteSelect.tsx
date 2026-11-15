"use client";

import { useId, useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import type { Theme } from "@mui/material/styles";
import { useColorMode } from "./ColorModeContext";
import {
  DARK_PALETTES,
  DARK_PALETTE_OPTIONS,
  DEFAULT_DARK_PALETTE,
  isDarkPaletteId,
} from "./dark-palettes";

type Props = {
  readonly compact?: boolean;
};

const menuSx = {
  // Mobile navigation uses a modal above the default MUI menu layer.
  zIndex: (theme: Theme) => theme.zIndex.modal + 200,
};

export function DarkPaletteSelect({ compact = false }: Props) {
  const { darkPalette, setDarkPalette } = useColorMode();
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const name = DARK_PALETTES[darkPalette].name;
  const options = DARK_PALETTE_OPTIONS.map((palette) => (
    <MenuItem
      key={palette.id}
      value={palette.id}
      selected={compact ? palette.id === darkPalette : undefined}
      onClick={
        compact
          ? () => {
              setDarkPalette(palette.id);
              setAnchor(null);
            }
          : undefined
      }
      sx={{
        gap: 1.5,
        whiteSpace: "normal",
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: "flex",
          flexShrink: 0,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0.5,
        }}
      >
        {[palette.background, palette.paper, palette.primary].map((color) => (
          <Box
            key={color}
            sx={{
              width: 12,
              height: 24,
              bgcolor: color,
            }}
          />
        ))}
      </Box>
      <Box>
        <Typography variant="body2">{palette.name}</Typography>
        {palette.id === DEFAULT_DARK_PALETTE ? (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            По умолчанию
          </Typography>
        ) : null}
      </Box>
    </MenuItem>
  ));
  const paper = {
    sx: {
      minWidth: 260,
      maxWidth: "calc(100vw - 32px)",
      maxHeight: 400,
    },
  };

  if (compact) {
    return (
      <>
        <Tooltip
          title={`Тёмная палитра: ${name}`}
          placement="right"
        >
          <IconButton
            id={`${id}-button`}
            aria-label={`Тёмная палитра: ${name}`}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            aria-controls={anchor ? `${id}-menu` : undefined}
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{ color: "primary.main" }}
          >
            <PaletteOutlined />
          </IconButton>
        </Tooltip>
        <Menu
          id={`${id}-menu`}
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          sx={menuSx}
          slotProps={{
            paper,
            list: { "aria-labelledby": `${id}-button` },
          }}
        >
          {options}
        </Menu>
      </>
    );
  }

  return (
    <TextField
      select
      fullWidth
      size="small"
      label="Тёмная палитра"
      value={darkPalette}
      onChange={(event) => {
        if (isDarkPaletteId(event.target.value)) {
          setDarkPalette(event.target.value);
        }
      }}
      slotProps={{
        select: {
          renderValue: () => name,
          MenuProps: {
            sx: menuSx,
            slotProps: { paper },
          },
        },
      }}
    >
      {options}
    </TextField>
  );
}
