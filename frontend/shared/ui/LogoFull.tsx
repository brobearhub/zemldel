"use client";

import Image from "next/image";
import { Box, type BoxProps, useTheme } from "@mui/material";

export type LogoFullProps = Omit<BoxProps, "children"> & {
  /** Высота логотипа (px). Ширина подстраивается под svg. */
  readonly height?: number;
  /** Алиас для `height` (для единообразия с `LogoIcon`). */
  readonly size?: number;
  /** Раскладка логотипа: текст снизу или справа (как в Figma). */
  readonly layout?: "bottom" | "right";
  /** Принудительный вариант: светлый (для тёмного фона) / тёмный (для светлого фона) / авто по теме. */
  readonly tone?: "auto" | "light" | "dark";
  /** Приоритетная загрузка (например, на auth-страницах). */
  readonly priority?: boolean;
};

const ASPECT_BY_LAYOUT = {
  // zemledel_logo_(dark|light).svg: 72.636 × 79.656 (Theme=*, Layout=bottom)
  bottom: 72.6364 / 79.6559,
  // zemledel_logo_right_(light|dark).svg: 141.725 × 46.145 (Theme=*, Layout=right)
  right: 141.7246 / 46.1452,
} as const;

export function LogoFull({
  height,
  size,
  layout = "bottom",
  tone = "auto",
  priority = false,
  sx,
  ...boxProps
}: LogoFullProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  const resolvedTone: "light" | "dark" =
    tone === "auto"
      ? // В светлой теме нужен тёмный логотип; в тёмной теме — светлый.
        isLight
        ? "dark"
        : "light"
      : tone;

  // В `public/` лежат SVG, названные по историческим причинам не строго по "тону":
  // - bottom: `*_dark.svg` (тёмный), `*_light.svg` (светлый)
  // - right: `*_right_light.svg` (тёмный текст), `*_right_dark.svg` (светлый текст)
  const src =
    layout === "right"
      ? resolvedTone === "light"
        ? "/zemledel_logo_right_dark.svg"
        : "/zemledel_logo_right_light.svg"
      : resolvedTone === "light"
        ? "/zemledel_logo_light.svg"
        : "/zemledel_logo_dark.svg";

  const resolvedHeight = height ?? size ?? 44;
  const width = Math.round(resolvedHeight * ASPECT_BY_LAYOUT[layout]);

  return (
    <Box
      {...boxProps}
      sx={{
        width,
        height: resolvedHeight,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...sx,
      }}
    >
      <Image
        src={src}
        alt=""
        width={width}
        height={resolvedHeight}
        priority={priority}
        style={{ objectFit: "contain" }}
      />
    </Box>
  );
}

