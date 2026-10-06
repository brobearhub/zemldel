"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  ListSubheader,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ServiceCard } from "@/entities/service";
import type { ServiceDto, ServiceStatus } from "@/entities/service";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";
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
  const [autofilledTitle, setAutofilledTitle] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);

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
      const leaf = categories.find((c) => c.parentId != null) ?? null;
      const fallback = leaf ?? categories[0] ?? null;
      if (fallback) {
        setForm((current) => ({ ...current, categoryId: fallback.id }));
      }
    }
  }, [categories, form.categoryId]);

  useEffect(() => {
    if (!categories) return;
    if (!form.categoryId) return;

    const activeCategory = categories.find((c) => c.id === form.categoryId) ?? null;
    if (!activeCategory) return;
    if (activeCategory.parentId == null) return;

    const suggestedTitle = activeCategory.name;

    setForm((current) => {
      const currentTitleTrimmed = current.title.trim();
      const canOverwrite =
        currentTitleTrimmed.length === 0 || (autofilledTitle != null && current.title === autofilledTitle);

      if (!canOverwrite) return current;
      if (current.title === suggestedTitle) return current;

      return { ...current, title: suggestedTitle };
    });
    setAutofilledTitle(suggestedTitle);
  }, [autofilledTitle, categories, form.categoryId]);

  useEffect(() => {
    return () => {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

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

  const previewItem = useMemo(() => {
    const previewImage = pendingImage?.previewUrl ?? normalizeNullableString(form.image);

    return {
      id: initialService?.id ?? "preview-service",
      title: form.title.trim() || "Название услуги появится здесь",
      image: previewImage,
      stockBadge: normalizeNullableString(form.stockBadge),
      price: form.price.trim() || "Цена не указана",
      provider: {
        id: activeMembership?.providerId ?? "preview-provider",
        name: activeMembership?.providerName ?? "Провайдер",
        city: activeMembership?.providerCity ?? null,
      },
      rating: form.rating.trim().length ? Number(form.rating) : null,
      reviewCount: form.reviewCount.trim().length ? Math.trunc(Number(form.reviewCount)) : null,
      ctaText: form.ctaText.trim() || "Оставить заявку",
      ctaHref: normalizeNullableString(form.ctaHref),
    };
  }, [
    activeMembership?.providerCity,
    activeMembership?.providerId,
    activeMembership?.providerName,
    form.ctaHref,
    form.ctaText,
    form.image,
    form.price,
    form.rating,
    form.reviewCount,
    form.stockBadge,
    form.title,
    initialService?.id,
    pendingImage?.previewUrl,
  ]);

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

      if (mode === "create" && pendingImage) {
        const createdId =
          responseBody &&
          typeof responseBody === "object" &&
          "id" in responseBody &&
          typeof responseBody.id === "string"
            ? responseBody.id
            : null;

        if (!createdId) {
          throw new Error("Услуга сохранена, но не удалось определить ее id для загрузки изображения.");
        }

        const uploadedImageUrl = await uploadImageForService(createdId, pendingImage.file);
        if (uploadedImageUrl) {
          setForm((current) => ({ ...current, image: uploadedImageUrl }));
        }
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }

      router.push(`/pro/services/list?notice=${mode === "create" ? "created" : "updated"}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить услугу");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImageForService(serviceId: string, file: File): Promise<string | null> {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Поддерживаются только JPG, PNG или WebP.");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Максимальный размер изображения — 10 МБ.");
      return null;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/pro/services/${serviceId}/image`, {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json().catch(() => null)) as
        | { image?: string | null; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(payload?.error || "Не удалось загрузить изображение");
      }
      return payload && typeof payload === "object" && typeof payload.image === "string"
        ? payload.image
        : null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить изображение");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage() {
    if (mode !== "edit" || !initialService?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pro/services/${initialService.id}/image`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(payload?.error || "Не удалось удалить изображение");
      }
      setForm((current) => ({ ...current, image: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить изображение");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm();
  }

  function onSelectImage(file: File) {
    setError(null);

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    if (mode === "edit" && initialService?.id) {
      void (async () => {
        const uploadedUrl = await uploadImageForService(initialService.id, file);
        if (uploadedUrl) {
          setForm((current) => ({ ...current, image: uploadedUrl }));
        }
      })();
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
  }

  function onRemoveImage() {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
      return;
    }
    void deleteImage();
  }

  return (
    <Stack direction={{ xs: "column", xl: "row" }} spacing={3} sx={{
      alignItems: "flex-start"
    }}>
      <Box component="form" onSubmit={onSubmit} sx={{ flex: 1, width: "100%" }}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{
                  fontWeight: 800
                }}>
                  {title}
                </Typography>
                <Typography sx={{
                  color: "text.secondary"
                }}>
                  Соберите карточку услуги, выберите ее состояние в каталоге и подготовьте основу для
                  дальнейших заявок.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap sx={{
                flexWrap: "wrap"
              }}>
                <Chip
                  label={`Текущий статус: ${statusLabel(form.status)}`}
                  color={form.status === "PUBLISHED" ? "success" : form.status === "ARCHIVED" ? "default" : "warning"}
                  variant={form.status === "ARCHIVED" ? "outlined" : "filled"}
                />
                {activeMembership ? (
                  <Chip label={`Исполнитель: ${activeMembership.providerName}`} variant="outlined" />
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
              <Typography variant="subtitle1" sx={{
                fontWeight: 800
              }}>
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
                  {buildCategoryTree(categories ?? []).map(({ node, depth }) =>
                    depth === 0 ? (
                      <ListSubheader
                        key={`cat-${node.id}`}
                        disableSticky
                        sx={{
                          fontWeight: 900,
                          fontSize: 14,
                          lineHeight: 2.2,
                          color: "text.primary",
                          bgcolor: "transparent",
                        }}
                      >
                        {node.name}
                      </ListSubheader>
                    ) : (
                      <MenuItem key={node.id} value={node.id}>
                        {"—".repeat(depth)} {node.name}
                      </MenuItem>
                    )
                  )}
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

              {/* advance-based workflow removed */}

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
              <Typography variant="subtitle1" sx={{
                fontWeight: 800
              }}>
                Оформление карточки
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Stock badge"
                  value={form.stockBadge}
                  onChange={(event) => setForm((current) => ({ ...current, stockBadge: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  helperText='Например: "Осталось 3 слота"'
                />
              </Stack>

              <Stack spacing={1}>
                {pendingImage ? (
                  <Stack spacing={1}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Изображение выбрано и будет загружено после сохранения услуги.
                    </Typography>
                    <Box
                      component="img"
                      alt="Выбранное изображение услуги"
                      src={pendingImage.previewUrl}
                      sx={{
                        width: 300,
                        height: 300,
                        objectFit: "cover",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  </Stack>
                ) : form.image.trim().length ? (
                  <Stack spacing={1}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Изображение загружено.
                    </Typography>
                    <Box
                      component="img"
                      alt="Загруженное изображение услуги"
                      src={form.image}
                      sx={{
                        width: 300,
                        height: 300,
                        objectFit: "cover",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Изображение не загружено. Выберите файл кнопкой ниже.
                  </Typography>
                )}

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: { sm: "center" },
                    flexWrap: "wrap"
                  }}>
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={busy}
                  >
                    Загрузить изображение (JPG/PNG/WebP)
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.currentTarget.value = "";
                        if (f) onSelectImage(f);
                      }}
                    />
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    disabled={busy || (!pendingImage && !form.image.trim()) || (mode !== "edit" && !pendingImage)}
                    onClick={onRemoveImage}
                  >
                    Удалить изображение
                  </Button>
                </Stack>
              </Stack>

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

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, display: "none" }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 800
              }}>
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
                  slotProps={{ htmlInput: { min: 0, max: 5, step: 0.1 } }}
                  helperText="Необязательно. Диапазон от 0 до 5."
                />
                <TextField
                  label="Review count"
                  type="number"
                  value={form.reviewCount}
                  onChange={(event) => setForm((current) => ({ ...current, reviewCount: event.target.value }))}
                  disabled={busy}
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  helperText="Необязательно. Только целое число."
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 800
              }}>
                Действия
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} useFlexGap sx={{
                flexWrap: "wrap"
              }}>
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

      <Stack
        spacing={3}
        sx={{
          width: "100%",
          maxWidth: { xl: 380 },
          alignSelf: { xl: "flex-start" },
          position: { xl: "sticky" },
          top: { xl: SITE_STICKY_TOP_PX },
          maxHeight: { xl: `calc(100dvh - ${SITE_STICKY_TOP_PX}px)` },
          overflowY: { xl: "auto" },
          zIndex: 1,
        }}
      >
        <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{
                fontWeight: 800
              }}>
                Превью карточки
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Так выглядит публичная карточка услуги при текущем заполнении.
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ pointerEvents: "none" }}>
              <ServiceCard item={previewItem} />
            </Box>
          </Stack>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 800
            }}>
              Подсказка по состояниям
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Черновик: безопасный режим для подготовки карточки внутри provider.
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Публикация: услуга станет видна клиентам и сможет вести к заявке.
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Архив: услуга уйдет из публичной витрины, но останется в истории provider.
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}
