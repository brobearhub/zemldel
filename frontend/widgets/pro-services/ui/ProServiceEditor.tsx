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
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import {
  Alert,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Box,
  Button,
  ButtonBase,
  Chip,
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
  ServicePlace,
  ServiceStatus,
} from "@/entities/service";
import {
  ServiceGeographyField,
  ServicePlaceChips,
} from "@/features/select-service-places";
import { STOCK_BADGE_MAX_LENGTH } from "../lib/stock-badge-suggestions";
import {
  PlanFeatureGate,
  LITE_AND_BUSINESS,
  BUSINESS_ONLY,
} from "@/shared/ui/PlanFeatureGate";
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
import { useNewServiceDraft } from "../model/useNewServiceDraft";
import { draftPhotoKey, type ServiceFormState } from "../lib/new-service-draft";
import { convertImageToWebp, IMAGE_INPUT_ACCEPT, validateImageInput } from "@/shared/lib/image/convert-to-webp";

type Props = {
  mode: "create" | "edit";
  initialService?: ServiceDto;
  categories: ServiceCategory[];
  /** Город исполнителя с сервера: клиентская сессия после онбординга ещё без него. */
  initialProviderCity?: AuthCity | null;
  draftStorageKey?: string;
};

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function serviceRequestError(status: number, body: unknown, fallback: string): string {
  if (status === 401) return "Сессия завершена. Войдите снова, чтобы сохранить услугу.";
  const details = body && typeof body === "object"
    ? body as { message?: unknown; error?: unknown }
    : null;
  const message = Array.isArray(details?.message)
    ? details.message.filter((item): item is string => typeof item === "string").join(" ")
    : typeof details?.message === "string"
      ? details.message
      : typeof details?.error === "string"
        ? details.error
        : "";
  if (status === 403 && (!message || message === "Forbidden")) {
    return "Нет доступа к изменению услуги. Проверьте выбранный профиль исполнителя.";
  }
  return message || fallback;
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
  publishValidationIssues,
  needsPhoto,
  draftDisabled,
  pending,
  onPublish,
  onPickPhoto,
  onDraft,
}: {
  publishDisabled: boolean;
  publishValidationIssues: string[];
  needsPhoto: boolean;
  draftDisabled: boolean;
  pending: ServiceStatus | null;
  onPublish: () => void;
  onPickPhoto: () => void;
  onDraft: () => void;
}) {
  return (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: "row", md: "column" }}
        spacing={2}
        useFlexGap
      >
        <Button
          type="button"
          variant="contained"
          loading={pending === "PUBLISHED"}
          disabled={publishDisabled}
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
      {publishValidationIssues.length > 0 ? (
        <Typography
          role="status"
          variant="body2"
          sx={{ color: "text.secondary" }}
        >
          Для публикации: {publishValidationIssues.join(" ")}
        </Typography>
      ) : null}
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
  draftStorageKey,
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
          limits: { photos: number };
        };
        if (!cancelled) {
          setPlan(data.entitlementPlan);
          setPhotoLimit(data.limits.photos);
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
  const [validationStatus, setValidationStatus] = useState<ServiceStatus | null>(null);
  const [saving, setBusy] = useState(false);
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
  const [mainPhotoKey, setMainPhotoKey] = useState<string | null>(null);
  const galleryPhotos = useMemo(() => {
    const photos = [
      ...images.map((url) => ({ key: url, url, saved: true })),
      ...pendingImages.map((image) => ({
        key: draftPhotoKey(image.file),
        url: image.previewUrl,
        saved: false,
      })),
    ];
    const mainPhoto = photos.find((image) => image.key === mainPhotoKey);
    return mainPhoto
      ? [mainPhoto, ...photos.filter((image) => image !== mainPhoto)]
      : photos;
  }, [images, pendingImages, mainPhotoKey]);
  const mainPhotoUrl = galleryPhotos[0]?.url ?? null;
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  const savedServiceId = useRef(
    mode === "edit" ? (initialService?.id ?? null) : null,
  );
  const imageCount = images.length + pendingImages.length;
  const hasImage = imageCount > 0;
  const draftFiles = useMemo(() => pendingImages.map((image) => image.file), [pendingImages]);
  const draftServiceId = savedServiceId.current;
  const draftPlacesEdited = placesTouched.current;
  const draftSnapshot = useMemo(() => ({
    version: 1 as const,
    form,
    places,
    placesEdited: draftPlacesEdited,
    allRussia,
    images,
    mainPhotoKey,
    savedServiceId: draftServiceId,
    photos: draftFiles.map(draftPhotoKey),
  }), [form, places, draftPlacesEdited, allRussia, images, mainPhotoKey, draftServiceId, draftFiles]);
  const localDraft = useNewServiceDraft({
    storageKey: draftStorageKey,
    enabled: mode === "create",
    draft: draftSnapshot,
    files: draftFiles,
    onRestore: (draft, files) => {
      placesTouched.current = true;
      savedServiceId.current = draft.savedServiceId;
      setForm({
        ...draft.form,
        status: "DRAFT",
        categoryId: categories.some((category) => category.id === draft.form.categoryId)
          ? draft.form.categoryId
          : "",
      });
      setPlaces(draft.places);
      setAllRussia(draft.allRussia);
      setImages(draft.images);
      setMainPhotoKey(draft.mainPhotoKey ?? null);
      setPendingImages(files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    },
  });
  const busy = saving || localDraft.loading;

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

    if (!hasImage) {
      issues.push("Добавьте фото.");
    }
    if (!form.description.trim()) {
      issues.push("Добавьте описание.");
    }

    return issues;
  }, [form.description, hasImage, validationIssues]);

  const previewItem = useMemo(() => {
    const visiblePlaces: ServicePlace[] = allRussia
      ? [
          {
            kind: "region",
            name: "Вся Россия",
            regionName: "Вся Россия",
            regionCode: "RU",
          },
        ]
      : places.filter((place) => place.regionCode !== "RU");
    return {
      id: initialService?.id ?? "preview-service",
      title: form.title.trim() || "Название услуги появится здесь",
      image: mainPhotoUrl,
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
    allRussia,
    activeMembership?.providerCity,
    activeMembership?.providerId,
    activeMembership?.providerName,
    mainPhotoUrl,
    form.paletteColor,
    form.price,
    form.stockBadge,
    form.title,
    initialService?.id,
    initialService?.rating,
    initialService?.reviewCount,
    places,
  ]);

  async function submitForm(nextStatus: ServiceStatus) {
    if (busy) return;
    const issues =
      nextStatus === "PUBLISHED" ? publishValidationIssues : validationIssues;
    if (issues.length > 0) {
      setValidationStatus(nextStatus);
      setError(null);
      return;
    }

    setValidationStatus(null);
    setBusy(true);
    setPendingAction(nextStatus);
    setError(null);

    try {
      await localDraft.flush();
      const existingId = savedServiceId.current;
      // Existing services can upload first. A new service needs a draft ID
      // before its photos can be stored; publish only after every upload succeeds.
      const gallery = existingId
        ? await uploadPendingImages(existingId, pendingImages)
        : images;
      const requestPayload = {
        ...payload,
        status: !existingId && pendingImages.length > 0 ? "DRAFT" : nextStatus,
        ...(existingId ? { images: gallery } : {}),
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
          serviceRequestError(response.status, responseBody, "Не удалось сохранить услугу"),
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
      localDraft.saveProgress(savedId);
      if (!existingId) {
        await uploadPendingImages(savedId, pendingImages);
        if (requestPayload.status !== nextStatus) {
          const publishResponse = await fetch(`/api/pro/services/${savedId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          });
          if (!publishResponse.ok) {
            const result = await publishResponse.json().catch(() => null);
            throw new Error(
              serviceRequestError(
                publishResponse.status,
                result,
                "Не удалось опубликовать услугу. Повторите попытку.",
              ),
            );
          }
        }
      }

      if (nextStatus === "PUBLISHED") await localDraft.clearPublished(savedId);
      router.push(
        nextStatus === "PUBLISHED" && savedId
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

  function applyGallery(
    payload: { image?: string | null; images?: string[] },
    preferredMainPhoto = mainPhotoKey,
  ) {
    const gallery = payload.images?.length
      ? payload.images
      : payload.image
        ? [payload.image]
        : [];
    const ordered = preferredMainPhoto && gallery.includes(preferredMainPhoto)
      ? [preferredMainPhoto, ...gallery.filter((url) => url !== preferredMainPhoto)]
      : gallery;
    setImages(ordered);
    return ordered;
  }

  async function uploadPendingImages(
    serviceId: string,
    selected: typeof pendingImages,
  ) {
    let gallery = images;
    let preferredMainPhoto = mainPhotoKey;
    for (const [index, image] of selected.entries()) {
      // Older saved drafts can still contain files selected before WebP conversion was introduced.
      const uploadFile = image.file.type === "image/webp"
        ? image.file
        : await convertImageToWebp(image.file, { maxBytes: 10 * 1024 * 1024 });
      const body = new FormData();
      body.append("file", uploadFile);
      const response = await fetch(`/api/pro/services/${serviceId}/image`, {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          serviceRequestError(
            response.status,
            result,
            "Не удалось загрузить фотографию. Повторите загрузку.",
          ),
        );
      if (!result || (!result.images?.length && !result.image)) {
        throw new Error("Сервер не подтвердил загрузку фотографии. Повторите загрузку.");
      }
      if (draftPhotoKey(image.file) === preferredMainPhoto) {
        const uploadedUrls: string[] = result.images?.length ? result.images : [result.image];
        let uploadedUrl = uploadedUrls.find((url) => !gallery.includes(url));
        // A repeated file is returned in the existing gallery without a new URL.
        if (!uploadedUrl && globalThis.crypto?.subtle) {
          const digest = await crypto.subtle.digest("SHA-256", await uploadFile.arrayBuffer());
          const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
          uploadedUrl = uploadedUrls.find((url) => new RegExp(`/${hash}\\.(jpg|jpeg|png|webp)$`).test(url));
        }
        preferredMainPhoto = uploadedUrl ?? null;
        setMainPhotoKey(preferredMainPhoto);
      }
      gallery = applyGallery(result, preferredMainPhoto);
      localDraft.saveProgress(serviceId, {
        images: gallery,
        photos: selected.slice(index + 1).map((item) => draftPhotoKey(item.file)),
        mainPhotoKey: preferredMainPhoto,
      });
      setPendingImages((current) =>
        current.filter((item) => item.previewUrl !== image.previewUrl),
      );
      URL.revokeObjectURL(image.previewUrl);
    }
    return gallery;
  }

  async function retryImages(selected = pendingImages) {
    if (!savedServiceId.current || busy) return;
    setBusy(true);
    setError(null);
    setPendingAction(
      imagePickerSource.current === "icon" ? "upload:icon" : "upload:add",
    );
    try {
      await localDraft.flush();
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
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(serviceRequestError(response.status, result, "Не удалось удалить изображение"));
      if (!result) throw new Error("Сервер не подтвердил удаление фотографии. Повторите попытку.");
      applyGallery(result);
      if (mainPhotoKey === imageUrl) setMainPhotoKey(null);
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

  const photoRestriction =
    imageCount >= photoLimit
      ? photoLimit < 3
        ? `Сейчас доступно ${photoLimit} фото. До 3 фото — на Лайте, до 10 — на Бизнесе.`
        : photoLimit < 10
          ? "До 10 фотографий доступно на тарифе Бизнес."
          : "В одной услуге можно разместить до 10 фотографий."
      : null;

  function openImagePicker(source: "icon" | "add" | null = null) {
    if (busy || imageCount >= photoLimit) return;
    imagePickerSource.current = source;
    fileInputRef.current?.click();
  }

  function onPlacesChange(input: ServicePlace[]) {
    const next = input.filter((place) => place.regionCode !== "RU");
    setAllRussia(false);
    placesTouched.current = true;
    setPlaces(next);
  }

  const canRemoveImage = hasImage;

  async function onSelectImages(files: File[]) {
    if (busy || !files.length) return;
    setError(null);
    const invalid = files.map(validateImageInput).find(Boolean);
    if (invalid) {
      setError(invalid);
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
    if (!added.length) return;
    setBusy(true);
    setPendingAction(imagePickerSource.current === "icon" ? "upload:icon" : "upload:add");
    try {
      const converted: File[] = [];
      for (const file of added) converted.push(await convertImageToWebp(file, { maxBytes: 10 * 1024 * 1024 }));
      const selected = [
        ...pendingImages,
        ...converted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ];
      setPendingImages(selected);
      if (savedServiceId.current && mode === "edit") {
        await localDraft.flush();
        await uploadPendingImages(savedServiceId.current, selected);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обработать фотографии.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function removePendingImage(previewUrl: string) {
    const removed = pendingImages.find((image) => image.previewUrl === previewUrl);
    if (removed && draftPhotoKey(removed.file) === mainPhotoKey) setMainPhotoKey(null);
    URL.revokeObjectURL(previewUrl);
    setPendingImages((current) =>
      current.filter((image) => image.previewUrl !== previewUrl),
    );
  }

  function onRemoveImage() {
    const mainPhoto = galleryPhotos[0];
    if (!mainPhoto) return;
    if (mainPhoto.saved) void deleteImage(mainPhoto.url);
    else removePendingImage(mainPhoto.url);
  }

  function makeMainPhoto(photo: (typeof galleryPhotos)[number]) {
    if (busy) return;
    setMainPhotoKey(photo.key);
    if (photo.saved) {
      setImages((current) => [photo.url, ...current.filter((url) => url !== photo.url)]);
    } else {
      setPendingImages((current) => {
        const selected = current.find((image) => image.previewUrl === photo.url);
        return selected
          ? [selected, ...current.filter((image) => image !== selected)]
          : current;
      });
    }
  }

  const priceLabel = formatServicePriceAmount(form.price);
  const draftDisabled = busy || validationIssues.length > 0;
  // Keep validation actionable: a click explains missing fields instead of
  // leaving the provider with a disabled button and no way to continue.
  const publishDisabled = busy;
  const needsPhoto =
    !busy &&
    publishValidationIssues.length === 1 &&
    !hasImage;
  const validationError =
    validationStatus === "PUBLISHED"
      ? publishValidationIssues.join(" ")
      : validationStatus
        ? validationIssues.join(" ")
        : "";
  const formError = error || validationError;

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
      {mode === "create" && (localDraft.loading || localDraft.saved || localDraft.restored) ? (
        <Alert
          severity="info"
          role="status"
        >
          {localDraft.loading
            ? "Восстанавливаем черновик…"
            : localDraft.restored
              ? "Черновик восстановлен. Изменения сохраняются в этом браузере автоматически."
              : "Черновик сохраняется в этом браузере автоматически."}
        </Alert>
      ) : null}
      {localDraft.warning ? <Alert severity="warning">{localDraft.warning}</Alert> : null}
      <Stack
        spacing={1.5}
        sx={{
          display: { md: "none" },
          width: "100%",
          maxWidth: 440,
          mx: "auto",
        }}
      >
        <Stack
          spacing={1.5}
          sx={{ alignItems: "flex-start" }}
        >
          <PlanFeatureGate
            message={photoRestriction}
            label="Загрузить фото"
            fullWidth
          >
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
              <ServiceCard
                item={previewItem}
                linked={false}
              />
            </Box>
          </PlanFeatureGate>
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
            <PlanFeatureGate
              message={photoRestriction}
              label="Загрузить фото"
            >
              <IconButton
                aria-label="Загрузить фото"
                loading={pendingAction === "upload:icon"}
                disabled={busy}
                onClick={() => openImagePicker("icon")}
              >
                <PhotoCameraOutlinedIcon sx={{ color: "primary.main" }} />
              </IconButton>
            </PlanFeatureGate>
            <PlanFeatureGate
              message={photoRestriction}
              label="Добавить"
            >
              <Button
                type="button"
                variant="text"
                color="success"
                loading={pendingAction === "upload:add"}
                disabled={busy}
                onClick={() => openImagePicker("add")}
                sx={{ color: "success.main" }}
              >
                Добавить
              </Button>
            </PlanFeatureGate>
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
          accept={IMAGE_INPUT_ACCEPT}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.currentTarget.value = "";
            void onSelectImages(files);
          }}
        />
        {pendingAction === "upload:icon" || pendingAction === "upload:add" ? (
          <Stack
            direction="row"
            role="status"
            spacing={1}
            sx={{ alignItems: "center", px: 2, pt: 1.5 }}
          >
            <CircularProgress size={16} />
            <Typography variant="body2">
              {savedServiceId.current && mode === "edit"
                ? "Обрабатываем и загружаем фото…"
                : "Обрабатываем фото…"}
            </Typography>
          </Stack>
        ) : null}
        {formError ? (
          <Alert
            severity="error"
            sx={{ borderRadius: 0 }}
          >
            {formError}
            {formError.startsWith("Тариф позволяет") ? (
              <a href="/pro/settings/tariff"> Перейти к тарифам</a>
            ) : null}
          </Alert>
        ) : null}

        <Stack
          spacing={1.5}
          sx={{ p: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            <Typography variant="subtitle1">
              Фотографии услуги · {imageCount} из {photoLimit}
            </Typography>
            {photoLimit < 10 && (plan === "STANDARD" || plan === "LITE") ? (
              <PlanFeatureGate
                message="До 10 фотографий доступно на тарифе Бизнес."
                label="Информация о количестве фотографий"
              >
                <IconButton
                  type="button"
                  size="small"
                  aria-label="Информация о количестве фотографий"
                  sx={{
                    color: "text.primary",
                    ml: -0.5,
                    transform: "translateY(-2px)",
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </PlanFeatureGate>
            ) : null}
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
          >
            JPG, PNG или WebP, до 10 МБ каждое. Главная фотография — обложка карточки.
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {galleryPhotos.map((image, index) => (
              <Box
                key={image.key}
                sx={{
                  width: 112,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{ position: "relative" }}
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
                      outline: index === 0 ? "2px solid" : undefined,
                      outlineColor: "primary.main",
                      outlineOffset: -2,
                    }}
                  />
                  {index === 0 ? (
                    <Chip
                      label="Главная"
                      color="primary"
                      size="small"
                      sx={{
                        position: "absolute",
                        bottom: 4,
                        left: 4,
                        height: 22,
                        minHeight: 22,
                        bgcolor: "text.primary",
                        color: "background.paper",
                        borderRadius: 1,
                        fontWeight: 700,
                        pointerEvents: "none",
                        "& .MuiChip-label": {
                          px: 0.75,
                          py: 0,
                          fontSize: 12,
                        },
                      }}
                    />
                  ) : null}
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
                </Box>
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    fullWidth
                    aria-label={`Сделать главной фото ${index + 1}`}
                    disabled={busy}
                    onClick={() => makeMainPhoto(image)}
                    sx={{
                      px: 0.5,
                      py: 0.5,
                      minHeight: 36,
                      fontSize: 12,
                      letterSpacing: 0,
                      whiteSpace: "nowrap",
                      color: "text.primary",
                      borderColor: "text.primary",
                    }}
                  >
                    Сделать главной
                  </Button>
                )}
                <Typography variant="caption">
                  {index >= photoLimit ? (
                    <PlanFeatureGate
                      message={index < 3 ? LITE_AND_BUSINESS : BUSINESS_ONLY}
                      label={`Фото ${index + 1}: скрыто тарифом`}
                    >
                      <span>Скрыто тарифом · </span>
                    </PlanFeatureGate>
                  ) : null}
                  {index === 0 ? "Обложка" : `Фото ${index + 1}`}
                  {!image.saved
                    ? busy
                      ? " · Загрузка…"
                      : savedServiceId.current
                        ? " · Не загружено"
                        : ""
                    : ""}
                </Typography>
              </Box>
            ))}
            <PlanFeatureGate
              message={photoRestriction}
              label="Добавить фотографии"
            >
              <ButtonBase
                type="button"
                aria-label="Добавить фотографии"
                onClick={() => openImagePicker("add")}
                disabled={busy}
                sx={{
                  width: 112,
                  height: 112,
                  flexShrink: 0,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                  color: "text.secondary",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
                    color: "primary.main",
                  },
                  "&.Mui-focusVisible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                  "&.Mui-disabled": {
                    opacity: 0.5,
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 32 }} />
              </ButtonBase>
            </PlanFeatureGate>
          </Box>
          {savedServiceId.current && pendingImages.length > 0 ? (
            <Box>
              <Button
                type="button"
                onClick={() => void retryImages()}
                disabled={busy}
              >
                Повторить загрузку
              </Button>
            </Box>
          ) : null}
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
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                >
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
                  <ServiceCard
                    item={previewItem}
                    linked={false}
                  />
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
                required
                helperText="Обязательно для публикации. Черновик можно сохранить без описания."
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
              <FormControlLabel
                label="Вся Россия"
                control={
                  <Checkbox
                    checked={allRussia}
                    disabled={busy}
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
              <Stack spacing={0.75}>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <StockBadgeField
                    value={form.stockBadge}
                    disabled={busy}
                    badgeLocked={plan === "STANDARD"}
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
                        value={
                          plan === "LITE" ? "primary" : form.paletteColor
                        }
                        disabled={busy}
                        colorLocked={plan !== "BUSINESS"}
                        badgeLocked={plan === "STANDARD"}
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
                    disabled={busy}
                    badgeLocked={plan === "STANDARD"}
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
                publishValidationIssues={publishValidationIssues}
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
        <ServiceCard
          item={previewItem}
          linked={false}
        />
        <ServiceEditorActions
          publishDisabled={publishDisabled}
          publishValidationIssues={publishValidationIssues}
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
