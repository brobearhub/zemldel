"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CitySuggestItemDto } from "@/entities/city";
import { CitySelectDialog } from "@/features/select-city/ui/CitySelectDialog";
import type { CitySelectScope } from "./use-selected-city";

type CitySelectContextValue = {
  openCitySelect: (scope: CitySelectScope) => void;
};

const CitySelectContext = createContext<CitySelectContextValue | null>(null);

export function CitySelectProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<CitySelectScope>("customer");

  const openCitySelect = useCallback((nextScope: CitySelectScope) => {
    setScope(nextScope);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const ctx = useMemo<CitySelectContextValue>(() => ({ openCitySelect }), [openCitySelect]);

  const handleSaved = useCallback((_city: CitySuggestItemDto | null) => {
    setOpen(false);
  }, []);

  return (
    <CitySelectContext.Provider value={ctx}>
      {children}
      {open ? <CitySelectDialog open={open} scope={scope} onClose={close} onSaved={handleSaved} /> : null}
    </CitySelectContext.Provider>
  );
}

export function useCitySelect(): CitySelectContextValue {
  const ctx = useContext(CitySelectContext);
  if (!ctx) {
    throw new Error("useCitySelect must be used within CitySelectProvider");
  }
  return ctx;
}

