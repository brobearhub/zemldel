"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ServiceCard } from "@/entities/service";
import type { ServiceDto, ServiceStatus } from "@/entities/service";
import { useAppSelector } from "@/core/store/hooks";

type Props = {
  mode: "create" | "edit";
  initialService?: ServiceDto;
};

type EditableServiceStatus = ServiceStatus;

type ServiceFormState = {
  categoryId: string;
  status: EditableServiceStatus;
  title: string;
  price: string;
  ctaText: string;
  ctaHref: string;
  image: string;
  stockBadge: string;
  description: string;
  highlight: string;
  badge: string;
  paletteColor: string;
  icon: string;
  rating: string;
  reviewCount: string;
};

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function statusLabel(status: ServiceStatus) {
  if (status === "PUBLISHED") return "Опубликовано";
  if (status === "ARCHIVED") return "Архив";
  return "Черновик";
}

function statusHelperText(status: ServiceStatus) {
  if (status === "PUBLISHED") {
    return "Карточка будет видна в публичной витрине и сможет собирать заявки.";
  }
  if (status === "ARCHIVED") {
    return "Услуга останется в истории provider, но исчезнет из публичной витрины.";
  }
  return "Черновик виден только внутри профессионального кабинета и подходит для подготовки карточки.";
}

const PALETTE_OPTIONS = [
  { value: "", label: "Без акцентного цвета" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
] as const;

const ICON_OPTIONS = [
  { value: "", label: "Без иконки" },
  { value: "map", label: "Map" },
  { value: "electric", label: "Electric" },
  { value: "architecture", label: "Architecture" },
] as const;

function createInitialState(service?: ServiceDto): ServiceFormState {
  return {
    categoryId: service?.categoryId ?? "",
    status: service?.status ?? "DRAFT",
    title: service?.title ?? "",
    price: service?.price ?? "",
    ctaText: service?.ctaText ?? "Оставить заявку",
    ctaHref: service?.ctaHref ?? "",
    image: service?.image ?? "",
    stockBadge: service?.stockBadge ?? "",
    description: service?.description ?? "",
    highlight: service?.highlight ?? "",
    badge: service?.badge ?? "",
    paletteColor: service?.paletteColor ?? "",
    icon: service?.icon ?? "",
    rating: service?.rating == null ? "" : String(service.rating),
    reviewCount: service?.reviewCount == null ? "" : String(service.reviewCount),
  };
}

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

function buildCategoryTree(categories: ServiceCategoryRow[]) {
  const byParent = new Map<string | null, ServiceCategoryRow[]>();
  for (const c of categories) {
    const key = c.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => {
      const soA = a.sortOrder ?? 0;
      const soB = b.sortOrder ?? 0;
      if (soA !== soB) return soA - soB;
      return a.name.localeCompare(b.name);
    });
  }
  const out: Array<{ node: ServiceCategoryRow; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      out.push({ node: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function ProServiceEditor({ mode, initialService }: Props) {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState<ServiceFormState>(() => createInitialState(initialService));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<ServiceCategoryRow[] | null>(null);

  useEffect(() => {
    fetch("/api/service-categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json() as Promise<ServiceCategoryRow[]>;
      })
      .then((data) => {
        setCategories(data);
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    if (categories && !form.categoryId) {
      const main = categories.find((c) => c.slug === "main") ?? null;
      const fallback = main ?? categories[0] ?? null;
      if (fallback) {
        setForm((current) => ({ ...current, categoryId: fallback.id }));
      }
    }
  }, [categories, form.categoryId]);

  const activeMembership =
    user?.memberships.find((membership) => membership.providerId === user.activeProviderId) ??
    user?.memberships[0] ??
    null;
  const canArchive = user?.systemRole === "PLATFORM_ADMIN" || activeMembership?.role === "OWNER";
  const showArchivedOption = mode === "edit" && (initialService?.status === "ARCHIVED" || canArchive);

  const title = mode === "create" ? "Новая услуга" : "Редактирование услуги";
  const endpoint = mode === "create" ? "/api/pro/services" : `/api/pro/services/${initialService?.id}`;
  const method = mode === "create" ? "POST" : "PATCH";

  const payload = useMemo(() => {
    const rating = form.rating.trim();
    const reviewCount = form.reviewCount.trim();

    return {
      categoryId: form.categoryId,
      title: form.title,
      price: form.price,
      ctaText: form.ctaText,
      ctaHref: normalizeNullableString(form.ctaHref),
      image: normalizeNullableString(form.image),
      stockBadge: normalizeNullableString(form.stockBadge),
      description: normalizeNullableString(form.description),
      highlight: normalizeNullableString(form.highlight),
      badge: normalizeNullableString(form.badge),
      paletteColor: normalizeNullableString(form.paletteColor),
      icon: normalizeNullableString(form.icon),
      rating: rating.length ? Number(rating) : null,
      reviewCount: reviewCount.length ? Math.trunc(Number(reviewCount)) : null,
    };
  }, [form]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];

    if (!form.title.trim()) {
      issues.push("Укажите название услуги.");
    }
    if (!form.price.trim()) {
      issues.push("Заполните цену или формат цены.");
    }
    if (!form.ctaText.trim()) {
      issues.push("Укажите текст CTA.");
    }

    const normalizedRating = form.rating.trim();
    if (normalizedRating.length) {
      const parsedRating = Number(normalizedRating);
      if (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        issues.push("Рейтинг должен быть числом от 0 до 5.");
      }
    }

    const normalizedReviewCount = form.reviewCount.trim();
    if (normalizedReviewCount.length) {
      const parsedReviewCount = Number(normalizedReviewCount);
      if (!Number.isInteger(parsedReviewCount) || parsedReviewCount < 0) {
        issues.push("Количество отзывов должно быть целым неотрицательным числом.");
      }
    }

    return issues;
  }, [form]);

  const previewItem = useMemo(
    () => ({
      id: initialService?.id ?? "preview-service",
      title: form.title.trim() || "Название услуги появится здесь",
      image: normalizeNullableString(form.image),
      stockBadge: normalizeNullableString(form.stockBadge),
      price: form.price.trim() || "Цена не указана",
      rating: form.rating.trim().length ? Number(form.rating) : null,
      reviewCount: form.reviewCount.trim().length ? Math.trunc(Number(form.reviewCount)) : null,
      ctaText: form.ctaText.trim() || "Оставить заявку",
      ctaHref: normalizeNullableString(form.ctaHref),
    }),
    [
      form.ctaHref,
      form.ctaText,
      form.image,
      form.price,
      form.rating,
      form.reviewCount,
      form.stockBadge,
      form.title,
      initialService?.id,
    ]
  );

  const statusOptions: ServiceStatus[] = showArchivedOption
    ? ["DRAFT", "PUBLISHED", "ARCHIVED"]
    : ["DRAFT", "PUBLISHED"];

  async function submitForm(nextStatus?: ServiceStatus) {
    if (validationIssues.length > 0) {
      setError(validationIssues[0]);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const requestPayload =
        mode === "create"
          ? { ...payload, status: nextStatus ?? form.status }
          : nextStatus
            ? { ...payload, status: nextStatus }
            : { ...payload, status: form.status };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const responseBody = (await response.json().catch(() => null)) as
        | { error?: string }
        | ServiceDto
        | null;

      if (!response.ok) {
        throw new Error(responseBody && typeof responseBody === "object" && "error" in responseBody
          ? responseBody.error ?? "Не удалось сохранить услугу"
          : "Не удалось сохранить услугу");
      }

      router.push(`/pro/services/list?notice=${mode === "create" ? "created" : "updated"}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить услугу");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm();
  }

  return (
    <Stack direction={{ xs: "column", xl: "row" }} spacing={3} alignItems="flex-start">
      <Box component="form" onSubmit={onSubmit} sx={{ flex: 1, width: "100%" }}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  {title}
                </Typography>
                <Typography color="text.secondary">
                  Соберите карточку услуги, выберите ее состояние в каталоге и подготовьте основу для
                  дальнейших заявок.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`Текущий статус: ${statusLabel(form.status)}`}
                  color={form.status === "PUBLISHED" ? "success" : form.status === "ARCHIVED" ? "default" : "warning"}
                  variant={form.status === "ARCHIVED" ? "outlined" : "filled"}
                />
                {activeMembership ? (
                  <Chip label={`Provider: ${activeMembership.providerName}`} variant="outlined" />
                ) : null}
              </Stack>

              {validationIssues.length > 0 ? (
                <Alert severity="warning">
                  Чтобы сохранить услугу, заполните обязательные поля. Сейчас осталось исправить:{" "}
                  {validationIssues[0]}
                </Alert>
              ) : null}

              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={800}>
                Основное
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  select
                  label="Категория"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  disabled={busy}
                  fullWidth
                >
                  {buildCategoryTree(categories ?? []).map(({ node, depth }) => (
                    <MenuItem key={node.id} value={node.id}>
                      {"—".repeat(depth)} {node.name} ({node.slug})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Статус"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as EditableServiceStatus,
                    }))
                  }
                  disabled={busy}
                  fullWidth
                  helperText={statusHelperText(form.status)}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {statusLabel(status)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                label="Название услуги"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                disabled={busy}
                required
                fullWidth
                helperText="Название попадет в каталог и в карточку услуги."
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Цена"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                  disabled={busy}
                  required
                  fullWidth
                  helperText='Например: "от 15 000 ₽"'
                />
                <TextField
                  label="Текст CTA"
                  value={form.ctaText}
                  onChange={(event) => setForm((current) => ({ ...current, ctaText: event.target.value }))}
                  disabled={busy}
                  required
                  fullWidth
                  helperText='Например: "Оставить заявку" или "Записаться"'
                />
              </Stack>

              <TextField
                label="Ссылка CTA"
                value={form.ctaHref}
                onChange={(event) => setForm((current) => ({ ...current, ctaHref: event.target.value }))}
                disabled={busy}
                fullWidth
                helperText="Можно оставить пустой, если действие будет вести в отдельный flow заявки."
              />

              <TextField
                label="Описание"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                disabled={busy}
                fullWidth
                multiline
                minRows={5}
                helperText="Коротко опишите ценность и содержание услуги."
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={800}>
                Оформление карточки
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Highlight"
                  value={form.highlight}
                  onChange={(event) => setForm((current) => ({ ...current, highlight: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  helperText="Фрагмент текста, который можно выделить в UI."
                />
                <TextField
                  label="Badge"
                  value={form.badge}
                  onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  helperText='Например: "90% выгода"'
                />
                <TextField
                  label="Stock badge"
                  value={form.stockBadge}
                  onChange={(event) => setForm((current) => ({ ...current, stockBadge: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  helperText='Например: "Осталось 3 слота"'
                />
              </Stack>

              <TextField
                label="Изображение"
                value={form.image}
                onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
                disabled={busy}
                fullWidth
                helperText="URL изображения для карточки. Если оставить пустым, будет показан плейсхолдер."
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  select
                  label="Palette color"
                  value={form.paletteColor}
                  onChange={(event) => setForm((current) => ({ ...current, paletteColor: event.target.value }))}
                  disabled={busy}
                  fullWidth
                >
                  {PALETTE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Icon"
                  value={form.icon}
                  onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                  disabled={busy}
                  fullWidth
                >
                  {ICON_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={800}>
                Социальное доказательство
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Rating"
                  type="number"
                  value={form.rating}
                  onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  helperText="Необязательно. Диапазон от 0 до 5."
                />
                <TextField
                  label="Review count"
                  type="number"
                  value={form.reviewCount}
                  onChange={(event) => setForm((current) => ({ ...current, reviewCount: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Необязательно. Только целое число."
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={800}>
                Действия
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button type="submit" variant="contained" disabled={busy || validationIssues.length > 0}>
                  {mode === "create" ? "Сохранить услугу" : "Сохранить изменения"}
                </Button>

                {form.status !== "DRAFT" ? (
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={busy || validationIssues.length > 0}
                    onClick={() => {
                      setForm((current) => ({ ...current, status: "DRAFT" }));
                      void submitForm("DRAFT");
                    }}
                  >
                    Сохранить как черновик
                  </Button>
                ) : null}

                {form.status !== "PUBLISHED" ? (
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={busy || validationIssues.length > 0}
                    onClick={() => {
                      setForm((current) => ({ ...current, status: "PUBLISHED" }));
                      void submitForm("PUBLISHED");
                    }}
                  >
                    Сохранить и опубликовать
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="text"
                  disabled={busy}
                  onClick={() => router.push("/pro/services/list")}
                >
                  Отмена
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Stack spacing={3} sx={{ width: "100%", maxWidth: { xl: 380 } }}>
        <Paper variant="outlined" sx={{ p: 2.5, position: { xl: "sticky" }, top: { xl: 112 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                Превью карточки
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Так выглядит публичная карточка услуги при текущем заполнении.
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ pointerEvents: "none" }}>
              <ServiceCard item={previewItem} />
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={800}>
              Подсказка по состояниям
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Черновик: безопасный режим для подготовки карточки внутри provider.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Публикация: услуга станет видна клиентам и сможет вести к заявке.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Архив: услуга уйдет из публичной витрины, но останется в истории provider.
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}
