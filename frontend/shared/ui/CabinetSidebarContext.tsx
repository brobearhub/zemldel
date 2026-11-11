"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const CabinetSidebarContext = createContext({
  expanded: false,
  setExpanded: (_expanded: boolean) => {},
  collapseRequest: 0,
  collapseSidebar: () => {},
});

export function CabinetSidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [collapseRequest, setCollapseRequest] = useState(0);
  const collapseSidebar = useCallback(() => {
    setCollapseRequest((value) => value + 1);
  }, []);

  return (
    <CabinetSidebarContext.Provider
      value={{ expanded, setExpanded, collapseRequest, collapseSidebar }}
    >
      {children}
    </CabinetSidebarContext.Provider>
  );
}

export function useCabinetSidebar() {
  return useContext(CabinetSidebarContext);
}
