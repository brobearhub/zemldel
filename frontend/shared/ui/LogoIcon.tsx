"use client";

import Image from "next/image";
import { Box, type BoxProps, useTheme } from "@mui/material";

export type LogoIconProps = Omit<BoxProps, "children"> & {
  /** Размер квадрата (px). */
  readonly size?: number;
  /** Принудительный вариант: светлый (для тёмного фона) / тёмный (для светлого фона) / авто по теме. */
  readonly tone?: "auto" | "light" | "dark";
  /** Приоритетная загрузка (например, на auth-страницах). */
  readonly priority?: boolean;
};

export function LogoIcon({ size = 56, tone = "auto", priority = false, sx, ...boxProps }: LogoIconProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  // Вариант без текста.
  const src =
    tone === "light"
      ? "/zemledel_logo_img_light.svg"
      : tone === "dark"
        ? "/zemledel_logo_img_dark.svg"
        : isLight
          ? "/zemledel_logo_img_dark.svg"
          : "/zemledel_logo_img_light.svg";

  return (
    <Box
      {...boxProps}
      sx={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...sx,
      }}
    >
      <Image src={src} alt="" width={size} height={size} priority={priority} style={{ objectFit: "contain" }} />
    </Box>
  );
}

