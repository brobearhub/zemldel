"use client";

import type { PaletteMode } from "@mui/material";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

type ColorModeContextValue = {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function ColorModeProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode: "light",
      setMode: () => {},
      toggleMode: () => {},
    }),
    [],
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within ColorModeProvider");
  }
  return ctx;
}

