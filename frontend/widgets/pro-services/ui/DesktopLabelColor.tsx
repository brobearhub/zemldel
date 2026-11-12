"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Box, Link, Menu, MenuItem, Tooltip } from "@mui/material";
import type { ServicePaletteColor } from "@/entities/service";
import { BUSINESS_ONLY, LITE_AND_BUSINESS } from "@/shared/ui/PlanFeatureGate";
import { LABEL_COLORS, LABEL_DOT_SIZE } from "./label-colors";

const MENU_PAD = 6;
/** Центр первого кружка от верха меню — он совпадает с кружком в поле. */
const FIRST_DOT_CENTER = MENU_PAD + LABEL_DOT_SIZE / 2;

type Props = {
  value: ServicePaletteColor | "";
  disabled: boolean;
  colorLocked?: boolean;
  badgeLocked?: boolean;
  onChange: (color: ServicePaletteColor) => void;
};

export function DesktopLabelColor({
  value,
  disabled,
  onChange,
  colorLocked = false,
  badgeLocked = false,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [restrictedColor, setRestrictedColor] = useState<ServicePaletteColor | null>(null);
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
        onClose={() => {
          setAnchor(null);
          setRestrictedColor(null);
        }}
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
        {LABEL_COLORS.map((color) => {
          const message = colorLocked && color !== "primary"
            ? BUSINESS_ONLY
            : badgeLocked ? LITE_AND_BUSINESS : null;
          return (
            <Tooltip
              key={color}
              arrow
              placement="left"
              open={restrictedColor === color}
              disableHoverListener
              disableFocusListener
              disableTouchListener
              title={
                <Box sx={{ p: 0.5 }}>
                  {message}
                  <Link
                    component={NextLink}
                    href="/pro/settings/tariff"
                    color="inherit"
                    underline="always"
                    sx={{
                      display: "block",
                      mt: 0.5,
                    }}
                  >
                    Перейти к тарифам
                  </Link>
                </Box>
              }
            >
              <MenuItem
                aria-label={color}
                selected={color === shown}
                onClick={(event) => {
                  event.stopPropagation();
                  if (message) {
                    setRestrictedColor(color);
                    return;
                  }
                  onChange(color);
                  setAnchor(null);
                  setRestrictedColor(null);
                }}
                sx={{
                  minHeight: 0,
                  width: LABEL_DOT_SIZE,
                  justifyContent: "center",
                  p: 0,
                }}
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
            </Tooltip>
          );
        })}
      </Menu>
    </>
  );
}
