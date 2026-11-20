"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import WorkOutlineRounded from "@mui/icons-material/WorkOutlineRounded";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import type { ServicePlace } from "@/entities/service";
import type { CitySuggestItemDto } from "@/entities/city";
import { ServiceGeographyField } from "@/features/select-service-places";
import { LocationField } from "@/features/select-city";
import { landApi, LandApiError, useLandData } from "@/entities/land/api";
import {
  addressPointAccuracy,
  LAND_CADASTRAL_NUMBER,
} from "@/entities/land/address-location";
import {
  emptyLandDraft,
  MAX_LAND_SHARE_PARTS,
  type LandDetails,
  type LandDraft,
  type LandKind,
  type LandListing,
} from "@/entities/land/types";
import { LandMap } from "./LandMap";
import { useCityCenter } from "@/entities/geocoding/use-city-center";
import { findCadastralLocation, GeocodingRequestError, resolveAddress } from "@/entities/geocoding/api";
import type { AddressSuggestion, GeocodedPoint } from "@/entities/geocoding/types";
import { AddressSuggestionsField } from "@/features/address-suggestions/ui/AddressSuggestionsField";
import {
  LandCheckbox,
  LandFieldPair,
  LandFormCard,
  landEditorInputs,
} from "./LandEditorControls";
import {
  LandCharacteristics,
  LandParcelPassport,
  LandPurposeFields,
} from "./LandParcelFields";
import { LandDealFields } from "./LandDealFields";
import { LandDocuments, LandPhotos } from "./LandEditorMedia";

export function LandEditScreen({ id }: { id: string }) {
  const { data, error, loading, refresh } = useLandData<LandListing>(`/${id}`);
  if (loading && !data)
    return (
      <Skeleton
        height={600}
        sx={{
          m: 3,
        }}
      />
    );
  if (error)
    return (
      <Alert
        severity="error"
        action={<Button onClick={refresh}>Повторить</Button>}
      >
        {error}
      </Alert>
    );
  if (!data) return null;
  if (!data.canManage)
    return (
      <Alert severity="warning">
        Редактирование доступно только автору или менеджеру профиля.
      </Alert>
    );
  if (data.status === "PENDING")
    return (
      <Stack
        spacing={2}
        sx={{
          p: 3,
        }}
      >
        <Alert severity="info">
          {data.hasPublishedVersion
            ? "Изменения на модерации. Покупатели видят последнюю одобренную версию. Чтобы продолжить редактирование, отзовите изменения в «Моих объявлениях»."
            : "Объявление на модерации. Отзовите его в «Моих объявлениях», чтобы изменить данные."}
        </Alert>
        <Button
          component={Link}
          href="/lands/mine"
        >
          Мои объявления
        </Button>
      </Stack>
    );
  return (
    <LandEditor
      initial={data}
      key={data.id}
    />
  );
}
export function LandEditor({
  initial,
  initialKind = "SALE",
}: {
  initial?: LandListing;
  initialKind?: LandKind;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [draft, setDraft] = useState<LandDraft>(
    () => initial ?? { ...emptyLandDraft(), kind: initialKind },
  );
  const [record, setRecord] = useState<LandListing | null>(initial ?? null);
  const [places, setPlaces] = useState<ServicePlace[]>(initial?.places ?? []);
  const [city, setCity] = useState(initial?.city ?? null);
  const [cityMode, setCityMode] = useState<"use-center" | "preview" | null>(null);
  const [addressPoint, setAddressPoint] = useState<GeocodedPoint | null>(null);
  const [addressLookup, setAddressLookup] = useState<"idle" | "loading" | "cadastral" | "missing" | "expired" | "error">("idle");
  const [cadastralHint, setCadastralHint] = useState("");
  const locationController = useRef<AbortController | null>(null);
  const fromCadastral = useRef(new Set<"address" | "point" | "cityId">());
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const pending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const members = useMemo(
    () =>
      (session?.user?.memberships ?? []).filter(
        (member) =>
          member.status === "ACTIVE" &&
          (member.role === "OWNER" || member.role === "MANAGER"),
      ),
    [session?.user?.memberships],
  );
  const hasProvider = members.length > 0;
  const kind = record?.kind ?? (hasProvider ? draft.kind : "SALE");
  const selection = kind === "SELECTION";
  const hasAuthorChoice = selection ? members.length > 1 : hasProvider;
  const authorMember =
    members.find((member) => member.providerId === draft.providerId) ??
    (selection ? members[0] : undefined);
  const providerId = record
    ? record.providerId
    : (authorMember?.providerId ?? null);
  const hasDraftCoordinates = draft.latitude != null || draft.longitude != null;
  const previewCity =
    status === "authenticated" && !selection && (cityMode || !hasDraftCoordinates)
      ? city
      : null;
  const cityLocation = useCityCenter(previewCity);
  const mapCity = useMemo(
    () => previewCity && cityLocation.center
      ? { ...previewCity, center: cityLocation.center }
      : null,
    [previewCity, cityLocation.center],
  );
  const startingPoint = cityMode === "use-center" && cityLocation.center
    ? { latitude: cityLocation.center.latitude, longitude: cityLocation.center.longitude }
    : null;
  const form = { ...draft, ...startingPoint, kind, providerId };
  const hasParcelPoint = form.latitude != null && form.longitude != null;
  const d = form.details;
  const shareLimitErrors: Record<string, string> = {};
  if (!selection && form.dealType === "SHARE") {
    for (const key of ["shareNumerator", "shareDenominator"] as const) {
      if ((d[key] ?? 0) > MAX_LAND_SHARE_PARTS) {
        shareLimitErrors[key] = `Можно указать не больше ${MAX_LAND_SHARE_PARTS} долей.`;
      }
    }
  }
  const verify =
    d.requestDocumentReview ?? initial?.documentStatus === "REQUESTED";
  const canSave =
    (!selection || Boolean(providerId)) &&
    addressLookup !== "loading" &&
    addressLookup !== "cadastral" &&
    !(cityMode === "use-center" && cityLocation.loading);
  useEffect(() => () => locationController.current?.abort(), []);

  useEffect(() => {
    if (!validationAttempt) return;
    const invalid = formRef.current?.querySelector<HTMLElement>(
      '[data-land-invalid="true"]',
    );
    const control = invalid?.querySelector<HTMLElement>(
      '[role="combobox"], [role="button"], [role="spinbutton"], input:not([type="hidden"]):not([hidden]):not([aria-hidden="true"]), textarea, button',
    );
    const focusTarget = control ?? errorRef.current;
    focusTarget?.focus({ preventScroll: true });
    (invalid ?? focusTarget)?.scrollIntoView({ block: "center" });
  }, [validationAttempt]);

  function changed(keys: string[]) {
    setSaved(false);
    setFields((previous) => {
      if (!keys.some((key) => key in previous)) return previous;
      const next = { ...previous };
      for (const key of keys) delete next[key];
      return next;
    });
  }

  function change(update: Partial<LandDraft>) {
    if (pending.current) return;
    const patch = { ...update };
    const imported = fromCadastral.current;
    const newNumber = "cadastralNumber" in patch && patch.cadastralNumber !== draft.cadastralNumber;
    if (newNumber) {
      setCadastralHint("");
      if (imported.has("address")) patch.address = "";
      if (imported.has("point")) {
        patch.latitude = null;
        patch.longitude = null;
      }
      if (imported.has("cityId")) {
        patch.cityId = null;
        setCity(null);
        setCityMode(null);
      }
    }
    const movingPoint = "latitude" in patch || "longitude" in patch;
    if (newNumber || movingPoint || "address" in patch || "cityId" in patch || "kind" in patch) {
      locationController.current?.abort();
      locationController.current = null;
      setAddressLookup("idle");
    }
    if ("address" in patch) imported.delete("address");
    if ("cityId" in patch) imported.delete("cityId");
    if (movingPoint) {
      imported.delete("point");
      setCityMode(null);
      setAddressPoint(null);
    }
    changed(Object.keys(patch));
    if (patch.kind || patch.dealType) {
      setFields({});
      setError("");
    }
    setDraft((current) => ({
      ...current,
      ...(movingPoint && startingPoint),
      ...patch,
    }));
  }

  function selectCity(next: CitySuggestItemDto | null) {
    if (pending.current) return;
    change({ cityId: next?.id ?? null });
    setCity(next ? { ...next } : null);
    setCityMode(next ? (hasDraftCoordinates ? "preview" : "use-center") : null);
  }

  async function selectAddress(suggestion: AddressSuggestion) {
    if (pending.current) return;
    let point = suggestion.point;
    if (!point) {
      change({
        address: suggestion.label,
        ...(addressPoint && { latitude: null, longitude: null }),
      });
      const controller = new AbortController();
      locationController.current = controller;
      setAddressLookup("loading");
      try {
        point = await resolveAddress(suggestion.reference, controller.signal);
        if (controller.signal.aborted) return;
        if (!point) {
          setAddressLookup("missing");
          return;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAddressLookup(error instanceof GeocodingRequestError && error.status === 409 ? "expired" : "error");
        }
        return;
      } finally {
        if (locationController.current === controller) locationController.current = null;
      }
    }
    change({
      address: suggestion.label,
      latitude: point.latitude,
      longitude: point.longitude,
    });
    setAddressPoint({ ...point });
  }

  async function confirmCadastralNumber() {
    const number = form.cadastralNumber;
    if (
      pending.current ||
      selection ||
      addressLookup === "cadastral" ||
      !LAND_CADASTRAL_NUMBER.test(number)
    ) return;
    locationController.current?.abort();
    const controller = new AbortController();
    locationController.current = controller;
    setAddressLookup("cadastral");
    setCadastralHint("");
    try {
      const result = await findCadastralLocation(number, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status !== "found") {
        setCadastralHint(
          result.status === "ambiguous"
            ? "По номеру найдено несколько адресов. Укажите расположение вручную."
            : "По этому номеру адрес не найден. Расположение можно указать вручную.",
        );
        return;
      }
      const { city: foundCity, point } = result;
      const address = result.kind === "unit" ? result.buildingAddress ?? result.address : result.address;
      const patch: Partial<LandDraft> = { cityId: foundCity?.id ?? null };
      if (address) patch.address = address;
      if (point) {
        patch.latitude = point.latitude;
        patch.longitude = point.longitude;
      } else if (addressPoint || fromCadastral.current.has("point")) {
        patch.latitude = null;
        patch.longitude = null;
      }
      change(patch);
      setCity(foundCity);
      setCityMode(null);
      if (address) fromCadastral.current.add("address");
      if (foundCity) fromCadastral.current.add("cityId");
      if (point) {
        setAddressPoint(point);
        fromCadastral.current.add("point");
      }
      const source = result.kind === "parcel"
        ? "Найден участок."
        : result.kind === "building"
          ? "Номер относится к зданию. Его адрес подставлен как ориентир."
          : "Номер относится к помещению. Адрес дома подставлен как ориентир.";
      setCadastralHint([
        source,
        !point && "Координаты не найдены. Уточните точку на карте.",
        !foundCity && "Выберите населённый пункт вручную.",
      ].filter(Boolean).join(" "));
    } catch {
      if (!controller.signal.aborted) {
        setCadastralHint("Не удалось найти расположение по номеру. Повторите поиск или укажите расположение вручную.");
      }
    } finally {
      if (locationController.current === controller) {
        locationController.current = null;
        setAddressLookup("idle");
      }
    }
  }

  function changeDetails(patch: Partial<LandDetails>) {
    if (pending.current) return;
    changed(Object.keys(patch));
    setDraft((current) => ({
      ...current,
      details: { ...current.details, ...patch },
    }));
  }

  function showError(cause: unknown) {
    setError(
      cause instanceof Error ? cause.message : "Не удалось сохранить данные",
    );
    setFields(cause instanceof LandApiError ? cause.fields : {});
    setSaved(false);
    setValidationAttempt((attempt) => attempt + 1);
  }

  async function run(action: () => Promise<void>) {
    if (pending.current || locationController.current || !canSave) return;
    pending.current = true;
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      await action();
    } catch (cause) {
      showError(cause);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function save() {
    if (Object.keys(shareLimitErrors).length) {
      throw new LandApiError("Проверьте количество долей.", 400, shareLimitErrors);
    }
    const payload = {
      kind: form.kind,
      providerId,
      title: form.title,
      description: form.description,
      purposes: form.purposes,
      priceRubles: form.priceRubles,
      phone: form.phone,
      showPhone: form.showPhone,
      ...(selection
        ? {
            details: {
              scope: d.scope,
              result: d.result,
              timeline: d.timeline,
              priceMode: d.priceMode,
              priceUnit: d.priceUnit,
              allRussia: d.allRussia,
              places: d.allRussia
                ? []
                : places.map((place) =>
                    place.kind === "city"
                      ? { kind: "city", cityId: place.cityId }
                      : { kind: "region", regionCode: place.regionCode },
                  ),
            },
          }
        : {
            dealType: form.dealType,
            sellerRelation: form.sellerRelation,
            cadastralNumber: form.cadastralNumber,
            areaM2: form.areaM2,
            category: form.category,
            permittedUses: form.permittedUses,
            cityId: form.cityId,
            address: form.address,
            latitude: form.latitude,
            longitude: form.longitude,
            details: { ...d, requestDocumentReview: verify },
          }),
      ...(record ? { version: record.version } : {}),
    };
    const row = await landApi<LandListing>(record ? `/${record.id}` : "", {
      method: record ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setRecord(row);
    setFields({});
    return row;
  }

  function saveDraft() {
    void run(async () => {
      await save();
      setSaved(true);
    });
  }

  function submit() {
    void run(async () => {
      const row = await save();
      if (!selection && verify && !row.documents?.length) {
        throw new LandApiError(
          "Добавьте документ для проверки или снимите отметку.",
          400,
          {
            documents: "Добавьте хотя бы один документ для проверки.",
          },
        );
      }
      await landApi(`/${row.id}/action`, {
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          version: row.version,
          verifyDocuments: !selection && verify,
        }),
      });
      router.push("/lands/mine?submitted=1");
    });
  }

  function upload(files: File[], kind: "PHOTO" | "DOCUMENT") {
    if (!files.length) return;
    void run(async () => {
      let row = await save();
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        body.set("kind", kind);
        body.set("version", String(row.version));
        const result = await landApi<{ version: number }>(`/${row.id}/media`, {
          method: "POST",
          body,
        });
        setRecord({ ...row, version: result.version });
        row = await landApi<LandListing>(`/${row.id}`);
        setRecord(row);
      }
      setSaved(true);
    });
  }

  function updateMedia(id: string, cover = false) {
    if (!record) return;
    void run(async () => {
      const result = await landApi<{ version: number }>(`/media/${id}`, {
        method: cover ? "PATCH" : "DELETE",
        body: JSON.stringify({ version: record.version }),
      });
      setRecord({ ...record, version: result.version });
      const next = await landApi<LandListing>(`/${record.id}`);
      setRecord(next);
    });
  }

  if (status === "loading")
    return (
      <Skeleton
        height={600}
        sx={{ m: 3 }}
      />
    );
  if (!session?.user) {
    return (
      <Stack
        spacing={2}
        sx={{
          p: 4,
          alignItems: "flex-start",
        }}
      >
        <Typography variant="h5">
          Войдите, чтобы разместить объявление
        </Typography>
        <Button
          component={Link}
          href={`/signin?returnTo=${encodeURIComponent(`/lands/new?kind=${initialKind}`)}`}
          variant="contained"
        >
          Войти
        </Button>
      </Stack>
    );
  }

  function locationHint() {
    if (addressLookup === "loading") return "Ищем координаты выбранного адреса…";
    if (addressLookup === "expired") return "Источник подсказок изменился. Выберите адрес из списка ещё раз.";
    if (addressLookup === "missing" || addressLookup === "error") {
      const message = addressLookup === "missing"
        ? "Для этого адреса нет координат."
        : "Не удалось загрузить координаты адреса.";
      return hasParcelPoint
        ? `${message} Проверьте текущую точку на карте.`
        : `${message} Отметьте участок на карте или введите координаты.`;
    }
    if (cityLocation.loading) return "Ищем центр населённого пункта…";
    if (cityLocation.center)
      return "Метка в центре населённого пункта. Уточните место участка по адресу или нажатием на карту.";
    if (previewCity)
      return cityLocation.failed
        ? "Не удалось загрузить центр. Выберите адрес или отметьте участок на карте."
        : "У этого населённого пункта нет координат. Выберите адрес или отметьте участок на карте.";
    if (addressPoint)
      return `${addressPointAccuracy(addressPoint).caption} При необходимости уточните место участка на карте.`;
    return "Отметьте точку на карте или введите координаты.";
  }

  const inputs = landEditorInputs(
    form,
    { ...fields, ...shareLimitErrors },
    busy,
    change,
    changeDetails,
  );
  const announcement = (
    <LandFormCard
      title={selection ? "Объявление об услуге" : "Объявление для покупателей"}
      icon={<VisibilityOutlined />}
    >
      {inputs.field("title", "Название")}
      {inputs.field("description", "Описание", {
        rows: 2,
        helper: "От 30 символов для публикации.",
      })}
      <LandPhotos
        files={record?.photos ?? []}
        disabled={busy || !canSave}
        onUpload={(files) => upload(files, "PHOTO")}
        onRemove={(id) => updateMedia(id)}
        onCover={(id) => updateMedia(id, true)}
      />
    </LandFormCard>
  );
  const locationMap = (
    <LandMap
      fillHeight
      previewCity={mapCity}
      citySource={cityLocation.source}
      addressPoint={addressPoint}
      point={{
        latitude: form.latitude,
        longitude: form.longitude,
      }}
      onPick={(latitude, longitude) => change({ latitude, longitude })}
    />
  );
  const saveButton = (
    <Button
      type="button"
      variant="outlined"
      disabled={busy || !canSave}
      onClick={saveDraft}
    >
      Сохранить черновик
    </Button>
  );
  const subtitle = selection
    ? "Услуга подбора участка"
    : form.dealType === "SHARE"
      ? "Продажа доли"
      : form.dealType === "LEASE_ASSIGNMENT"
        ? "Уступка аренды участка"
        : "Продажа участка";

  return (
    <Box
      ref={formRef}
      component="form"
      noValidate
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      sx={{
        width: "100%",
        maxWidth: 1272,
        mx: "auto",
        px: {
          xs: 2,
          tablet: 4,
        },
        pt: {
          xs: 2,
          tablet: 3.5,
        },
        pb: {
          xs: 3,
          tablet: 6,
        },
        "& .MuiInputLabel-root, & .MuiFormLabel-root": {
          fontSize: "0.8125rem",
          fontWeight: 700,
          lineHeight: 1.45,
          mb: 0.75,
        },
        "& .MuiFormHelperText-root": {
          fontSize: "0.8125rem",
          lineHeight: 1.4,
          mx: 0,
          mt: 0.75,
        },
        "& .MuiOutlinedInput-root": {
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.default, 0.65)
              : "background.paper",
        },
        "& .MuiFormControlLabel-root": {
          m: 0,
          minHeight: {
            xs: 44,
            tablet: 34,
          },
          gap: 0.5,
        },
        "& .MuiFormControlLabel-label": { fontSize: "0.9375rem" },
        "& .MuiCheckbox-root, & .MuiRadio-root": { p: 0.5 },
      }}
    >
      <Stack spacing={{ xs: 2, tablet: 3 }}>
        <Stack spacing={1.5}>
          <Button
            component={Link}
            href="/lands/mine"
            size="small"
            startIcon={<ArrowBackRounded />}
            sx={{
              alignSelf: "flex-start",
              color: "text.secondary",
              px: 0,
            }}
          >
            Мои объявления
          </Button>
          <Stack
            direction={{ xs: "column", tablet: "row" }}
            spacing={1.5}
            sx={{
              alignItems: {
                xs: "flex-start",
                tablet: "center",
              },
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{
                  fontSize: {
                    xs: 26,
                    tablet: 33,
                  },
                  lineHeight: 1.25,
                  fontWeight: 800,
                }}
              >
                {initial ? "Редактирование объявления" : "Новое объявление"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            </Box>
            {saveButton}
          </Stack>
        </Stack>
        {(record?.hasPublishedVersion || record?.status === "PUBLISHED") && (
          <Alert severity="info">
            Пока вы редактируете объявление и модератор проверяет изменения,
            покупатели видят последнюю одобренную версию.
          </Alert>
        )}
        {initial?.moderationReason && (
          <Alert severity="warning">
            Замечание модератора: {initial.moderationReason}
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            ref={errorRef}
            tabIndex={-1}
          >
            {error}
          </Alert>
        )}
        {saved && (
          <Alert
            severity="success"
            role="status"
          >
            Черновик сохранён. Его можно продолжить в «Моих объявлениях».
          </Alert>
        )}

        <Box
          component="fieldset"
          disabled={busy}
          sx={{
            border: 0,
            p: 0,
            m: 0,
            minWidth: 0,
            display: "grid",
            gap: {
              xs: 2,
              tablet: 2.5,
            },
          }}
        >
          {hasProvider && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "12px",
                boxShadow: "none",
              }}
            >
              <LandFieldPair>
                <FormControl
                  disabled={Boolean(record) || busy}
                  sx={{ gridColumn: hasAuthorChoice ? "auto" : "1 / -1" }}
                >
                  <FormLabel id="land-offer-kind">Вид предложения</FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="land-offer-kind"
                    name="kind"
                    value={form.kind}
                    onChange={(event) =>
                      change({
                        kind: event.target.value as LandKind,
                        providerId,
                        priceRubles: null,
                      })
                    }
                    sx={{
                      columnGap: { xs: 1, tablet: 2 },
                      "& .MuiFormControlLabel-label": { fontSize: "0.875rem" },
                    }}
                  >
                    <FormControlLabel
                      value="SALE"
                      control={<Radio size="small" />}
                      label="Продажа / уступка"
                    />
                    <FormControlLabel
                      value="SELECTION"
                      control={<Radio size="small" />}
                      label="Услуга подбора"
                    />
                  </RadioGroup>
                </FormControl>
                {hasAuthorChoice && (
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Профиль автора"
                    name="providerId"
                    value={providerId ?? ""}
                    disabled={Boolean(record) || busy}
                    error={Boolean(fields.providerId)}
                    helperText={fields.providerId}
                    data-land-invalid={Boolean(fields.providerId)}
                    slotProps={{ select: { displayEmpty: true } }}
                    onChange={(event) =>
                      change({ providerId: event.target.value || null })
                    }
                  >
                    {!selection && <MenuItem value="">Личный профиль</MenuItem>}
                    {members.map((m) => (
                      <MenuItem
                        key={m.providerId}
                        value={m.providerId}
                      >
                        {m.providerName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </LandFieldPair>
            </Paper>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                tablet: "repeat(2, minmax(0, 1fr))",
              },
              gap: {
                xs: 2,
                tablet: 2.5,
              },
            }}
          >
            {selection ? (
              <>
                <LandFormCard
                  title="География подбора"
                  icon={<LocationOnOutlined />}
                >
                  <LandCheckbox
                    label="Работаю по всей России"
                    checked={d.allRussia}
                    onChange={(allRussia) => {
                      changeDetails({ allRussia });
                      changed(["places"]);
                    }}
                  />
                  {!d.allRussia && (
                    <Box data-land-invalid={Boolean(fields.places)}>
                      <ServiceGeographyField
                        label="Города и регионы подбора"
                        size="small"
                        value={places}
                        disabled={busy}
                        onChange={(next) => {
                          setPlaces(next);
                          changed(["places"]);
                        }}
                        error={Boolean(fields.places)}
                        helperText={fields.places}
                      />
                    </Box>
                  )}
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700 }}
                  >
                    Для каких задач подходит
                  </Typography>
                  <LandPurposeFields
                    values={form.purposes}
                    onChange={(purposes) => change({ purposes })}
                  />
                </LandFormCard>
                <LandFormCard
                  title="Что получит клиент"
                  icon={<AssignmentOutlined />}
                >
                  {inputs.detail("scope", "Состав работы", { rows: 2 })}
                  {inputs.detail("result", "Результат для клиента", {
                    rows: 2,
                  })}
                  {inputs.detail(
                    "timeline",
                    "Срок или порядок согласования срока",
                  )}
                </LandFormCard>
              </>
            ) : (
              <>
                <LandParcelPassport
                  form={form}
                  inputs={inputs}
                  change={change}
                  errors={fields}
                  disabled={busy}
                  onConfirmNumber={confirmCadastralNumber}
                  locating={addressLookup === "cadastral"}
                  cadastralHint={cadastralHint}
                />
                {announcement}
                <LandFormCard
                  title="Расположение"
                  icon={<LocationOnOutlined />}
                  sidePanel={locationMap}
                >
                  <Box
                    data-land-invalid={Boolean(fields.cityId)}
                    sx={{
                      "& > div > .MuiTypography-body2": {
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        mb: 0.75,
                      },
                      "& > div > div:first-of-type": {
                        display: "flex",
                        border: "1px solid",
                        borderColor: fields.cityId ? "error.main" : "divider",
                        borderRadius: 1,
                        bgcolor: "background.default",
                      },
                    }}
                  >
                    <LocationField
                      label="Выберите город"
                      caption="Город или населённый пункт"
                      emptyLabel="Выбрать город"
                      typeToSearch
                      value={city}
                      disabled={busy}
                      error={Boolean(fields.cityId)}
                      helperText={fields.cityId}
                      onChange={selectCity}
                    />
                  </Box>
                  <Box data-land-invalid={Boolean(fields.address)}>
                    <AddressSuggestionsField
                      label="Адрес или ориентир"
                      value={form.address}
                      onChange={(address) => change({ address })}
                      onSelect={(suggestion) => void selectAddress(suggestion)}
                      disabled={busy}
                      error={fields.address}
                    />
                  </Box>
                  <LandFieldPair>
                    {inputs.field("latitude", "Широта", { type: "number" })}
                    {inputs.field("longitude", "Долгота", { type: "number" })}
                  </LandFieldPair>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    aria-live="polite"
                  >
                    {locationHint()}
                  </Typography>
                  {cityMode === "preview" && cityLocation.center && hasParcelPoint && (
                    <Button
                      size="small"
                      onClick={() => setCityMode(null)}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      К точке участка
                    </Button>
                  )}
                </LandFormCard>
                <LandCharacteristics
                  form={form}
                  inputs={inputs}
                  change={change}
                />
              </>
            )}
            <LandDealFields
              form={form}
              inputs={inputs}
              changeDetails={changeDetails}
            />
            {selection && announcement}
            <LandFormCard
              title={selection ? "Связь с клиентом" : "Документы и связь"}
              icon={selection ? <WorkOutlineRounded /> : <LockOutlined />}
            >
              {!selection && (
                <>
                  <Box data-land-invalid={Boolean(fields.documents)}>
                    <LandDocuments
                      files={record?.documents ?? []}
                      disabled={busy}
                      onUpload={(files) => upload(files, "DOCUMENT")}
                      onRemove={(id) => updateMedia(id)}
                    />
                    {fields.documents && (
                      <Typography
                        variant="caption"
                        color="error"
                      >
                        {fields.documents}
                      </Typography>
                    )}
                  </Box>
                  <LandCheckbox
                    label="Запросить проверку документов"
                    checked={verify}
                    onChange={(next) => {
                      changeDetails({ requestDocumentReview: next });
                      changed(["documents"]);
                    }}
                  />
                  <Divider />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 750 }}
                  >
                    Контакты
                  </Typography>
                </>
              )}
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {selection
                  ? "Клиент сможет оставить заявку на подбор участка."
                  : "Покупатель сможет написать в чат объявления."}
              </Typography>
              <LandCheckbox
                label="Показывать телефон"
                checked={form.showPhone}
                onChange={(showPhone) => change({ showPhone })}
              />
              {form.showPhone &&
                inputs.field("phone", "Телефон", { type: "tel" })}
            </LandFormCard>
          </Box>
        </Box>

        <Stack
          direction={{ xs: "column", tablet: "row" }}
          spacing={1.5}
          sx={{
            alignItems: {
              xs: "stretch",
              tablet: "center",
            },
            borderTop: 1,
            borderColor: "divider",
            pt: 2,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: 1 }}
          >
            {saved ? "Черновик сохранён. " : ""}Покупатели увидят эту версию
            после одобрения модератором.
          </Typography>
          {saveButton}
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !canSave}
          >
            Отправить на модерацию
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
