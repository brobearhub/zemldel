"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAppSelector } from "@/core/store/hooks";
import type { ServiceDto, ServiceStatus } from "@/entities/service";
import { useConfirm } from "@/shared/ui/confirm";
import { serviceAttention } from "../lib/service-attention";
import { ProServiceManageCard } from "./ProServiceManageCard";

type Props = {
  initialServices: ServiceDto[];
};

type StatusFilter = "ALL" | "ATTENTION" | ServiceStatus;

const FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "PUBLISHED", label: "В каталоге" },
  { value: "ATTENTION", label: "Требуют внимания" },
  { value: "DRAFT", label: "Черновики" },
  { value: "ARCHIVED", label: "Архив" },
];

function matchesFilter(service: ServiceDto, filter: StatusFilter) {
  if (filter === "ALL") return true;
  if (filter === "ATTENTION") return serviceAttention(service) !== null;
  return service.status === filter;
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
  if (value === "created") return "Услуга сохранена и появилась в списке.";
  if (value === "updated") return "Изменения по услуге сохранены.";
  return null;
}

function publishedServiceIdFromQuery(params: { get: (name: string) => string | null }) {
  return params.get("notice") === "published" ? params.get("serviceId") : null;
}

export function ProServicesListClient({ initialServices }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  const confirm = useConfirm();
  const [services, setServices] = useState(() => sortServices(initialServices));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    publishedServiceIdFromQuery(searchParams) ? null : noticeFromQuery(searchParams.get("notice")),
  );
  const [publishedServiceId, setPublishedServiceId] = useState<string | null>(() =>
    publishedServiceIdFromQuery(searchParams),
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"status" | "delete" | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const activeMembership =
    user?.memberships.find((membership) => membership.providerId === user.activeProviderId) ??
    user?.memberships[0] ??
    null;

  const canArchiveOrDelete = user?.systemRole === "PLATFORM_ADMIN" || activeMembership?.role === "OWNER";
  const hasAnyServices = services.length > 0;

  useEffect(() => {
    const publishedId = publishedServiceIdFromQuery(searchParams);
    setPublishedServiceId(publishedId);
    setLinkCopied(false);
    setNotice(publishedId ? null : noticeFromQuery(searchParams.get("notice")));
  }, [searchParams]);

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return services.filter((service) => {
      const bySearch = normalizedSearch.length
        ? service.title.toLowerCase().includes(normalizedSearch)
        : true;
      return matchesFilter(service, filter) && bySearch;
    });
  }, [filter, search, services]);

  const stats = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        acc.ALL += 1;
        acc[service.status] += 1;
        if (serviceAttention(service)) acc.ATTENTION += 1;
        return acc;
      },
      { ALL: 0, ATTENTION: 0, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 } satisfies Record<StatusFilter, number>
    );
  }, [services]);

  const publishedService = publishedServiceId
    ? services.find((service) => service.id === publishedServiceId && service.status === "PUBLISHED") ?? null
    : null;

  function dismissPublishedBanner() {
    setPublishedServiceId(null);
    // Иначе ?notice=published вернёт баннер после перезагрузки или «назад».
    router.replace(pathname, { scroll: false });
  }

  function copyServiceLink(id: string, onCopied: () => void) {
    const url = `${window.location.origin}/services/${id}`;
    void navigator.clipboard.writeText(url).then(onCopied, () => setError("Не удалось скопировать ссылку"));
  }

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
    setBusyAction("status");
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
      if (status === "PUBLISHED") {
        setPublishedServiceId(id);
        setLinkCopied(false);
        setNotice(null);
      } else {
        setPublishedServiceId(null);
        setNotice(status === "ARCHIVED" ? "Услуга отправлена в архив." : "Услуга переведена в черновик.");
      }
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Не удалось обновить статус услуги");
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function deleteService(service: ServiceDto) {
    const ok = await confirm({
      title: `Удалить услугу "${service.title}"?`,
      description: "Это действие нельзя отменить.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!ok) return;

    setBusyId(service.id);
    setBusyAction("delete");
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
      setPublishedServiceId((id) => (id === service.id ? null : id));
      // Карточка с меню исчезла — возвращаем фокус на заголовок, а не в <body>.
      headingRef.current?.focus();
      setNotice(`Услуга "${service.title}" удалена.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить услугу");
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }


  const renderCreateTile = (placement: "mobile" | "desktop") => (
    <Box
      component={Link}
      href="/pro/services/create"
      sx={{
        display: placement === "mobile" ? { xs: "flex", sm: "none" } : { xs: "none", sm: "flex" },
        flexDirection: { xs: "row", sm: "column" },
        alignItems: "center",
        justifyContent: { xs: "flex-start", sm: "center" },
        gap: 1.5,
        minHeight: { xs: 72, sm: 320 },
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 3 },
        borderRadius: 1,
        border: 2,
        borderStyle: "dashed",
        borderColor: "primary.main",
        color: "text.primary",
        textDecoration: "none",
        textAlign: { xs: "left", sm: "center" },
        transition: "background-color 0.2s ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box
        sx={{
          width: { xs: 44, sm: 56 },
          height: { xs: 44, sm: 56 },
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "text.primary",
          color: "background.paper",
        }}
      >
        <AddRoundedIcon />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 800 }}>Новая услуга</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 220 }}>
          Можно сохранить черновиком и опубликовать позже
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Stack spacing={{ xs: 2, md: 3.5 }}>
      {publishedService ? (
        <Box
          role="status"
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { md: "center" },
            gap: { xs: 1.75, md: 4 },
            p: { xs: 2.25, md: 3.5 },
            pr: { xs: 6, md: 7 },
            borderRadius: 2.5,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.text.primary),
            color: "common.white",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                fontSize: { xs: 12, md: 13 },
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <CheckRoundedIcon sx={{ fontSize: 18 }} />
              Опубликовано
            </Typography>
            <Typography component="p" sx={{ fontSize: { xs: 20, md: 26 }, fontWeight: 800, lineHeight: 1.2 }}>
              «{publishedService.title}» теперь в каталоге
            </Typography>
            <Typography sx={{ fontSize: { xs: 14, md: 15 } }}>
              Поделитесь ссылкой с клиентами — заявки будут приходить в раздел «Заявки».
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              startIcon={linkCopied ? <CheckRoundedIcon /> : <LinkRoundedIcon />}
              onClick={() => copyServiceLink(publishedService.id, () => setLinkCopied(true))}
              sx={{
                flex: { xs: 1, md: "none" },
                minHeight: 48,
                bgcolor: "common.white",
                color: (theme) => (theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.text.primary),
                fontWeight: 800,
                "&:hover": { bgcolor: "grey.100" },
              }}
            >
              {linkCopied ? "Ссылка скопирована" : "Скопировать ссылку"}
            </Button>
            <Button
              component={Link}
              href="/pro/profile"
              variant="outlined"
              color="inherit"
              sx={{ minHeight: 48, borderColor: "currentColor" }}
            >
              Мой профиль
            </Button>
          </Stack>
          <IconButton
            aria-label="Скрыть уведомление"
            onClick={dismissPublishedBanner}
            sx={{ position: "absolute", top: 8, right: 8, color: "inherit" }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>
      ) : null}

      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 1.5 }}>
            <Typography
              component="h1"
              ref={headingRef}
              tabIndex={-1}
              sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 800, outline: "none" }}
            >
              Мои услуги
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: { xs: 14, md: 15 } }}>
              {stats.PUBLISHED} в каталоге
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, maxWidth: "100%" }}>
            <Box
              role="group"
              aria-label="Фильтр услуг"
              sx={{
                display: { xs: "none", md: "flex" },
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {FILTERS.map((option) => renderFilterChip(option))}
            </Box>
            <IconButton
              aria-label={searchOpen ? "Скрыть поиск" : "Поиск по названию"}
              aria-pressed={searchOpen}
              onClick={() => {
                if (searchOpen) setSearch("");
                setSearchOpen((open) => !open);
              }}
              sx={{ width: 44, height: 44, border: 1, borderColor: "divider", bgcolor: "background.paper" }}
            >
              {searchOpen ? <CloseRoundedIcon /> : <SearchRoundedIcon />}
            </IconButton>
          </Box>
        </Box>

        <Box
          role="group"
          aria-label="Фильтр услуг"
          sx={{
            display: { xs: "flex", md: "none" },
            gap: 1,
            overflowX: "auto",
            mx: -2,
            px: 2,
            pb: 0.25,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {FILTERS.map((option) => renderFilterChip(option))}
        </Box>

        {searchOpen ? (
          <TextField
            autoFocus
            fullWidth
            placeholder="Поиск по названию"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              htmlInput: { "aria-label": "Поиск по названию" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        ) : null}
      </Stack>

      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!hasAnyServices ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography component="h2" gutterBottom sx={{ fontWeight: 800 }}>
                У вас пока нет услуг
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
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
      ) : filteredServices.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                Услуг по текущему фильтру нет
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
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
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(auto-fill, minmax(250px, 1fr))" },
            gap: { xs: 2, md: 2.5 },
          }}
        >
          {renderCreateTile("mobile")}
          {filteredServices.map((service) => (
            <ProServiceManageCard
              key={service.id}
              service={service}
              highlighted={service.id === publishedServiceId}
              canArchiveOrDelete={canArchiveOrDelete}
              busy={busyId === service.id}
              deleting={busyId === service.id && busyAction === "delete"}
              onStatusChange={(status) => void patchStatus(service.id, status)}
              onDelete={() => void deleteService(service)}
              onCopyLink={() => copyServiceLink(service.id, () => setNotice("Ссылка на услугу скопирована."))}
            />
          ))}
          {renderCreateTile("desktop")}
        </Box>
      )}
    </Stack>
  );

  function renderFilterChip({ value, label }: { value: StatusFilter; label: string }) {
    const selected = filter === value;
    const count = stats[value];
    if (value === "ATTENTION" && count === 0 && !selected) return null;
    const attention = value === "ATTENTION";

    return (
      <Chip
        key={value}
        label={`${label} · ${count}`}
        clickable
        aria-pressed={selected}
        onClick={() => setFilter(value)}
        color={attention && !selected ? "warning" : "default"}
        variant={selected ? "filled" : "outlined"}
        sx={{
          flexShrink: 0,
          height: 40,
          borderRadius: 999,
          px: 0.5,
          fontWeight: selected || attention ? 700 : 600,
          ...(selected
            ? {
                bgcolor: "text.primary",
                color: "background.paper",
                "&:hover, &.Mui-focusVisible": { bgcolor: "text.primary" },
                "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              }
            : attention
              ? {
                  color: (theme) => (theme.palette.mode === "dark" ? theme.palette.warning.main : theme.palette.warning.dark),
                  borderColor: "warning.main",
                }
              : null),
        }}
      />
    );
  }
}
