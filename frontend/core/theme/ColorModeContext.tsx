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
export type ColorPreference = PaletteMode | "system";

type ColorModeContextValue = {
  mode: PaletteMode;
  preference: ColorPreference;
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

  useEffect(() => {
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

  const value = useMemo<ColorModeContextValue>(
    () => ({ mode, preference, setPreference, setMode, toggleMode }),
    [mode, preference, setPreference, setMode, toggleMode],
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
