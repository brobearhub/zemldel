"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { CitySuggestItemDto } from "@/entities/city";
import {
  createEmptyCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request";

type Category = { id: string; name: string };
type Form = {
  message: string;
  cadastralNumbers: CadastralNumberParts[];
  category: Category | null;
};
type Draft = { form: Form; city?: CitySuggestItemDto | null; savedAt: number };
const EVENT = "request-form-draft-changed";
const MAX_AGE = 24 * 60 * 60 * 1000;
const fallback = new Map<string, Draft>();
function read(key: string): Draft | null {
  let value: Draft | null | undefined;
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    value = fallback.get(key);
    raw = null;
  }
  if (raw) {
    try {
      value = JSON.parse(raw) as Draft;
    } catch {
      return null;
    }
  }
  if (
    value &&
    typeof value.savedAt === "number" &&
    Date.now() - value.savedAt < MAX_AGE &&
    typeof value.form?.message === "string" &&
    Array.isArray(value.form.cadastralNumbers) &&
    value.form.cadastralNumbers.every(
      (parts) =>
        Array.isArray(parts) &&
        parts.length === 4 &&
        parts.every((part) => typeof part === "string"),
    )
  )
    return value;
  return null;
}

/** One draft per actor and category, shared by desktop and mobile forms in this tab. */
export function useRequestFormDraft(
  actor: string | null,
  scope: string,
  initialCategory: Category | null,
) {
  const key = actor ? `request-form:v1:${actor}:${scope}` : null;
  const empty = useCallback(
    (): Draft => ({
      form: {
        message: "",
        cadastralNumbers: [createEmptyCadastralParts()],
        category: initialCategory,
      },
      savedAt: Date.now(),
    }),
    [initialCategory],
  );
  const [state, setState] = useState<{ key: string | null; draft: Draft }>(
    () => ({ key, draft: empty() }),
  );
  const current = useRef(state);
  const defaults = useRef(empty);
  defaults.current = empty;

  useEffect(() => {
    const sync = () => {
      const next = {
        key,
        draft: (key ? read(key) : null) ?? defaults.current(),
      };
      current.current = next;
      setState(next);
    };
    sync();
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) sync();
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const update = useCallback(
    (transform: (value: Draft) => Draft) => {
      const previous =
        current.current.key === key
          ? current.current.draft
          : ((key ? read(key) : null) ?? defaults.current());
      const next = { ...transform(previous), savedAt: Date.now() };
      current.current = { key, draft: next };
      setState(current.current);
      if (!key) return;
      fallback.set(key, next);
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Keep editing when storage is unavailable. */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );
  const setForm = useCallback(
    (action: SetStateAction<Form>) =>
      update((d) => ({
        ...d,
        form: typeof action === "function" ? action(d.form) : action,
      })),
    [update],
  );
  const setCityOverride = useCallback(
    (city: CitySuggestItemDto | null) => update((d) => ({ ...d, city })),
    [update],
  );
  const clearDraft = useCallback(() => {
    if (key) {
      fallback.delete(key);
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Nonessential cleanup. */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    }
    current.current = { key, draft: defaults.current() };
    setState(current.current);
  }, [key]);
  const draft = state.key === key ? state.draft : defaults.current();
  return {
    form: draft.form,
    cityOverride: draft.city,
    setForm,
    setCityOverride,
    clearDraft,
  };
}
