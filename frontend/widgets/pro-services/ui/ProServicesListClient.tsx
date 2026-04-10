"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@/core/store/hooks";
import type { ServiceCreateDto, ServiceDto, ServiceStatus } from "@/entities/service";

type Props = {
  initialServices: ServiceDto[];
};

type StatusFilter = "ALL" | ServiceStatus;

function statusLabel(status: ServiceStatus) {
  if (status === "PUBLISHED") return "Опубликовано";
  if (status === "ARCHIVED") return "Архив";
  return "Черновик";
}

function statusColor(status: ServiceStatus): "default" | "success" | "warning" {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "default";
  return "warning";
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length ? normalized : null;
}

function sortServices(list: ServiceDto[]) {
  return [...list].sort((left, right) => {
    const leftSlug = left.category?.slug ?? "";
    const rightSlug = right.category?.slug ?? "";
    if (leftSlug !== rightSlug) {
      return leftSlug.localeCompare(rightSlug);
    }
    return left.title.localeCompare(right.title, "ru");
  });
}

function noticeFromQuery(value: string | null) {
  if (value === "created") return "Услуга сохранена. Теперь она появилась в рабочем списке provider.";
  if (value === "updated") return "Изменения по услуге сохранены.";
  return null;
}

function buildDuplicatePayload(service: ServiceDto): ServiceCreateDto {
  return {
    categoryId: service.categoryId,
    status: "DRAFT",
    title: `${service.title} (копия)`,
    price: service.price,
    ctaText: service.ctaText,
    ctaHref: normalizeNullableString(service.ctaHref),
    image: normalizeNullableString(service.image),
    stockBadge: normalizeNullableString(service.stockBadge),
    description: normalizeNullableString(service.description),
    highlight: normalizeNullableString(service.highlight),
    badge: normalizeNullableString(service.badge),
    paletteColor: service.paletteColor,
    icon: service.icon,
    rating: null,
    reviewCount: null,
  };
}

export function ProServicesListClient({ initialServices }: Props) {
  const searchParams = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const [services, setServices] = useState(() => sortServices(initialServices));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => noticeFromQuery(searchParams.get("notice")));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const activeMembership =
    user?.memberships.find((membership) => membership.providerId === user.activeProviderId) ??
    user?.memberships[0] ??
    null;

  const canArchiveOrDelete = user?.systemRole === "PLATFORM_ADMIN" || activeMembership?.role === "OWNER";
  const hasAnyServices = services.length > 0;

  useEffect(() => {
    setNotice(noticeFromQuery(searchParams.get("notice")));
  }, [searchParams]);

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return services.filter((service) => {
      const byStatus = filter === "ALL" ? true : service.status === filter;
      const bySearch = normalizedSearch.length
        ? service.title.toLowerCase().includes(normalizedSearch)
        : true;
      return byStatus && bySearch;
    });
  }, [filter, search, services]);

  const stats = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        acc.ALL += 1;
        acc[service.status] += 1;
        return acc;
      },
      { ALL: 0, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 } satisfies Record<StatusFilter, number>
    );
  }, [services]);

  async function refresh() {
    const response = await fetch("/api/pro/services");
    const payload = (await response.json().catch(() => null)) as ServiceDto[] | { error?: string } | null;

    if (!response.ok) {
      throw new Error(
        payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
          ? payload.error
          : "Не удалось обновить список услуг"
      );
    }

    setServices(sortServices(payload as ServiceDto[]));
  }

  async function patchStatus(id: string, status: ServiceStatus) {
    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/pro/services/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | ServiceDto | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось обновить статус услуги"
            : "Не удалось обновить статус услуги"
        );
      }

      setServices((current) =>
        sortServices(current.map((service) => (service.id === id ? (payload as ServiceDto) : service)))
      );
      setNotice(
        status === "PUBLISHED"
          ? "Услуга опубликована и доступна в публичной витрине."
          : status === "ARCHIVED"
            ? "Услуга отправлена в архив."
            : "Услуга переведена в черновик."
      );
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Не удалось обновить статус услуги");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateService(service: ServiceDto) {
    setBusyId(service.id);
    setError(null);

    try {
      const response = await fetch("/api/pro/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildDuplicatePayload(service)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | ServiceDto | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось дублировать услугу"
            : "Не удалось дублировать услугу"
        );
      }

      await refresh();
      setNotice("Черновик-копия создан. При необходимости откройте его и доработайте перед публикацией.");
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Не удалось дублировать услугу");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteService(service: ServiceDto) {
    if (!confirm(`Удалить услугу "${service.title}"?`)) return;

    setBusyId(service.id);
    setError(null);

    try {
      const response = await fetch(`/api/pro/services/${service.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | { ok?: true } | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error ?? "Не удалось удалить услугу"
            : "Не удалось удалить услугу"
        );
      }

      setServices((current) => current.filter((item) => item.id !== service.id));
      setNotice(`Услуга "${service.title}" удалена.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить услугу");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Рабочий поток услуг
            </Typography>
            <Typography color="text.secondary">
              {activeMembership
                ? `Вы работаете в контексте provider "${activeMembership.providerName}".`
                : "Управление услугами привязано к активному provider."}{" "}
              Держите в черновиках заготовки, публикуйте готовые карточки и архивируйте неактуальные.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            {([
              ["ALL", "Всего услуг"],
              ["DRAFT", "Черновики"],
              ["PUBLISHED", "Опубликованные"],
              ["ARCHIVED", "Архив"],
            ] as const).map(([status, label]) => (
              <Paper
                key={status}
                variant="outlined"
                sx={{
                  p: 1.5,
                  minWidth: 0,
                  flex: 1,
                  borderColor: filter === status ? "primary.main" : "divider",
                }}
              >
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.06em" }}>
                  {label}
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {stats[status]}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <TextField
          label="Поиск по названию"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((status) => (
            <Chip
              key={status}
              label={
                status === "ALL"
                  ? "Все"
                  : status === "DRAFT"
                    ? "Черновики"
                    : status === "PUBLISHED"
                      ? "Опубликованные"
                      : "Архив"
              }
              color={filter === status ? "primary" : "default"}
              variant={filter === status ? "filled" : "outlined"}
              onClick={() => setFilter(status)}
            />
          ))}
        </Stack>
      </Stack>

      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!hasAnyServices ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography fontWeight={800} gutterBottom>
                У вас пока нет услуг
              </Typography>
              <Typography color="text.secondary">
                Начните с черновика, а потом опубликуйте готовую карточку. После публикации услуга
                станет основой для будущих заявок.
              </Typography>
            </Box>

            <Box>
              <Button component={Link} href="/pro/services/create" variant="contained">
                Создать первую услугу
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      <Stack spacing={2}>
        {filteredServices.map((service) => (
          <Paper key={service.id} variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="h6" fontWeight={700}>
                      {service.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={statusLabel(service.status)}
                      color={statusColor(service.status)}
                      variant={service.status === "ARCHIVED" ? "outlined" : "filled"}
                    />
                  </Stack>
                  <Typography color="text.secondary">
                    {service.price} · {service.category?.name ?? service.category?.slug ?? "категория"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CTA: {service.ctaText}
                    {service.reviewCount ? ` · ${service.reviewCount} отзывов` : ""}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    component={Link}
                    href={`/pro/services/${service.id}/edit`}
                    variant="outlined"
                    size="small"
                    disabled={busyId === service.id}
                  >
                    Редактировать
                  </Button>

                  {service.status === "DRAFT" ? (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={busyId === service.id}
                      onClick={() => patchStatus(service.id, "PUBLISHED")}
                    >
                      Опубликовать
                    </Button>
                  ) : null}

                  {service.status === "PUBLISHED" ? (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={busyId === service.id}
                      onClick={() => patchStatus(service.id, "DRAFT")}
                    >
                      В черновик
                    </Button>
                  ) : null}

                  {service.status !== "ARCHIVED" && canArchiveOrDelete ? (
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      disabled={busyId === service.id}
                      onClick={() => patchStatus(service.id, "ARCHIVED")}
                    >
                      Архивировать
                    </Button>
                  ) : null}

                  {service.status === "ARCHIVED" ? (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={busyId === service.id}
                      onClick={() => patchStatus(service.id, "DRAFT")}
                    >
                      Вернуть в черновик
                    </Button>
                  ) : null}

                  <Button
                    variant="outlined"
                    size="small"
                    disabled={busyId === service.id}
                    onClick={() => duplicateService(service)}
                  >
                    Дублировать
                  </Button>

                  {canArchiveOrDelete ? (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={busyId === service.id}
                      onClick={() => deleteService(service)}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </Stack>
              </Stack>

              {service.description ? (
                <Typography color="text.secondary">{service.description}</Typography>
              ) : null}
            </Stack>
          </Paper>
        ))}

        {filteredServices.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography fontWeight={700} gutterBottom>
                  Услуг по текущему фильтру нет
                </Typography>
                <Typography color="text.secondary">
                  Попробуйте изменить статусный фильтр или строку поиска, чтобы вернуться к полному
                  рабочему списку.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setFilter("ALL");
                    setSearch("");
                  }}
                >
                  Сбросить фильтры
                </Button>
                <Button component={Link} href="/pro/services/create" variant="contained">
                  Создать услугу
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Stack>
  );
}
