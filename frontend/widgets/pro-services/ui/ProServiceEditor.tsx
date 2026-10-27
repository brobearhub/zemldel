"use client";

import { createContext, forwardRef, useContext, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter } from "next/navigation";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import {
  Alert,
  Box,
  Button,
  IconButton,
  ListSubheader,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  type PaperProps,
} from "@mui/material";
import { ServiceCard, toPlaceInput } from "@/entities/service";
import type { ServiceDto, ServicePaletteColor, ServicePlace, ServiceStatus } from "@/entities/service";
import { ServiceGeographyField, ServicePlaceChips } from "@/features/select-service-places";
import { STOCK_BADGE_MAX_LENGTH } from "../lib/stock-badge-suggestions";
import { DesktopLabelColor } from "./DesktopLabelColor";
import { MobileLabelColor } from "./MobileLabelColor";
import { StockBadgeField } from "./StockBadgeField";
import {
  formatServicePriceAmount,
  formatServicePriceStored,
  parseServicePriceAmount,
} from "@/shared/lib/money/service-price";
import type { AuthCity } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";

type Props = {
  mode: "create" | "edit";
  initialService?: ServiceDto;
  /** Город исполнителя с сервера: клиентская сессия после онбординга ещё без него. */
  initialProviderCity?: AuthCity | null;
};

type EditableServiceStatus = ServiceStatus;

type ServiceFormState = {
  categoryId: string;
  status: EditableServiceStatus;
  title: string;
  price: string;
  image: string;
  stockBadge: string;
  description: string;
  paletteColor: ServicePaletteColor | "";
};

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

const CategoryMenuCloseContext = createContext<(() => void) | null>(null);

const CategoryMenuPaper = forwardRef<HTMLDivElement, PaperProps>(function CategoryMenuPaper({ children, sx, ...props }, ref) {
  const closeMenu = useContext(CategoryMenuCloseContext);

  return (
    <Paper
      ref={ref}
      {...props}
      sx={[{ display: "flex", flexDirection: "column", overflow: "hidden" }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          width: "100%",
          boxSizing: "border-box",
          minHeight: 56,
          px: 2,
          bgcolor: "background.paper",
        }}
      >
        <Typography component="span" sx={{ fontSize: 16, lineHeight: 1.4, color: "text.primary" }}>
          Категория
        </Typography>
        <IconButton
          aria-label="Закрыть"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeMenu?.();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeMenu?.();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeMenu?.();
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>{children}</Box>
    </Paper>
  );
});

function ServiceEditorActions({
  publishDisabled,
  draftDisabled,
  pending,
  onPublish,
  onDraft,
}: {
  publishDisabled: boolean;
  draftDisabled: boolean;
  pending: ServiceStatus | null;
  onPublish: () => void;
  onDraft: () => void;
}) {
  return (
    <Stack direction={{ xs: "row", md: "column" }} spacing={2} useFlexGap>
      <Button
        type="button"
        variant="contained"
        loading={pending === "PUBLISHED"}
        disabled={publishDisabled && pending !== "PUBLISHED"}
        onClick={onPublish}
        sx={{
          order: { xs: 2, md: 1 },
          flex: { xs: 1, md: "unset" },
          bgcolor: "text.primary",
          color: "background.default",
          "&:hover": { bgcolor: "text.primary", filter: "brightness(1.08)" },
          "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "text.disabled" },
        }}
      >
        Опубликовать
      </Button>
      <Button
        type="button"
        variant="outlined"
        loading={pending === "DRAFT"}
        disabled={draftDisabled && pending !== "DRAFT"}
        onClick={onDraft}
        sx={{
          order: { xs: 1, md: 2 },
          flex: { xs: 1, md: "unset" },
          color: "text.primary",
          borderColor: "text.primary",
          "&:hover": { borderColor: "text.primary", bgcolor: "action.hover" },
        }}
      >
        Черновик
      </Button>
    </Stack>
  );
}

function providerCityPlace(city: AuthCity): ServicePlace {
  return {
    kind: "city",
    cityId: city.id,
    name: city.name,
    regionCode: city.regionCode,
    regionName: city.regionName,
  };
}

function createInitialState(service?: ServiceDto): ServiceFormState {
  return {
    categoryId: service?.categoryId ?? "",
    status: service?.status ?? "DRAFT",
    title: service?.title ?? "",
    price: parseServicePriceAmount(service?.price ?? ""),
    image: service?.image ?? "",
    stockBadge: (service?.stockBadge ?? "").slice(0, STOCK_BADGE_MAX_LENGTH),
    description: service?.description ?? "",
    paletteColor: service?.paletteColor ?? "primary",
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

export function ProServiceEditor({ mode, initialService, initialProviderCity = null }: Props) {
  const router = useRouter();
  const categoryMenuFullscreen = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const suppressCategoryMenuOpen = useRef(false);

  function closeCategoryMenu() {
    suppressCategoryMenuOpen.current = true;
    setCategoryMenuOpen(false);
    window.setTimeout(() => {
      suppressCategoryMenuOpen.current = false;
    }, 500);
  }
  const { user } = useAppSelector((state) => state.auth);
  const activeMembership =
    user?.memberships.find((membership) => membership.providerId === user.activeProviderId) ??
    user?.memberships[0] ??
    null;
  const providerCity = activeMembership?.providerCity ?? initialProviderCity;
  const placesTouched = useRef(mode !== "create");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ServiceFormState>(() => createInitialState(initialService));
  const [places, setPlaces] = useState<ServicePlace[]>(() => {
    if (mode === "edit") return initialService?.places ?? [];
    return providerCity ? [providerCityPlace(providerCity)] : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Why: busy общий для сохранения и работы с фото — спиннер только на нажатой кнопке.
  const [pendingAction, setPendingAction] = useState<ServiceStatus | "upload:icon" | "upload:add" | "deleteImage" | null>(null);
  const imagePickerSource = useRef<"icon" | "add" | null>(null);
  const [categories, setCategories] = useState<ServiceCategoryRow[] | null>(null);
  const [autofilledTitle, setAutofilledTitle] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);

  useEffect(() => {
    if (placesTouched.current) return;
    setPlaces(providerCity ? [providerCityPlace(providerCity)] : []);
  }, [providerCity]);

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

  const endpoint = mode === "create" ? "/api/pro/services" : `/api/pro/services/${initialService?.id}`;
  const method = mode === "create" ? "POST" : "PATCH";

  const payload = useMemo(() => {
    return {
      categoryId: form.categoryId,
      title: form.title,
      price: formatServicePriceStored(form.price),
      image: normalizeNullableString(form.image),
      stockBadge: normalizeNullableString(form.stockBadge),
      description: normalizeNullableString(form.description),
      paletteColor: normalizeNullableString(form.stockBadge)
        ? normalizeNullableString(form.paletteColor)
        : null,
      places: places.map(toPlaceInput),
    };
  }, [form, places]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];

    if (!form.title.trim()) {
      issues.push("Укажите название услуги.");
    }
    if (!form.price.trim()) {
      issues.push("Укажите цену.");
    }
    if (!form.categoryId) {
      issues.push("Выберите категорию.");
    }
    if (places.length === 0) {
      issues.push("Выберите город или область.");
    }

    return issues;
  }, [form, places.length]);

  // Why: черновик можно сохранить неполным, а опубликованная карточка без фото и описания выглядит пустой.
  const publishValidationIssues = useMemo(() => {
    const issues = [...validationIssues];

    if (!pendingImage && !form.image.trim()) {
      issues.push("Добавьте фото.");
    }
    if (!form.description.trim()) {
      issues.push("Добавьте описание.");
    }

    return issues;
  }, [form.description, form.image, pendingImage, validationIssues]);

  const previewItem = useMemo(() => {
    const previewImage = pendingImage?.previewUrl ?? normalizeNullableString(form.image);

    return {
      id: initialService?.id ?? "preview-service",
      title: form.title.trim() || "Название услуги появится здесь",
      image: previewImage,
      stockBadge: normalizeNullableString(form.stockBadge),
      paletteColor: normalizeNullableString(form.stockBadge) ? form.paletteColor || null : null,
      price: formatServicePriceStored(form.price) || "Цена не указана",
      provider: {
        id: activeMembership?.providerId ?? "preview-provider",
        name: activeMembership?.providerName ?? "Исполнитель",
        city: activeMembership?.providerCity ?? null,
      },
      rating: initialService?.rating ?? null,
      reviewCount: initialService?.reviewCount ?? null,
      places,
    };
  }, [
    activeMembership?.providerCity,
    activeMembership?.providerId,
    activeMembership?.providerName,
    form.image,
    form.paletteColor,
    form.price,
    form.stockBadge,
    form.title,
    initialService?.id,
    initialService?.rating,
    initialService?.reviewCount,
    pendingImage?.previewUrl,
    places,
  ]);

  async function submitForm(nextStatus: ServiceStatus) {
    const issues = nextStatus === "PUBLISHED" ? publishValidationIssues : validationIssues;
    if (issues.length > 0) {
      setError(issues[0]);
      return;
    }

    setBusy(true);
    setPendingAction(nextStatus);
    setError(null);

    try {
      const requestPayload = { ...payload, status: nextStatus };

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

      const savedId =
        mode === "create"
          ? responseBody &&
            typeof responseBody === "object" &&
            "id" in responseBody &&
            typeof responseBody.id === "string"
            ? responseBody.id
            : null
          : initialService?.id ?? null;
      const savedStatus = requestPayload.status;
      router.push(
        savedStatus === "PUBLISHED" && savedId
          ? `/pro/services/list?notice=published&serviceId=${savedId}`
          : `/pro/services/list?notice=${mode === "create" ? "created" : "updated"}`,
      );
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить услугу");
    } finally {
      setBusy(false);
      setPendingAction(null);
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
    setPendingAction("deleteImage");
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
      setPendingAction(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function openImagePicker(source: "icon" | "add" | null = null) {
    imagePickerSource.current = source;
    fileInputRef.current?.click();
  }

  function onPlacesChange(next: ServicePlace[]) {
    placesTouched.current = true;
    setPlaces(next);
  }

  const hasImage = Boolean(pendingImage || form.image.trim());
  const canRemoveImage = hasImage && (mode === "edit" || Boolean(pendingImage));

  function onSelectImage(file: File) {
    setError(null);

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    if (mode === "edit" && initialService?.id) {
      const source = imagePickerSource.current;
      setPendingAction(source ? `upload:${source}` : null);
      void (async () => {
        try {
          const uploadedUrl = await uploadImageForService(initialService.id, file);
          if (uploadedUrl) {
            setForm((current) => ({ ...current, image: uploadedUrl }));
          }
        } finally {
          setPendingAction(null);
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

  const priceLabel = formatServicePriceAmount(form.price);
  const draftDisabled = busy || validationIssues.length > 0;
  const publishDisabled = busy || publishValidationIssues.length > 0;

  return (
    <Stack spacing={{ xs: 2, md: 5 }} sx={{ width: "100%", maxWidth: { md: 1040 }, mx: "auto" }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", width: "100%", maxWidth: { xs: 440, md: "none" }, mx: { xs: "auto", md: 0 } }}
      >
        <IconButton
          aria-label="Назад"
          disabled={busy}
          onClick={() => router.push("/pro/services/list")}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography
          component="h1"
          sx={{ flex: 1, textAlign: "center", fontWeight: 700, pr: 5 }}
        >
          {mode === "create" ? "Новая услуга" : "Редактировать услугу"}
        </Typography>
      </Stack>
      <Stack spacing={1.5} sx={{ display: { md: "none" }, width: "100%", maxWidth: 440, mx: "auto" }}>
      <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
          
          <Box
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="Загрузить фото"
            aria-disabled={busy}
            onClick={() => {
              if (!busy) openImagePicker();
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || busy) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openImagePicker();
              }
            }}
            sx={{ width: "100%", cursor: busy ? "default" : "pointer", borderRadius: 1 }}
          >
            <ServiceCard item={previewItem} linked={false} />
          </Box>
          <Stack direction="row" sx={{ width: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <Button
              type="button"
              variant="text"
              color="error"
              loading={pendingAction === "deleteImage"}
              disabled={(busy && pendingAction !== "deleteImage") || !canRemoveImage}
              onClick={onRemoveImage}
              sx={{ color: "error.main", "&.Mui-disabled": { color: "text.disabled" } }}
            >
              Удалить
            </Button>
            <IconButton
              aria-label="Загрузить фото"
              loading={pendingAction === "upload:icon"}
              disabled={busy && pendingAction !== "upload:icon"}
              onClick={() => openImagePicker("icon")}
            >
              <PhotoCameraOutlinedIcon sx={{ color: "primary.main" }} />
            </IconButton>
            <Button
              type="button"
              variant="text"
              color="success"
              loading={pendingAction === "upload:add"}
              disabled={busy && pendingAction !== "upload:add"}
              onClick={() => openImagePicker("add")}
              sx={{ color: "success.main" }}
            >
              Добавить
            </Button>
          </Stack>
        </Stack>
      </Stack>
      <Paper
        component="form"
        onSubmit={onSubmit}
        elevation={0}
        sx={{
          overflow: "hidden",
          borderRadius: { xs: 0, md: 3 },
          bgcolor: "background.paper",
          position: { xs: "relative", md: "static" },
          left: { xs: "calc(50% - 50vw)", md: "auto" },
          width: { xs: "100vw", md: "auto" },
          maxWidth: { xs: "100vw", md: "none" },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.currentTarget.value = "";
            if (file) onSelectImage(file);
          }}
        />
        {error ? <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert> : null}

        {/* На мобиле колонки распадаются в один поток: display:contents отдаёт детей внешнему flex, порядок задаёт order. */}
        <Box
          sx={{
            display: { xs: "flex", md: "grid" },
            flexDirection: "column",
            gap: { xs: 2, md: 0 },
            gridTemplateColumns: { md: "minmax(0, 1fr) 340px" },
            alignItems: { md: "stretch" },
          }}
        >
          <Box
            sx={{
              display: { xs: "contents", md: "flex" },
              flexDirection: "column",
              gap: 3,
              p: { md: 3 },
              bgcolor: { md: "action.hover" },
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: { xs: "contents", md: "flex" },
                gap: 2,
                alignItems: "flex-start",
              }}
            >
            <Stack
              spacing={1.5}
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "flex-start",
                width: 320,
                flexShrink: 0,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Превью карточки
              </Typography>
              <Box
                role="button"
                tabIndex={busy ? -1 : 0}
                aria-label="Загрузить фото"
                aria-disabled={busy}
                onClick={() => {
                  if (!busy) openImagePicker();
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget || busy) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openImagePicker();
                  }
                }}
                sx={{
                  width: "100%",
                  cursor: busy ? "default" : "pointer",
                  borderRadius: 1,
                }}
              >
                <ServiceCard item={previewItem} linked={false} />
              </Box>
              {canRemoveImage ? (
                <Button
                  type="button"
                  variant="text"
                  color="error"
                  loading={pendingAction === "deleteImage"}
                  disabled={busy && pendingAction !== "deleteImage"}
                  onClick={onRemoveImage}
                >
                  Удалить фото
                </Button>
              ) : null}
            </Stack>
            <Box sx={{ display: { xs: "none", md: "block" }, flex: 1, minWidth: 0, pt: 4 }}>
              <ServicePlaceChips value={places} onChange={onPlacesChange} disabled={busy} />
            </Box>
            </Box>

            <Stack spacing={2} sx={{ order: { xs: 2, md: 0 }, px: { xs: 2, md: 0 }, pt: { xs: 2.5, md: 0 } }}>
              <CategoryMenuCloseContext.Provider value={closeCategoryMenu}>
              <TextField
                select
                size="small"
                label="Категория"
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                disabled={busy}
                required
                fullWidth
                slotProps={{
                  htmlInput: { "aria-label": "Категория" },
                  select: {
                    ...(categoryMenuFullscreen
                      ? {
                          open: categoryMenuOpen,
                          onOpen: () => {
                            if (suppressCategoryMenuOpen.current) return;
                            setCategoryMenuOpen(true);
                          },
                          onClose: () => setCategoryMenuOpen(false),
                        }
                      : {}),
                    MenuProps: categoryMenuFullscreen
                      ? {
                          marginThreshold: 0,
                          slots: { paper: CategoryMenuPaper },
                          slotProps: {
                            paper: {
                              sx: {
                                position: "fixed",
                                top: "0 !important",
                                left: "0 !important",
                                m: "0 !important",
                                width: "100vw !important",
                                maxWidth: "100vw !important",
                                height: "100dvh !important",
                                maxHeight: "100dvh !important",
                                borderRadius: 0,
                                transform: "none !important",
                              },
                            },
                            list: {
                              sx: { maxHeight: "none", py: 1 },
                            },
                          },
                        }
                      : undefined,
                  },
                }}
              >
                <MenuItem value="" sx={categoryMenuFullscreen ? { display: "none" } : undefined}>
                  Выберите категорию
                </MenuItem>
                {buildCategoryTree(categories ?? []).map(({ node, depth }) =>
                  depth === 0 ? (
                    <ListSubheader
                      key={`cat-${node.id}`}
                      disableSticky
                      sx={{
                        fontWeight: 900,
                        fontSize: 14,
                        lineHeight: 1.4,
                        py: 1,
                        whiteSpace: "normal",
                        color: "text.primary",
                        bgcolor: "transparent",
                      }}
                    >
                      {node.name}
                    </ListSubheader>
                  ) : (
                    <MenuItem
                      key={node.id}
                      value={node.id}
                      sx={{ whiteSpace: "normal", height: "auto", alignItems: "flex-start", py: 1 }}
                    >
                      {"—".repeat(depth)} {node.name}
                    </MenuItem>
                  )
                )}
              </TextField>
              </CategoryMenuCloseContext.Provider>
              <TextField
                size="small"
                label="Название"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                disabled={busy}
                required
                fullWidth
                slotProps={{ htmlInput: { "aria-label": "Название" } }}
              />
            </Stack>

            <Stack spacing={2.5} sx={{ order: { xs: 3, md: 0 }, px: { xs: 2, md: 0 }, pb: { xs: 2, md: 0 } }}>
              <TextField
                size="small"
                label="Описание"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                disabled={busy}
                fullWidth
                multiline
                minRows={4}
                placeholder="Коротко опишите ценность и содержание услуги..."
              />
            </Stack>
          </Box>

          <Box
            sx={{
              display: { xs: "contents", md: "flex" },
              flexDirection: "column",
              gap: 2.5,
              p: { md: 3 },
              minWidth: 0,
              height: { md: "100%" },
            }}
          >
            <Stack spacing={2} sx={{ order: { xs: 4, md: 0 }, px: { xs: 2, md: 0 }, pb: { xs: 2, md: 0 } }}>
              <TextField
                size="small"
                label="Цена"
                value={priceLabel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: parseServicePriceAmount(event.target.value),
                  }))
                }
                disabled={busy}
                required
                fullWidth
                placeholder="15 000"
                slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": "Цена" } }}
              />
              <Typography sx={{ display: { md: "none" }, fontWeight: 800 }}>География</Typography>
              <ServiceGeographyField
                value={places}
                onChange={onPlacesChange}
                disabled={busy}
                size="small"
                label="Локация"
                showChips={false}
                error={places.length === 0}
                helperText={places.length === 0 ? "Выберите город или область" : "Город или целая область. Можно несколько."}
              />
              <Box sx={{ display: { md: "none" } }}>
                <ServicePlaceChips value={places} onChange={onPlacesChange} disabled={busy} hideHeading />
              </Box>
              <Stack spacing={0.75}>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <StockBadgeField
                    value={form.stockBadge}
                    disabled={busy}
                    onChange={(stockBadge) => setForm((current) => ({ ...current, stockBadge }))}
                    endAdornment={
                      <DesktopLabelColor
                        value={form.paletteColor}
                        disabled={busy}
                        onChange={(color) => setForm((current) => ({ ...current, paletteColor: color }))}
                      />
                    }
                  />
                </Box>
                <Box sx={{ display: { md: "none" } }}>
                  <MobileLabelColor
                    badge={form.stockBadge}
                    onBadgeChange={(stockBadge) => setForm((current) => ({ ...current, stockBadge }))}
                    color={form.paletteColor}
                    disabled={busy}
                    onColorChange={(color) => setForm((current) => ({ ...current, paletteColor: color }))}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", pl: "10px" }}>
                  Максимум {STOCK_BADGE_MAX_LENGTH} символа
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ display: { xs: "none", md: "block" }, mt: "auto" }}>
              <ServiceEditorActions
                publishDisabled={publishDisabled}
                draftDisabled={draftDisabled}
                pending={pendingAction === "PUBLISHED" || pendingAction === "DRAFT" ? pendingAction : null}
                onPublish={() => {
                  setForm((current) => ({ ...current, status: "PUBLISHED" }));
                  void submitForm("PUBLISHED");
                }}
                onDraft={() => {
                  setForm((current) => ({ ...current, status: "DRAFT" }));
                  void submitForm("DRAFT");
                }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
      <Stack spacing={2} sx={{ display: { md: "none" }, width: "100%", maxWidth: 440, mx: "auto" }}>
        <ServiceCard item={previewItem} linked={false} />
        <ServiceEditorActions
          publishDisabled={publishDisabled}
          draftDisabled={draftDisabled}
          pending={pendingAction === "PUBLISHED" || pendingAction === "DRAFT" ? pendingAction : null}
          onPublish={() => {
            setForm((current) => ({ ...current, status: "PUBLISHED" }));
            void submitForm("PUBLISHED");
          }}
          onDraft={() => {
            setForm((current) => ({ ...current, status: "DRAFT" }));
            void submitForm("DRAFT");
          }}
        />
      </Stack>
    </Stack>
  );
}
