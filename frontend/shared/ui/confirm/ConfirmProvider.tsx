"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmText: string;
  cancelText?: string;
  confirmColor?: "primary" | "secondary" | "info" | "success" | "warning" | "error" | "inherit";
  actions?: ReactNode;
};

type ConfirmRequest = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const current = queue[0] ?? null;

  const closeCurrent = useCallback((result: boolean) => {
    setQueue((prev) => {
      const head = prev[0];
      if (head) head.resolve(result);
      return prev.slice(1);
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setQueue((prev) => [...prev, { options, resolve }]);
    });
  }, []);

  const api = useMemo<ConfirmApi>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <ConfirmDialog
        open={Boolean(current)}
        title={current?.options.title ?? ""}
        description={current?.options.description}
        confirmText={current?.options.confirmText ?? "OK"}
        cancelText={current?.options.cancelText}
        confirmColor={current?.options.confirmColor}
        actions={current?.options.actions}
        onCancel={() => closeCurrent(false)}
        onConfirm={() => closeCurrent(true)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}

