"use client";

import type { PaletteMode } from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export const COLOR_MODE_STORAGE_KEY = "color-mode";

type ColorModeContextValue = {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function isPaletteMode(value: string | null): value is PaletteMode {
  return value === "light" || value === "dark";
}

function readStoredMode(): PaletteMode | null {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return isPaletteMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function persistMode(mode: PaletteMode) {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Private mode / quota — theme still works for the session.
  }
}

export function ColorModeProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [mode, setModeState] = useState<PaletteMode>("light");

  useEffect(() => {
    const stored = readStoredMode();
    if (stored) {
      setModeState(stored);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setModeState("dark");
    }
  }, []);

  const setMode = useCallback((next: PaletteMode) => {
    setModeState(next);
    persistMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next = current === "light" ? "dark" : "light";
      persistMode(next);
      return next;
    });
  }, []);

  const value = useMemo<ColorModeContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
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
