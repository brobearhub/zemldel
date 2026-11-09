"use client";

import { Box, Stack } from "@mui/material";
import type { ServicePaletteColor } from "@/entities/service";
import {
  PlanFeatureGate,
  LITE_AND_BUSINESS,
  BUSINESS_ONLY,
} from "@/shared/ui/PlanFeatureGate";
import { StockBadgeField } from "./StockBadgeField";
import { LABEL_COLORS, LABEL_DOT_SIZE } from "./label-colors";

type Props = {
  badge: string;
  onBadgeChange: (value: string) => void;
  color: ServicePaletteColor | "";
  onColorChange: (color: ServicePaletteColor) => void;
  disabled: boolean;
  colorLocked?: boolean;
  badgeLocked?: boolean;
};

export function MobileLabelColor({
  badge,
  onBadgeChange,
  color,
  onColorChange,
  disabled,
  colorLocked = false,
  badgeLocked = false,
}: Props) {
  const shown = color || "primary";

  return (
    <Stack spacing={0.75}>
      <PlanFeatureGate
        message={badgeLocked ? LITE_AND_BUSINESS : null}
        label="Метка"
        fullWidth
      >
        <StockBadgeField
          value={badge}
          onChange={onBadgeChange}
          disabled={disabled}
          endAdornment={
            <Box
              aria-hidden
              sx={{
                width: LABEL_DOT_SIZE,
                height: LABEL_DOT_SIZE,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: `${shown}.main`,
              }}
            />
          }
        />
      </PlanFeatureGate>
      <Box
        role="group"
        aria-label="Цвет метки"
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          gap: 1.5,
          width: "100%",
        }}
      >
        {LABEL_COLORS.map((item) => (
          <PlanFeatureGate
            key={item}
            message={
              badgeLocked
                ? LITE_AND_BUSINESS
                : colorLocked && item !== "primary"
                  ? BUSINESS_ONLY
                  : null
            }
            label={`Цвет метки: ${item}`}
          >
            <Box
              component="button"
              type="button"
              aria-label={item}
              disabled={disabled}
              onClick={() => onColorChange(item)}
              sx={{
                width: LABEL_DOT_SIZE,
                height: LABEL_DOT_SIZE,
                p: 0,
                flexShrink: 0,
                borderRadius: "50%",
                border: "2px solid transparent",
                bgcolor: `${item}.main`,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
              }}
            />
          </PlanFeatureGate>
        ))}
      </Box>
    </Stack>
  );
}
