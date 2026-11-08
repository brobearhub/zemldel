"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter } from "next/navigation";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import {
  Alert,
  Checkbox,
  FormControlLabel,
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
import type {
  ServiceDto,
  ServiceCategory,
  ServicePaletteColor,
  ServicePlace,
  ServiceStatus,
} from "@/entities/service";
import {
  ServiceGeographyField,
  ServicePlaceChips,
} from "@/features/select-service-places";
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
  categories: ServiceCategory[];
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

const CategoryMenuPaper = forwardRef<HTMLDivElement, PaperProps>(
  function CategoryMenuPaper({ children, sx, ...props }, ref) {
    const closeMenu = useContext(CategoryMenuCloseContext);

    return (
      <Paper
        ref={ref}
        {...props}
        sx={[
          { display: "flex", flexDirection: "column", overflow: "hidden" },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
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
          <Typography
            component="span"
            sx={{ fontSize: "1rem", lineHeight: 1.5, color: "text.primary" }}
          >
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
  },
);

function ServiceEditorActions({
  publishDisabled,
  needsPhoto,
  draftDisabled,
  pending,
  onPublish,
  onPickPhoto,
  onDraft,
}: {
  publishDisabled: boolean;
  needsPhoto: boolean;
  draftDisabled: boolean;
  pending: ServiceStatus | null;
  onPublish: () => void;
  onPickPhoto: () => void;
  onDraft: () => void;
}) {
  return (
    <Stack direction={{ xs: "row", md: "column" }} spacing={2} useFlexGap>
      <Button
        type="button"
        variant="contained"
        loading={pending === "PUBLISHED"}
        // Why: когда для публикации не хватает только фото, кнопка сама открывает выбор фото.
        disabled={publishDisabled && !needsPhoto && pending !== "PUBLISHED"}
        onClick={needsPhoto ? onPickPhoto : onPublish}
        sx={{
          order: { xs: 2, md: 1 },
          flex: { xs: 1, md: "unset" },
          bgcolor: "text.primary",
          color: "background.default",
          "&:hover": { bgcolor: "text.primary", filter: "brightness(1.08)" },
          "&.Mui-disabled": {
            bgcolor: "action.disabledBackground",
            color: "text.disabled",
          },
        }}
      >
        {needsPhoto ? "Загрузите фото" : "Опубликовать"}
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

function buildCategoryTree(categories: ServiceCategory[]) {
  const byParent = new Map<string | null, ServiceCategory[]>();
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
  const out: Array<{ node: ServiceCategory; depth: number }> = [];
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

export function ProServiceEditor({
  mode,
  initialService,
  categories,
  initialProviderCity = null,
}: Props) {
  const router = useRouter();
  const categoryMenuFullscreen = useMediaQuery((theme) =>
    theme.breakpoints.down("md"),
  );
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
    user?.memberships.find(
      (membership) => membership.providerId === user.activeProviderId,
    ) ??
    user?.memberships[0] ??
    null;
  const providerCity = activeMembership?.providerCity ?? initialProviderCity;
  const [plan, setPlan] = useState("BUSINESS");
  const [photoLimit, setPhotoLimit] = useState(10);
  const [regionLimit, setRegionLimit] = useState<number | null>(null);
  const [allRussia, setAllRussia] = useState(
    initialService?.allRussia ?? false,
  );
  const planProviderId =
    activeMembership?.providerId ?? initialService?.provider?.id;
  useEffect(() => {
    if (!planProviderId) return;
    let cancelled = false;
    fetch(`/api/billing/providers/${planProviderId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          entitlementPlan: string;
          limits: { photos: number; regions: number | null };
        };
        if (!cancelled) {
          setPlan(data.entitlementPlan);
          setPhotoLimit(data.limits.photos);
          setRegionLimit(data.limits.regions);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [planProviderId]);
  const placesTouched = useRef(mode !== "create");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ServiceFormState>(() =>
    createInitialState(initialService),
  );
  const [places, setPlaces] = useState<ServicePlace[]>(() => {
    if (mode === "edit") return initialService?.places ?? [];
    return providerCity ? [providerCityPlace(providerCity)] : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Why: busy общий для сохранения и работы с фото — спиннер только на нажатой кнопке.
  const [pendingAction, setPendingAction] = useState<
    ServiceStatus | "upload:icon" | "upload:add" | "deleteImage" | null
  >(null);
  const imagePickerSource = useRef<"icon" | "add" | null>(null);
  const [autofilledTitle, setAutofilledTitle] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(() =>
    initialService?.images?.length
      ? initialService.images
      : initialService?.image
        ? [initialService.image]
        : [],
  );
  const [pendingImages, setPendingImages] = useState<
    Array<{ file: File; previewUrl: string }>
  >([]);
  const pendingImage = pendingImages[0] ?? null;
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  const savedServiceId = useRef(
    mode === "edit" ? (initialService?.id ?? null) : null,
  );
  const imageCount = images.length + pendingImages.length;

  useEffect(() => {
    if (placesTouched.current) return;
    setPlaces(providerCity ? [providerCityPlace(providerCity)] : []);
  }, [providerCity]);

  useEffect(() => {
    if (!form.categoryId) return;

    const activeCategory =
      categories.find((c) => c.id === form.categoryId) ?? null;
    if (!activeCategory) return;
    if (activeCategory.parentId == null) return;

    const suggestedTitle = activeCategory.name;

    setForm((current) => {
      const currentTitleTrimmed = current.title.trim();
      const canOverwrite =
        currentTitleTrimmed.length === 0 ||
        (autofilledTitle != null && current.title === autofilledTitle);

      if (!canOverwrite) return current;
      if (current.title === suggestedTitle) return current;

      return { ...current, title: suggestedTitle };
    });
    setAutofilledTitle(suggestedTitle);
  }, [autofilledTitle, categories, form.categoryId]);

  useEffect(
    () => () => {
      for (const image of pendingImagesRef.current)
        URL.revokeObjectURL(image.previewUrl);
    },
    [],
  );

  const payload = useMemo(() => {
    return {
      categoryId: form.categoryId,
      title: form.title,
      price: formatServicePriceStored(form.price),
      stockBadge: normalizeNullableString(form.stockBadge),
      description: normalizeNullableString(form.description),
      paletteColor: normalizeNullableString(form.stockBadge)
        ? normalizeNullableString(form.paletteColor)
        : null,
      allRussia,
      places: allRussia ? [] : places.map(toPlaceInput),
    };
  }, [form, places, allRussia]);

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
    if (places.length === 0 && !allRussia) {
      issues.push("Выберите город или область.");
    }

    return issues;
  }, [form, places.length, allRussia]);

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
    const previewImage =
      normalizeNullableString(form.image) ?? pendingImage?.previewUrl ?? null;

    const allowedRegions = new Set(
      [...new Set(places.map((place) => place.regionCode))].slice(
        0,
        regionLimit ?? undefined,
      ),
    );
    const visiblePlaces: ServicePlace[] =
      allRussia && plan === "BUSINESS"
        ? [
            {
              kind: "region",
              name: "Вся Россия",
              regionName: "Вся Россия",
              regionCode: "RU",
            },
          ]
        : allRussia && providerCity
          ? [
              {
                kind: "region",
                name: providerCity.regionName,
                regionName: providerCity.regionName,
                regionCode: providerCity.regionCode,
              },
            ]
          : places.filter(
              (place) =>
                place.regionCode !== "RU" &&
                allowedRegions.has(place.regionCode),
            );
    return {
      id: initialService?.id ?? "preview-service",
      title: form.title.trim() || "Название услуги появится здесь",
      image: previewImage,
      stockBadge:
        plan === "STANDARD" ? null : normalizeNullableString(form.stockBadge),
      paletteColor:
        plan !== "STANDARD" && normalizeNullableString(form.stockBadge)
          ? plan === "LITE"
            ? ("primary" as const)
            : form.paletteColor || null
          : null,
      price: formatServicePriceStored(form.price) || "Цена не указана",
      provider: {
        id: activeMembership?.providerId ?? "preview-provider",
        name: activeMembership?.providerName ?? "Исполнитель",
        city: activeMembership?.providerCity ?? null,
      },
      rating: initialService?.rating ?? null,
      reviewCount: initialService?.reviewCount ?? null,
      places: visiblePlaces,
    };
  }, [
    plan,
    regionLimit,
    allRussia,
    providerCity,
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
    const issues =
      nextStatus === "PUBLISHED" ? publishValidationIssues : validationIssues;
    if (issues.length > 0) {
      setError(issues[0]);
      return;
    }

    setBusy(true);
    setPendingAction(nextStatus);
    setError(null);

    try {
      const requestPayload = {
        ...payload,
        status: nextStatus,
        ...(savedServiceId.current ? { images } : {}),
      };

      const response = await fetch(
        savedServiceId.current
          ? `/api/pro/services/${savedServiceId.current}`
          : "/api/pro/services",
        {
          method: savedServiceId.current ? "PATCH" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        },
      );
      const responseBody = (await response.json().catch(() => null)) as
        | { error?: string }
        | ServiceDto
        | null;

      if (!response.ok) {
        throw new Error(
          responseBody &&
            typeof responseBody === "object" &&
            "error" in responseBody
            ? (responseBody.error ?? "Не удалось сохранить услугу")
            : "Не удалось сохранить услугу",
        );
      }

      const savedId =
        savedServiceId.current ??
        (responseBody && "id" in responseBody ? responseBody.id : null);
      if (!savedId)
        throw new Error(
          "Не удалось определить услугу для загрузки фотографий.",
        );
      savedServiceId.current = savedId;
      await uploadPendingImages(savedId, pendingImages);

      const savedStatus = requestPayload.status;
      router.push(
        savedStatus === "PUBLISHED" && savedId
          ? `/pro/services?notice=published&serviceId=${savedId}`
          : `/pro/services?notice=${mode === "create" ? "created" : "updated"}`,
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось сохранить услугу",
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function applyGallery(payload: { image?: string | null; images?: string[] }) {
    const gallery = payload.images ?? (payload.image ? [payload.image] : []);
    setImages(gallery);
    setForm((current) => ({ ...current, image: gallery[0] ?? "" }));
  }

  async function uploadPendingImages(
    serviceId: string,
    selected: typeof pendingImages,
  ) {
    for (const image of selected) {
      const body = new FormData();
      body.append("file", image.file);
      const response = await fetch(`/api/pro/services/${serviceId}/image`, {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result?.error ||
            "Не удалось загрузить фотографию. Повторите загрузку.",
        );
      applyGallery(result);
      setPendingImages((current) =>
        current.filter((item) => item.previewUrl !== image.previewUrl),
      );
      URL.revokeObjectURL(image.previewUrl);
    }
  }

  async function retryImages(selected = pendingImages) {
    if (!savedServiceId.current || busy) return;
    setBusy(true);
    setError(null);
    setPendingAction(
      imagePickerSource.current === "icon" ? "upload:icon" : "upload:add",
    );
    try {
      await uploadPendingImages(savedServiceId.current, selected);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить фотографии",
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function deleteImage(imageUrl: string) {
    if (!savedServiceId.current || busy) return;
    setBusy(true);
    setPendingAction("deleteImage");
    setError(null);
    try {
      const query = new URLSearchParams({ imageUrl });
      const response = await fetch(
        `/api/pro/services/${savedServiceId.current}/image?${query}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || "Не удалось удалить изображение");
      applyGallery(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Не удалось удалить изображение",
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function openImagePicker(source: "icon" | "add" | null = null) {
    if (busy || imageCount >= photoLimit) return;
    imagePickerSource.current = source;
    fileInputRef.current?.click();
  }

  function onPlacesChange(input: ServicePlace[]) {
    const next = input.filter((place) => place.regionCode !== "RU");
    if (
      regionLimit !== null &&
      new Set(next.map((place) => place.regionCode)).size > regionLimit &&
      new Set(next.map((place) => place.regionCode)).size >=
        new Set(places.map((place) => place.regionCode)).size
    ) {
      setError(
        `Тариф позволяет выбрать до ${regionLimit} областей. Выберите подходящий тариф или сократите географию.`,
      );
      return;
    }
    setAllRussia(false);
    placesTouched.current = true;
    setPlaces(next);
  }

  const hasImage = imageCount > 0;
  const canRemoveImage = hasImage;

  function onSelectImages(files: File[]) {
    if (busy || !files.length) return;
    setError(null);
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          !file.size ||
          file.size > 10 * 1024 * 1024,
      )
    ) {
      setError("Выберите JPG, PNG или WebP размером до 10 МБ каждое.");
      return;
    }
    const added = files.filter(
      (file) =>
        !pendingImages.some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size &&
            item.file.lastModified === file.lastModified,
        ),
    );
    if (imageCount + added.length > photoLimit) {
      setError(`Тариф позволяет загрузить не более ${photoLimit} фотографий.`);
      return;
    }
    const selected = [
      ...pendingImages,
      ...added.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ];
    setPendingImages(selected);
    if (savedServiceId.current) void retryImages(selected);
  }

  function removePendingImage(previewUrl: string) {
    URL.revokeObjectURL(previewUrl);
    setPendingImages((current) =>
      current.filter((image) => image.previewUrl !== previewUrl),
    );
  }

  function onRemoveImage() {
    if (images[0]) void deleteImage(images[0]);
    else if (pendingImage) removePendingImage(pendingImage.previewUrl);
  }

  const priceLabel = formatServicePriceAmount(form.price);
  const draftDisabled = busy || validationIssues.length > 0;
  const publishDisabled = busy || publishValidationIssues.length > 0;
  const needsPhoto =
    !busy &&
    publishValidationIssues.length === 1 &&
    !pendingImage &&
    !form.image.trim();

  return (
    <Stack
      spacing={{ xs: 2, md: 5 }}
      sx={{ width: "100%", maxWidth: { md: 1040 }, mx: "auto" }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          width: "100%",
          maxWidth: { xs: 440, md: "none" },
          mx: { xs: "auto", md: 0 },
        }}
      >
        <IconButton
          aria-label="Назад"
          disabled={busy}
          onClick={() => router.push("/pro/services")}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography
          component="h1"
          variant="h1"
          sx={{ flex: 1, textAlign: "center", fontWeight: 700, pr: 5 }}
        >
          {mode === "create" ? "Новая услуга" : "Редактировать услугу"}
        </Typography>
      </Stack>
      <Stack
        spacing={1.5}
        sx={{
          display: { md: "none" },
          width: "100%",
          maxWidth: 440,
          mx: "auto",
        }}
      >
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
            sx={{
              width: "100%",
              cursor: busy ? "default" : "pointer",
              borderRadius: 1,
            }}
          >
            <ServiceCard item={previewItem} linked={false} />
          </Box>
          <Stack
            direction="row"
            sx={{
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Button
              type="button"
              variant="text"
              color="error"
              loading={pendingAction === "deleteImage"}
              disabled={
                (busy && pendingAction !== "deleteImage") || !canRemoveImage
              }
              onClick={onRemoveImage}
              sx={{
                color: "error.main",
                "&.Mui-disabled": { color: "text.disabled" },
              }}
            >
              Удалить
            </Button>
            <IconButton
              aria-label="Загрузить фото"
              loading={pendingAction === "upload:icon"}
              disabled={busy || imageCount >= photoLimit}
              onClick={() => openImagePicker("icon")}
            >
              <PhotoCameraOutlinedIcon sx={{ color: "primary.main" }} />
            </IconButton>
            <Button
              type="button"
              variant="text"
              color="success"
              loading={pendingAction === "upload:add"}
              disabled={busy || imageCount >= photoLimit}
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
          multiple
          aria-label="Фотографии услуги"
          disabled={busy || imageCount >= photoLimit}
          hidden
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.currentTarget.value = "";
            onSelectImages(files);
          }}
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        ) : null}

        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Typography variant="subtitle1">
            Фотографии услуги · {imageCount} из {photoLimit}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            JPG, PNG или WebP, до 10 МБ каждое. Первое фото — обложка карточки.
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {[
              ...images.map((url) => ({ url, saved: true })),
              ...pendingImages.map((image) => ({
                url: image.previewUrl,
                saved: false,
              })),
            ].map((image, index) => (
              <Box
                key={image.url}
                sx={{
                  position: "relative",
                  width: 112,
                }}
              >
                <Box
                  component="img"
                  src={image.url}
                  alt={`Фото услуги ${index + 1}`}
                  sx={{
                    width: 112,
                    height: 84,
                    objectFit: "cover",
                    borderRadius: 1,
                    display: "block",
                  }}
                />
                <IconButton
                  aria-label={`Удалить фото услуги ${index + 1}`}
                  size="small"
                  disabled={busy}
                  onClick={() =>
                    image.saved
                      ? void deleteImage(image.url)
                      : removePendingImage(image.url)
                  }
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                {image.saved && index > 0 && (
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() => {
                      setImages((current) => [
                        image.url,
                        ...current.filter((url) => url !== image.url),
                      ]);
                      setForm((current) => ({ ...current, image: image.url }));
                    }}
                  >
                    Сделать первым
                  </Button>
                )}
                <Typography variant="caption">
                  {index >= photoLimit ? "Скрыто тарифом · " : ""}
                  {index === 0 ? "Обложка" : `Фото ${index + 1}`}
                  {!image.saved ? " · Не загружено" : ""}
                </Typography>
              </Box>
            ))}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              type="button"
              onClick={() => openImagePicker("add")}
              disabled={busy || imageCount >= photoLimit}
            >
              Добавить фотографии
            </Button>
            {savedServiceId.current && pendingImages.length > 0 ? (
              <Button
                type="button"
                onClick={() => void retryImages()}
                disabled={busy}
              >
                Повторить загрузку
              </Button>
            ) : null}
          </Stack>
        </Stack>

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
              <Box
                sx={{
                  display: { xs: "none", md: "block" },
                  flex: 1,
                  minWidth: 0,
                  pt: 4,
                }}
              >
                <ServicePlaceChips
                  value={places}
                  onChange={onPlacesChange}
                  disabled={busy}
                />
              </Box>
            </Box>

            <Stack
              spacing={2}
              sx={{
                order: { xs: 2, md: 0 },
                px: { xs: 2, md: 0 },
                pt: { xs: 2.5, md: 0 },
              }}
            >
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
                      open: categoryMenuOpen,
                      onOpen: () => {
                        if (suppressCategoryMenuOpen.current) return;
                        setCategoryMenuOpen(true);
                      },
                      onClose: () => setCategoryMenuOpen(false),
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
                  <MenuItem
                    value=""
                    sx={
                      categoryMenuFullscreen ? { display: "none" } : undefined
                    }
                  >
                    Выберите категорию
                  </MenuItem>
                  {buildCategoryTree(categories).map(({ node, depth }) =>
                    depth === 0 ? (
                      <ListSubheader
                        key={`cat-${node.id}`}
                        disableSticky
                        sx={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          lineHeight: 1.5,
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
                        sx={{
                          whiteSpace: "normal",
                          height: "auto",
                          alignItems: "flex-start",
                          py: 1,
                        }}
                      >
                        {"—".repeat(depth)} {node.name}
                      </MenuItem>
                    ),
                  )}
                </TextField>
              </CategoryMenuCloseContext.Provider>
              <TextField
                size="small"
                label="Название"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                disabled={busy}
                required
                fullWidth
                slotProps={{ htmlInput: { "aria-label": "Название" } }}
              />
            </Stack>

            <Stack
              spacing={2.5}
              sx={{
                order: { xs: 3, md: 0 },
                px: { xs: 2, md: 0 },
                pb: { xs: 2, md: 0 },
              }}
            >
              <TextField
                size="small"
                label="Описание"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
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
            <Stack
              spacing={2}
              sx={{
                order: { xs: 4, md: 0 },
                px: { xs: 2, md: 0 },
                pb: { xs: 2, md: 0 },
              }}
            >
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
                slotProps={{
                  htmlInput: { inputMode: "numeric", "aria-label": "Цена" },
                }}
              />
              <Typography sx={{ display: { md: "none" }, fontWeight: 700 }}>
                География
              </Typography>
              <Typography variant="body2">
                География:{" "}
                {regionLimit === null
                  ? "без ограничений"
                  : `до ${regionLimit} областей для этой услуги`}
                .
              </Typography>
              <FormControlLabel
                label="Вся Россия"
                control={
                  <Checkbox
                    checked={allRussia}
                    disabled={busy || (plan !== "BUSINESS" && !allRussia)}
                    onChange={(event) => {
                      setAllRussia(event.target.checked);
                      if (!event.target.checked)
                        setPlaces((current) =>
                          current.filter((place) => place.regionCode !== "RU"),
                        );
                    }}
                  />
                }
              />
              <ServiceGeographyField
                value={places}
                onChange={onPlacesChange}
                disabled={busy}
                size="small"
                label="Локация"
                showChips={false}
                error={places.length === 0 && !allRussia}
                helperText={
                  places.length === 0 && !allRussia
                    ? "Выберите город или область"
                    : "Город или целая область. Можно несколько."
                }
              />
              <Box sx={{ display: { md: "none" } }}>
                <ServicePlaceChips
                  value={places}
                  onChange={onPlacesChange}
                  disabled={busy}
                  hideHeading
                />
              </Box>
              {!allRussia &&
                regionLimit !== null &&
                new Set(places.map((place) => place.regionCode)).size >
                  regionLimit && (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Сохранены все регионы. В публикации — первые {regionLimit}
                      . Поднимите нужные регионы, затем сохраните услугу.
                    </Typography>
                    {[...new Set(places.map((place) => place.regionCode))].map(
                      (code, index) => (
                        <Button
                          key={code}
                          variant={
                            index < regionLimit ? "contained" : "outlined"
                          }
                          disabled={busy || index === 0}
                          onClick={() => {
                            placesTouched.current = true;
                            setPlaces((current) => [
                              ...current.filter(
                                (place) => place.regionCode === code,
                              ),
                              ...current.filter(
                                (place) => place.regionCode !== code,
                              ),
                            ]);
                          }}
                        >
                          {
                            places.find((place) => place.regionCode === code)
                              ?.regionName
                          }{" "}
                          ·{" "}
                          {index < regionLimit
                            ? "Публикуется"
                            : "Поднять в начало"}
                        </Button>
                      ),
                    )}
                  </Stack>
                )}
              <Stack spacing={0.75}>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <StockBadgeField
                    value={form.stockBadge}
                    disabled={busy || plan === "STANDARD"}
                    onChange={(stockBadge) =>
                      setForm((current) => ({
                        ...current,
                        stockBadge,
                        paletteColor:
                          plan === "LITE" ? "primary" : current.paletteColor,
                      }))
                    }
                    endAdornment={
                      <DesktopLabelColor
                        value={plan === "LITE" ? "primary" : form.paletteColor}
                        disabled={busy || plan !== "BUSINESS"}
                        onChange={(color) =>
                          setForm((current) => ({
                            ...current,
                            paletteColor: color,
                          }))
                        }
                      />
                    }
                  />
                </Box>
                <Box sx={{ display: { md: "none" } }}>
                  <MobileLabelColor
                    badge={form.stockBadge}
                    onBadgeChange={(stockBadge) =>
                      setForm((current) => ({
                        ...current,
                        stockBadge,
                        paletteColor:
                          plan === "LITE" ? "primary" : current.paletteColor,
                      }))
                    }
                    color={plan === "LITE" ? "primary" : form.paletteColor}
                    colorLocked={plan !== "BUSINESS"}
                    disabled={busy || plan === "STANDARD"}
                    onColorChange={(color) =>
                      setForm((current) => ({
                        ...current,
                        paletteColor: plan === "LITE" ? "primary" : color,
                      }))
                    }
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", pl: "10px" }}
                >
                  {plan === "STANDARD"
                    ? "На Стандарте метка скрыта из публикации."
                    : plan === "LITE"
                      ? "На Лайте метка публикуется основным цветом."
                      : `Максимум ${STOCK_BADGE_MAX_LENGTH} символа`}
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ display: { xs: "none", md: "block" }, mt: "auto" }}>
              <ServiceEditorActions
                publishDisabled={publishDisabled}
                needsPhoto={needsPhoto}
                onPickPhoto={() => openImagePicker()}
                draftDisabled={draftDisabled}
                pending={
                  pendingAction === "PUBLISHED" || pendingAction === "DRAFT"
                    ? pendingAction
                    : null
                }
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
      <Stack
        spacing={2}
        sx={{
          display: { md: "none" },
          width: "100%",
          maxWidth: 440,
          mx: "auto",
        }}
      >
        <ServiceCard item={previewItem} linked={false} />
        <ServiceEditorActions
          publishDisabled={publishDisabled}
          needsPhoto={needsPhoto}
          onPickPhoto={() => openImagePicker()}
          draftDisabled={draftDisabled}
          pending={
            pendingAction === "PUBLISHED" || pendingAction === "DRAFT"
              ? pendingAction
              : null
          }
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
