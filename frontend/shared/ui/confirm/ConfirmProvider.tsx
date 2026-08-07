"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmText: string;
  cancelText?: string;
  confirmColor?: "primary" | "secondary" | "info" | "success" | "warning" | "error" | "inherit";
  actions?: ReactNode;
};

export type ConfirmWithReasonOptions = ConfirmOptions & {
  reasonLabel?: string;
};

type ConfirmRequest =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "reason";
      options: ConfirmWithReasonOptions;
      resolve: (value: string | null) => void;
    };

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmWithReason: (options: ConfirmWithReasonOptions) => Promise<string | null>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const [reasonDraft, setReasonDraft] = useState("");
  const current = queue[0] ?? null;

  const closeCurrent = useCallback((result: boolean | string | null) => {
    setQueue((prev) => {
      const head = prev[0];
      if (!head) return prev;
      if (head.kind === "confirm") {
        head.resolve(Boolean(result));
      } else {
        head.resolve(typeof result === "string" || result === null ? result : null);
      }
      return prev.slice(1);
    });
    setReasonDraft("");
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setQueue((prev) => [...prev, { kind: "confirm", options, resolve }]);
    });
  }, []);

  const confirmWithReason = useCallback((options: ConfirmWithReasonOptions) => {
    return new Promise<string | null>((resolve) => {
      setReasonDraft("");
      setQueue((prev) => [...prev, { kind: "reason", options, resolve }]);
    });
  }, []);

  const api = useMemo<ConfirmApi>(() => ({ confirm, confirmWithReason }), [confirm, confirmWithReason]);

  const reasonTrimmed = reasonDraft.trim();
  const isReasonMode = current?.kind === "reason";

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
        reasonField={
          isReasonMode
            ? {
                label: current.options.reasonLabel ?? "Причина",
                value: reasonDraft,
                onChange: setReasonDraft,
              }
            : undefined
        }
        confirmDisabled={isReasonMode && reasonTrimmed.length === 0}
        onCancel={() => closeCurrent(isReasonMode ? null : false)}
        onConfirm={() => {
          if (isReasonMode) {
            if (!reasonTrimmed) return;
            closeCurrent(reasonTrimmed);
            return;
          }
          closeCurrent(true);
        }}
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

export function useConfirmWithReason() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirmWithReason must be used within ConfirmProvider");
  }
  return ctx.confirmWithReason;
}
