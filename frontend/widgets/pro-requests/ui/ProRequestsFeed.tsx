"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { getServiceRequestStatusLabel, type ServiceRequestProDto } from "@/entities/service-request";

type Props = {
  initialItems: ServiceRequestProDto[];
};

type InboxStatus = "NEW" | "DISCUSSING";
type InboxSettings = { status: InboxStatus; categoryId: string | null };
type EligibleCategory = { id: string; name: string; slug: string };

const DEFAULT_SETTINGS: InboxSettings = { status: "NEW", categoryId: null };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function pickTitle(item: ServiceRequestProDto) {
  if (item.subjectType === "SERVICE") return item.serviceTitle ?? "Заявка по услуге";
  if (item.subjectType === "CATEGORY") return item.categoryName ? `Категория: ${item.categoryName}` : "Заявка по категории";
  return "Свободная заявка";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function ProRequestsFeed({ initialItems }: Props) {
  const [items, setItems] = useState<ServiceRequestProDto[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<InboxSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [eligibleCategories, setEligibleCategories] = useState<EligibleCategory[]>([]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const statusChips = useMemo(
    () =>
      [
        { id: "NEW" as const, label: "Новые" },
        { id: "DISCUSSING" as const, label: "Диалог" },
      ] satisfies Array<{ id: InboxStatus; label: string }>,
    []
  );

  async function refresh(nextSettings: InboxSettings = settings) {
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", nextSettings.status);
      params.set("categoryId", nextSettings.categoryId ?? "null");

      const res = await fetch(`/api/pro/service-requests/inbox?${params.toString()}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as ServiceRequestProDto[] | { error?: string } | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
            ? payload.error
            : "Не удалось загрузить ленту"
        );
      }
      setItems(payload as ServiceRequestProDto[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить ленту");
    }
  }

  async function loadEligibleCategories() {
    const res = await fetch("/api/pro/service-requests/eligible-categories", { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as EligibleCategory[] | { error?: string } | null;
    if (!res.ok) {
      throw new Error(
        payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
          ? payload.error
          : "Не удалось загрузить категории"
      );
    }
    const list = Array.isArray(payload) ? payload : [];
    setEligibleCategories(
      list
        .filter((c): c is EligibleCategory => Boolean(c) && typeof c.id === "string" && typeof c.name === "string" && typeof c.slug === "string")
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
        .sort((a, b) => a.slug.localeCompare(b.slug, "ru"))
    );
  }

  async function loadSettings(): Promise<InboxSettings> {
    const res = await fetch("/api/pro/inbox-settings", { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as InboxSettings | { error?: string } | null;
    if (!res.ok) {
      const serverError =
        payload && typeof payload === "object" && !Array.isArray(payload) && "error" in payload && typeof (payload as any).error === "string"
          ? String((payload as any).error)
          : null;
      throw new Error(
        serverError ?? "Не удалось загрузить настройки ленты"
      );
    }
    const obj = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Partial<InboxSettings>) : null;
    const status: InboxStatus = obj?.status === "DISCUSSING" ? "DISCUSSING" : "NEW";
    const categoryId = obj?.categoryId === null ? null : typeof obj?.categoryId === "string" && isUuid(obj.categoryId) ? obj.categoryId : null;
    return { status, categoryId };
  }

  async function saveSettings(next: InboxSettings) {
    const res = await fetch("/api/pro/inbox-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    const payload = (await res.json().catch(() => null)) as InboxSettings | { error?: string } | null;
    if (!res.ok) {
      const serverError =
        payload && typeof payload === "object" && !Array.isArray(payload) && "error" in payload && typeof (payload as any).error === "string"
          ? String((payload as any).error)
          : null;
      throw new Error(
        serverError ?? "Не удалось сохранить настройки"
      );
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setError(null);
      try {
        const [loadedSettings] = await Promise.all([loadSettings(), loadEligibleCategories()]);
        if (cancelled) return;
        setSettings(loadedSettings);
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
    void refresh(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, settings.status, settings.categoryId]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const t = window.setTimeout(() => {
      void saveSettings(settings).catch(() => {
      });
    }, 450);
    return () => {
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, settings.status, settings.categoryId]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Лента заявок
          </Typography>
          <Typography color="text.secondary">
            Здесь появляются заявки клиентов: по категориям ваших услуг и свободные заявки с главной страницы.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => void refresh()} sx={{ whiteSpace: "nowrap" }}>
          Обновить
        </Button>
      </Stack>

      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {statusChips.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              color={settings.status === chip.id ? "primary" : "default"}
              variant={settings.status === chip.id ? "filled" : "outlined"}
              onClick={() => setSettings((current) => ({ ...current, status: chip.id }))}
              sx={{
                height: 40,
                fontWeight: 700,
              }}
            />
          ))}
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
          <Button component={Link} href="/pro/services/create" variant="outlined" sx={{ whiteSpace: "nowrap" }}>
            Добавить категорию
          </Button>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="Без категории"
              color={settings.categoryId === null ? "primary" : "default"}
              variant={settings.categoryId === null ? "filled" : "outlined"}
              onClick={() => setSettings((current) => ({ ...current, categoryId: null }))}
            />
            {eligibleCategories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                color={settings.categoryId === cat.id ? "primary" : "default"}
                variant={settings.categoryId === cat.id ? "filled" : "outlined"}
                onClick={() => setSettings((current) => ({ ...current, categoryId: cat.id }))}
              />
            ))}
          </Stack>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            Пока нет заявок
          </Typography>
          <Typography color="text.secondary">Лента заполнится, когда клиенты создадут заявки.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1.25}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ md: "center" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} noWrap>
                      {pickTitle(item)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Создано: {formatDate(item.createdAt)} · Диалогов: {item.conversationsCount}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Chip
                      size="small"
                      label={getServiceRequestStatusLabel(item.status)}
                      color={item.status === "LOCKED" || item.status === "ACTIVE" ? "success" : item.status === "CLOSED" ? "default" : "primary"}
                      variant={item.status === "CLOSED" ? "outlined" : "filled"}
                    />
                    {item.isLocked ? (
                      <Chip size="small" variant="outlined" label="Взято другим провайдером" />
                    ) : (
                      <Button component={Link} href={`/pro/requests/${item.id}`} size="small" variant="contained">
                        Открыть
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {item.location ? (
                  <Typography variant="body2" color="text.secondary">
                    Локация: {item.location}
                  </Typography>
                ) : null}

                {item.message ? (
                  <Typography color="text.secondary">{item.message}</Typography>
                ) : item.isLocked ? (
                  <Typography variant="body2" color="text.secondary">
                    Заявка уже взята в работу.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

