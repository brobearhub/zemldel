import type { ServicePaletteColor } from "@/entities/service";

export const LABEL_COLORS = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
] as const satisfies readonly ServicePaletteColor[];

export const LABEL_DOT_SIZE = 18;
