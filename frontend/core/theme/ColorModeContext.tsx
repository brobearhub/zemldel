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
import {
  DARK_PALETTE_STORAGE_KEY,
  DEFAULT_DARK_PALETTE,
  isDarkPaletteId,
  type DarkPaletteId,
} from "./dark-palettes";

export const COLOR_MODE_STORAGE_KEY = "color-mode";
export type ColorPreference = PaletteMode | "system";

type ColorModeContextValue = {
  mode: PaletteMode;
  preference: ColorPreference;
  darkPalette: DarkPaletteId;
  setDarkPalette: (palette: DarkPaletteId) => void;
  setPreference: (preference: ColorPreference) => void;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function isPaletteMode(value: string | null): value is ColorPreference {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredMode(): ColorPreference | null {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return isPaletteMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function persistMode(mode: ColorPreference) {
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
  const [preference, setPreferenceState] = useState<ColorPreference>("light");
  const [darkPalette, setDarkPaletteState] =
    useState<DarkPaletteId>(DEFAULT_DARK_PALETTE);

  useEffect(() => {
    try {
      const storedPalette = window.localStorage.getItem(
        DARK_PALETTE_STORAGE_KEY,
      );
      if (isDarkPaletteId(storedPalette)) setDarkPaletteState(storedPalette);
    } catch {
      // Storage is optional; the default palette works without it.
    }
    const stored = readStoredMode();
    if (stored) {
      setPreferenceState(stored);
      setModeState(
        stored === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : stored,
      );
    }
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setModeState(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  const setPreference = useCallback((next: ColorPreference) => {
    setPreferenceState(next);
    setModeState(
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next,
    );
    persistMode(next);
  }, []);

  const setMode = useCallback(
    (next: PaletteMode) => setPreference(next),
    [setPreference],
  );

  const toggleMode = useCallback(() => {
    setPreference(mode === "light" ? "dark" : "light");
  }, [mode, setPreference]);

  const setDarkPalette = useCallback((next: DarkPaletteId) => {
    if (!isDarkPaletteId(next)) return;
    setDarkPaletteState(next);
    try {
      window.localStorage.setItem(DARK_PALETTE_STORAGE_KEY, next);
    } catch {
      // Private mode / quota — keep the palette for this session.
    }
  }, []);

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      preference,
      darkPalette,
      setDarkPalette,
      setPreference,
      setMode,
      toggleMode,
    }),
    [
      mode,
      preference,
      darkPalette,
      setDarkPalette,
      setPreference,
      setMode,
      toggleMode,
    ],
  );

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within ColorModeProvider");
  }
  return ctx;
}
