import type { RequestStatus } from "@/entities/request";
import {
  createEmptyCadastralParts,
  isCadastralPartsComplete,
  isCadastralPartsPartial,
  joinCadastralParts,
  parseCadastralValue,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";

export type RequestCadastralActionId = "add" | "edit" | "delete";

const TERMINAL_STATUSES = new Set<RequestStatus>(["COMPLETED", "CANCELLED", "CLOSED"]);

export type RequestCadastralItemViewModel = {
  index: number;
  value: string;
};

export type RequestCadastralViewModel = {
  canMutate: boolean;
  items: RequestCadastralItemViewModel[];
};

export type RequestCadastralBehavior = {
  getViewModel: () => RequestCadastralViewModel;
  run: (action: {
    id: RequestCadastralActionId;
    payload?: { index?: number; parts?: CadastralNumberParts };
  }) => Promise<void> | void;
};

type CreateBehaviorInput = {
  status: RequestStatus;
  numbers: readonly string[];
  actions: {
    add: (value: string) => Promise<void> | void;
    edit: (index: number, value: string) => Promise<void> | void;
    delete: (index: number) => Promise<void> | void;
  };
};

function readParts(payload: unknown): CadastralNumberParts | null {
  if (!payload || typeof payload !== "object") return null;
  const parts = (payload as { parts?: unknown }).parts;
  if (!Array.isArray(parts) || parts.length !== 4) return null;
  return [
    typeof parts[0] === "string" ? parts[0] : "",
    typeof parts[1] === "string" ? parts[1] : "",
    typeof parts[2] === "string" ? parts[2] : "",
    typeof parts[3] === "string" ? parts[3] : "",
  ];
}

function readIndex(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const index = (payload as { index?: unknown }).index;
  return typeof index === "number" && Number.isInteger(index) && index >= 0 ? index : null;
}

function assertCompleteParts(parts: CadastralNumberParts): string {
  if (isCadastralPartsPartial(parts)) {
    throw new Error("Заполните все 4 части кадастрового номера.");
  }
  const value = joinCadastralParts(parts);
  if (!value) {
    throw new Error("Укажите кадастровый номер.");
  }
  return value;
}

export function createRequestCadastralBehavior(input: CreateBehaviorInput): RequestCadastralBehavior {
  return {
    getViewModel: () => ({
      canMutate: !TERMINAL_STATUSES.has(input.status),
      items: input.numbers.map((value, index) => ({ index, value })),
    }),
    run: async (action) => {
      if (action.id === "add") {
        const parts = readParts(action.payload);
        if (!parts) throw new Error("Укажите кадастровый номер.");
        await input.actions.add(assertCompleteParts(parts));
        return;
      }

      if (action.id === "edit") {
        const index = readIndex(action.payload);
        const parts = readParts(action.payload);
        if (index == null || !parts) throw new Error("Не удалось изменить кадастровый номер.");
        await input.actions.edit(index, assertCompleteParts(parts));
        return;
      }

      if (action.id === "delete") {
        const index = readIndex(action.payload);
        if (index == null) throw new Error("Не удалось удалить кадастровый номер.");
        await input.actions.delete(index);
      }
    },
  };
}

export function partsFromCadastralValue(value: string): CadastralNumberParts {
  return parseCadastralValue(value) ?? createEmptyCadastralParts();
}

export function canSubmitCadastralParts(parts: CadastralNumberParts): boolean {
  return isCadastralPartsComplete(parts);
}
