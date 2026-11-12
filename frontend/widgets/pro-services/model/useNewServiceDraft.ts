"use client";

import { useEffect, useRef, useState } from "react";
import {
  draftPhotoKey,
  readDraftPhotos,
  readNewServiceDraft,
  removeDraftPhotos,
  writeDraftPhotos,
  writeNewServiceDraft,
  type NewServiceDraft,
} from "../lib/new-service-draft";

type Options = {
  storageKey?: string;
  enabled: boolean;
  draft: NewServiceDraft;
  files: File[];
  onRestore: (draft: NewServiceDraft, files: File[]) => void;
};

export function useNewServiceDraft(options: Options) {
  const { storageKey, enabled, draft, files } = options;
  const latest = useRef(options);
  latest.current = options;
  const [loadedKey, setLoadedKey] = useState<string>();
  const [restored, setRestored] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const completed = useRef(false);
  const photoWrites = useRef(Promise.resolve());
  const lastFiles = useRef<File[]>();
  const ready = enabled && !!storageKey && loadedKey === storageKey;

  useEffect(() => {
    if (!enabled || !storageKey) return;
    let cancelled = false;
    completed.current = false;
    lastFiles.current = undefined;
    void (async () => {
      try {
        const stored = readNewServiceDraft(storageKey);
        if (stored) {
          let recovered: File[] = [];
          if (stored.photos.length) {
            try {
              const available = await readDraftPhotos(storageKey);
              recovered = stored.photos.flatMap((id) => {
                const file = available.find((item) => draftPhotoKey(item) === id);
                return file ? [file] : [];
              });
            } catch { /* Restore the form even when photo storage is unavailable. */ }
          }
          if (cancelled) return;
          latest.current.onRestore(stored, recovered);
          setRestored(true);
          if (recovered.length !== stored.photos.length) {
            setWarning("Черновик восстановлен, но часть фотографий недоступна. Добавьте их снова.");
          }
        }
      } catch {
        if (!cancelled) setWarning("Не удалось прочитать черновик в этом браузере.");
      } finally {
        if (!cancelled) setLoadedKey(storageKey);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, storageKey]);

  function persist(next = latest.current.draft) {
    if (!ready || !storageKey || completed.current) return;
    const hasContent = next.savedServiceId || next.photos.length || next.images.length ||
      next.allRussia || next.form.categoryId || next.form.title || next.form.price ||
      next.form.description || next.form.stockBadge || next.placesEdited;
    if (!hasContent && !saved && !restored) return;
    try {
      writeNewServiceDraft(storageKey, next);
      setSaved(true);
    } catch {
      setWarning("Не удалось сохранить черновик в этом браузере. Проверьте свободное место и настройки хранилища.");
    }
  }

  useEffect(() => {
    persist(draft);
    // persist reads the current readiness and storage key from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, ready, storageKey]);

  useEffect(() => {
    if (!ready || !storageKey || completed.current || lastFiles.current === files) return;
    const hadFiles = lastFiles.current?.length;
    lastFiles.current = files;
    if (!files.length && !hadFiles) return;
    const task = photoWrites.current.catch(() => undefined).then(() =>
      files.length ? writeDraftPhotos(storageKey, files) : removeDraftPhotos(storageKey),
    );
    photoWrites.current = task;
    void task.catch(() => {
      setWarning("Поля черновика сохранены, но фотографии сохранить не удалось. Перед уходом со страницы сохраните услугу на сервере.");
    });
  }, [files, ready, storageKey]);

  async function flush() {
    persist();
    await photoWrites.current.catch(() => undefined);
  }

  function saveProgress(savedServiceId: string, gallery?: Pick<NewServiceDraft, "images" | "photos">) {
    persist({ ...latest.current.draft, savedServiceId, ...gallery });
  }

  async function clearPublished(serviceId: string) {
    if (!storageKey) return;
    try {
      if (!enabled && readNewServiceDraft(storageKey)?.savedServiceId !== serviceId) return;
      completed.current = true;
      localStorage.removeItem(storageKey);
      await photoWrites.current.catch(() => undefined);
      await removeDraftPhotos(storageKey);
    } catch {
      setWarning("Услуга опубликована, но не удалось удалить локальный черновик.");
    }
  }

  return {
    loading: enabled && !!storageKey && !ready,
    restored,
    saved,
    warning,
    flush,
    saveProgress,
    clearPublished,
  };
}
