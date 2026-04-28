"use client";

import { useEffect, useMemo, useState } from "react";
import type { RequestProDto } from "@/entities/request";
import { fetchEligibleCategories, fetchInbox, fetchInboxSettings, putInboxSettings } from "@/widgets/pro-requests/api/proRequestsFeedApi";
import { DEFAULT_SETTINGS, STATUS_CHIPS, type EligibleCategory, type InboxSettings, type InboxStatus, type ItemsByStatus } from "@/widgets/pro-requests/model/types";

type UseProRequestsFeedArgs = {
  initialItems: RequestProDto[];
  isDesktop: boolean;
};

export function useProRequestsFeed({ initialItems, isDesktop }: UseProRequestsFeedArgs) {
  const [itemsByStatus, setItemsByStatus] = useState<ItemsByStatus>({ NEW: initialItems, DISCUSSING: [] });
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<InboxSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [eligibleCategories, setEligibleCategories] = useState<EligibleCategory[]>([]);
  const [loadingByStatus, setLoadingByStatus] = useState<Record<InboxStatus, boolean>>({ NEW: false, DISCUSSING: false });
  const [loadedByStatus, setLoadedByStatus] = useState<Record<InboxStatus, boolean>>({ NEW: true, DISCUSSING: false });

  const statusChips = useMemo(() => STATUS_CHIPS, []);

  useEffect(() => {
    setItemsByStatus((current) => ({ ...current, NEW: initialItems }));
    setLoadedByStatus((current) => ({ ...current, NEW: true }));
  }, [initialItems]);

  async function refresh(nextSettings: InboxSettings = settings, mode: "single" | "both" = isDesktop ? "both" : "single") {
    setError(null);
    if (mode === "both") {
      setLoadingByStatus({ NEW: true, DISCUSSING: true });
    } else {
      setLoadingByStatus((current) => ({ ...current, [nextSettings.status]: true }));
    }
    try {
      if (mode === "both") {
        const [freshNew, freshDiscussing] = await Promise.all([
          fetchInbox("NEW", nextSettings.categoryId, nextSettings.dialogScope),
          fetchInbox("DISCUSSING", nextSettings.categoryId, nextSettings.dialogScope),
        ]);
        setItemsByStatus({ NEW: freshNew, DISCUSSING: freshDiscussing });
        setLoadedByStatus({ NEW: true, DISCUSSING: true });
        return;
      }

      const fresh = await fetchInbox(nextSettings.status, nextSettings.categoryId, nextSettings.dialogScope);
      setItemsByStatus((current) => ({ ...current, [nextSettings.status]: fresh }));
      setLoadedByStatus((current) => ({ ...current, [nextSettings.status]: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить ленту");
      if (mode === "both") {
        setLoadedByStatus({ NEW: true, DISCUSSING: true });
      } else {
        setLoadedByStatus((current) => ({ ...current, [nextSettings.status]: true }));
      }
    } finally {
      if (mode === "both") {
        setLoadingByStatus({ NEW: false, DISCUSSING: false });
      } else {
        setLoadingByStatus((current) => ({ ...current, [nextSettings.status]: false }));
      }
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
    void refresh(settings, isDesktop ? "both" : "single");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, settings.status, settings.categoryId, settings.dialogScope, isDesktop]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const t = window.setTimeout(() => {
      void putInboxSettings(settings).catch(() => {});
    }, 450);
    return () => {
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, settings.status, settings.categoryId, settings.dialogScope]);

  const mobileItems = itemsByStatus[settings.status] ?? [];
  const desktopHasAnyItems = (itemsByStatus.NEW?.length ?? 0) + (itemsByStatus.DISCUSSING?.length ?? 0) > 0;
  const desktopIsLoading = loadingByStatus.NEW || loadingByStatus.DISCUSSING;
  const mobileIsLoading = loadingByStatus[settings.status];
  const mobileHasLoaded = loadedByStatus[settings.status];

  return {
    statusChips,
    eligibleCategories,
    error,
    refresh,
    settings,
    setSettings,
    itemsByStatus,
    loadingByStatus,
    loadedByStatus,
    mobileItems,
    desktopHasAnyItems,
    desktopIsLoading,
    mobileIsLoading,
    mobileHasLoaded,
  };
}
