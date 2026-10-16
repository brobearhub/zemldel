"use client";

import { useState } from "react";
import { Box, Menu, MenuItem } from "@mui/material";
import type { ServicePaletteColor } from "@/entities/service";
import { LABEL_COLORS, LABEL_DOT_SIZE } from "./label-colors";

const MENU_PAD = 6;
/** Центр первого кружка от верха меню — он совпадает с кружком в поле. */
const FIRST_DOT_CENTER = MENU_PAD + LABEL_DOT_SIZE / 2;

type Props = {
  value: ServicePaletteColor | "";
  disabled: boolean;
  onChange: (color: ServicePaletteColor) => void;
};

export function DesktopLabelColor({ value, disabled, onChange }: Props) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const shown = value || "primary";

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label="Цвет метки"
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        disabled={disabled}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
        sx={{
          width: LABEL_DOT_SIZE,
          height: LABEL_DOT_SIZE,
          p: 0,
          flexShrink: 0,
          borderRadius: "50%",
          border: "2px solid transparent",
          bgcolor: `${shown}.main`,
          cursor: disabled ? "default" : "pointer",
        }}
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        marginThreshold={0}
        anchorOrigin={{ vertical: "center", horizontal: "center" }}
        transformOrigin={{ vertical: FIRST_DOT_CENTER, horizontal: "center" }}
        slotProps={{
          paper: { sx: { minWidth: 0 } },
          list: {
            sx: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: `${MENU_PAD}px`,
              px: `${MENU_PAD}px`,
              py: `${MENU_PAD}px`,
            },
          },
        }}
      >
        {LABEL_COLORS.map((color) => (
          <MenuItem
            key={color}
            aria-label={color}
            selected={color === shown}
            onClick={() => {
              onChange(color);
              setAnchor(null);
            }}
            sx={{ minHeight: 0, width: LABEL_DOT_SIZE, justifyContent: "center", p: 0 }}
          >
            <Box
              aria-hidden
              sx={{
                width: LABEL_DOT_SIZE,
                height: LABEL_DOT_SIZE,
                borderRadius: "50%",
                bgcolor: `${color}.main`,
                border: "2px solid",
                borderColor: color === shown ? "text.primary" : "transparent",
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
