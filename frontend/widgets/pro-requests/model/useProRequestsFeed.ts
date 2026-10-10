"use client";

import { useEffect, useMemo, useState } from "react";
import type { RequestProDto } from "@/entities/request";
import { fetchEligibleCategories, fetchInbox, fetchInboxSettings, putInboxSettings } from "@/widgets/pro-requests/api/proRequestsFeedApi";
import { DEFAULT_SETTINGS, STATUS_CHIPS, type EligibleCategory, type InboxSettings, type ItemsByStatus } from "@/widgets/pro-requests/model/types";

type UseProRequestsFeedArgs = {
  initialItems: RequestProDto[];
};

export function useProRequestsFeed({ initialItems }: UseProRequestsFeedArgs) {
  const [itemsByStatus, setItemsByStatus] = useState<ItemsByStatus>({ NEW: initialItems, DISCUSSING: [] });
  const [archiveItems, setArchiveItems] = useState<RequestProDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<InboxSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [eligibleCategories, setEligibleCategories] = useState<EligibleCategory[]>([]);

  const statusChips = useMemo(() => STATUS_CHIPS, []);

  useEffect(() => {
    setItemsByStatus((current) => ({ ...current, NEW: initialItems }));
  }, [initialItems]);

  async function refresh() {
    setError(null);
    try {
      // Why: колонка = статус заявки, поэтому активные диалоги и архив грузим сразу и раскладываем по status.
      const [freshNew, freshDiscussing, freshArchive] = await Promise.all([
        fetchInbox("NEW", "ACTIVE"),
        fetchInbox("DISCUSSING", "ACTIVE"),
        fetchInbox("DISCUSSING", "ARCHIVE"),
      ]);
      setItemsByStatus({ NEW: freshNew, DISCUSSING: freshDiscussing });
      setArchiveItems(freshArchive);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить ленту");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setError(null);
      try {
        const [loadedSettings, cats] = await Promise.all([fetchInboxSettings(), fetchEligibleCategories()]);
        if (cancelled) return;
        setSettings(loadedSettings);
        setEligibleCategories(cats);
        setSettingsLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
          setSettingsLoaded(true);
          setError(e instanceof Error ? e.message : "Не удалось загрузить данные ленты");
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const t = window.setTimeout(() => {
      void putInboxSettings(settings).catch(() => {});
    }, 450);
    return () => {
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, settings.status, settings.dialogScope]);

  return {
    statusChips,
    eligibleCategories,
    error,
    refresh,
    settings,
    setSettings,
    itemsByStatus,
    archiveItems,
  };
}
