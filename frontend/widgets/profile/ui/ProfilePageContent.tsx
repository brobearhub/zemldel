"use client";

import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { MessengerSettings } from "@/widgets/messenger-settings/ui/MessengerSettings";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Paper,
  Skeleton,
  Stack,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import {
  formatRuPhoneInput,
  RU_PHONE_PREFIX,
  ruPhoneDigits,
} from "@/shared/lib/contact-phone";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import { useAppSelector } from "@/core/store/hooks";
import { type AuthMembership } from "@/core/auth/authorization";
import { CustomerRequestsSection } from "@/widgets/customer-requests/ui/CustomerRequestsSection";
import { CustomerDocumentsSection } from "@/widgets/customer-documents/ui/CustomerDocumentsSection";
import { StoriesPage } from "@/views/stories-page";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import type { CitySuggestItemDto } from "@/entities/city";
import {
  displayCityName,
  formatCityLabel,
} from "@/shared/lib/format-city-label";
import { LocationField } from "@/features/select-city";
import {
  CABINET_SIDEBAR_EXPANDED_W,
  sitePageContainerSx,
} from "@/shared/config/site-layout";

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function providerRoleLabel(role: AuthMembership["role"]) {
  return role === "OWNER" ? "владелец" : "менеджер";
}

function providerTypeLabel(type: AuthMembership["providerType"]) {
  switch (type) {
    case "INDIVIDUAL":
      return "физлицо";
    case "SELF_EMPLOYED":
      return "самозанятый";
    case "SOLE_PROPRIETOR":
      return "ИП";
    case "COMPANY":
      return "организация";
  }
}

const cardSx = { p: { xs: 2.5, md: 3.5 }, borderRadius: 2 } as const;

type ProfileSection = "profile" | "requests" | "documents" | "stories";

function resolveProfileSection(value: string | null): ProfileSection {
  if (
    value === "profile" ||
    value === "requests" ||
    value === "documents" ||
    value === "stories"
  ) {
    return value;
  }

  return "requests";
}

interface ProfileOverviewProps {
  name: string | null | undefined;
  email: string | null | undefined;
  phone: string | null | undefined;
  image: string | null | undefined;
  customerCity:
    | { id: string; name: string; regionCode: string; regionName: string }
    | null
    | undefined;
  memberships: AuthMembership[];
  activeMembership: AuthMembership | null;
  onOpenProfessionalArea: () => void;
  onCreateProvider: () => void;
  onCityUpdated: () => void;
  showProfessionalCabinet: boolean;
  providerSettings?: boolean;
}

function ProfileOverview({
  name,
  email,
  phone,
  image,
  customerCity,
  memberships,
  activeMembership,
  onOpenProfessionalArea,
  onCreateProvider,
  onCityUpdated,
  showProfessionalCabinet,
  providerSettings = false,
}: ProfileOverviewProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageAction, setImageAction] = useState<
    "upload-icon" | "upload-button" | "delete" | null
  >(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const savedPhone = phone ? formatRuPhoneInput(phone) : "";
  const [phoneDraft, setPhoneDraft] = useState(savedPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const phoneInputId = useId();
  const phoneErrorId = `${phoneInputId}-error`;
  const [providerCityError, setProviderCityError] = useState<string | null>(
    null,
  );
  const [customerRating, setCustomerRating] = useState<number | null>(null);
  const [customerReviewCount, setCustomerReviewCount] = useState(0);
  const [profilePublic, setProfilePublic] = useState(false);
  const [switchingProviderId, setSwitchingProviderId] = useState<string | null>(
    null,
  );
  const [switchError, setSwitchError] = useState<string | null>(null);

  const customerCityValue = useMemo<CitySuggestItemDto | null>(() => {
    if (!customerCity) return null;
    return {
      id: customerCity.id,
      name: displayCityName(customerCity.name),
      regionCode: customerCity.regionCode,
      regionName: customerCity.regionName,
      displayName: formatCityLabel(customerCity.name, customerCity.regionName),
    };
  }, [customerCity]);

  useEffect(() => {
    setPhoneDraft(savedPhone);
  }, [savedPhone]);

  const phoneDraftDigits = ruPhoneDigits(phoneDraft);
  const phoneDirty = (phoneDraftDigits ? phoneDraft : "") !== savedPhone;

  useEffect(() => {
    if (providerSettings) return;
    let alive = true;
    void fetch("/api/users/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as {
          customerRating?: number | null;
          customerReviewCount?: number;
          profilePublic?: boolean;
        };
      })
      .then((payload) => {
        if (!alive || !payload) return;
        setCustomerRating(payload.customerRating ?? null);
        setCustomerReviewCount(payload.customerReviewCount ?? 0);
        setProfilePublic(payload.profilePublic === true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [providerSettings]);

  async function updatePhone() {
    if (!phoneDirty || busy || phoneSaving) return;
    if (phoneDraftDigits && phoneDraftDigits.length !== 10) {
      setPhoneError("Введите 10 цифр после +7");
      return;
    }

    setPhoneSaving(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phoneDraftDigits ? phoneDraft : null }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setPhoneError(
          payload.message ?? payload.error ?? "Не удалось обновить телефон",
        );
        return;
      }
      await updateSession();
    } catch {
      setPhoneError("Не удалось обновить телефон");
    } finally {
      setPhoneSaving(false);
    }
  }

  async function updateCustomerCity(next: CitySuggestItemDto | null) {
    setBusy(true);
    setCityError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerCityId: next?.id ?? null }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setCityError(payload.error ?? "Не удалось обновить локацию");
        return;
      }
      await updateSession();
      onCityUpdated();
    } catch {
      setCityError("Не удалось обновить локацию");
    } finally {
      setBusy(false);
    }
  }

  async function uploadProfileImage(
    file: File,
    source: "upload-icon" | "upload-button",
  ) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setImageError("Поддерживаются только JPG, PNG или WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Максимальный размер изображения — 5 МБ.");
      return;
    }

    setImageBusy(true);
    setImageAction(source);
    setImageError(null);
    setImageSuccess(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/users/me/image", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json().catch(() => null)) as
        { error?: string } | { image?: string | null } | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Не удалось загрузить фото")
            : "Не удалось загрузить фото",
        );
      }
      await updateSession();
      router.refresh();
      setImageSuccess("Фото профиля обновлено.");
    } catch (e) {
      setImageError(
        e instanceof Error ? e.message : "Не удалось загрузить фото",
      );
    } finally {
      setImageBusy(false);
      setImageAction(null);
    }
  }

  async function deleteProfileImage() {
    setImageBusy(true);
    setImageAction("delete");
    setImageError(null);
    setImageSuccess(null);
    try {
      const res = await fetch("/api/users/me/image", { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? (payload.error ?? "Не удалось удалить фото")
            : "Не удалось удалить фото",
        );
      }
      await updateSession();
      router.refresh();
      setImageSuccess("Фото профиля удалено.");
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Не удалось удалить фото");
    } finally {
      setImageBusy(false);
      setImageAction(null);
    }
  }

  const providerCityValue = useMemo<CitySuggestItemDto | null>(() => {
    const city = activeMembership?.providerCity ?? null;
    if (!city) return null;
    return {
      id: city.id,
      name: displayCityName(city.name),
      regionCode: city.regionCode,
      regionName: city.regionName,
      displayName: formatCityLabel(city.name, city.regionName),
    };
  }, [activeMembership?.providerCity]);

  async function updateProviderCity(next: CitySuggestItemDto | null) {
    if (!activeMembership?.providerId) return;
    setBusy(true);
    setProviderCityError(null);
    try {
      const res = await fetch(
        `/api/providers/${activeMembership.providerId}/city`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cityId: next?.id ?? null }),
        },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setProviderCityError(
          payload.error ?? "Не удалось обновить локацию провайдера",
        );
        return;
      }
      await updateSession();
      onCityUpdated();
    } catch {
      setProviderCityError("Не удалось обновить локацию провайдера");
    } finally {
      setBusy(false);
    }
  }

  async function openProviderCabinet(providerId: string) {
    if (providerId === activeMembership?.providerId) {
      onOpenProfessionalArea();
      return;
    }

    setSwitchingProviderId(providerId);
    setSwitchError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/activate`, {
        method: "POST",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? "Не удалось открыть кабинет исполнителя",
        );
      }
      await updateSession();
      onOpenProfessionalArea();
    } catch (e) {
      setSwitchError(
        e instanceof Error
          ? e.message
          : "Не удалось открыть кабинет исполнителя",
      );
      setSwitchingProviderId(null);
    }
  }

  function toggleProfilePublic(checked: boolean) {
    setProfilePublic(checked);
    void fetch("/api/users/me/profile-public", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profilePublic: checked }),
    })
      .then((response) => {
        if (!response.ok) setProfilePublic(!checked);
      })
      .catch(() => setProfilePublic(!checked));
  }

  const hasImage = Boolean(image && image.trim().length > 0);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: providerSettings
              ? "minmax(0, 1fr)"
              : "minmax(0, 1fr) minmax(0, 1fr)",
          },
          gap: 3,
          alignItems: "stretch",
        }}
      >
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: { xs: 2, md: "24px 32px" },
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "104px minmax(0, 1fr)",
                  sm: "110px minmax(0, 1fr)",
                },
                gridTemplateAreas: {
                  xs: '"avatar heading" "details details"',
                  sm: '"avatar info"',
                },
                alignItems: "start",
                columnGap: { xs: 2, md: 4 },
                rowGap: 1.5,
                flex: "999 1 320px",
                minWidth: 0,
              }}
            >
              <Stack
                spacing={1}
                sx={{
                  alignItems: "center",
                  gridArea: "avatar",
                  flex: "0 0 auto",
                  width: { xs: 104, md: 110 },
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <CdnAvatar
                    src={image || undefined}
                    sx={{
                      width: { xs: 76, md: 104 },
                      height: { xs: 76, md: 104 },
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontSize: { xs: "1.75rem", md: "2.375rem" },
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(name) ||
                      email?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </CdnAvatar>
                  <IconButton
                    component="label"
                    aria-label="Загрузить фото"
                    disabled={imageBusy}
                    sx={{
                      position: "absolute",
                      right: -6,
                      bottom: -6,
                      width: { xs: 36, md: 40 },
                      height: { xs: 36, md: 40 },
                      border: 3,
                      borderColor: "background.paper",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { bgcolor: "primary.dark" },
                      "&.Mui-disabled": {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      },
                    }}
                  >
                    {imageAction === "upload-icon" ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PhotoCameraOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.currentTarget.value = "";
                        if (f) void uploadProfileImage(f, "upload-icon");
                      }}
                    />
                  </IconButton>
                </Box>
                <Stack sx={{ alignItems: "center", width: "100%" }}>
                  <Button
                    component="label"
                    variant="text"
                    disabled={imageBusy}
                    loading={imageAction === "upload-button"}
                    sx={{
                      fontSize: 13,
                      px: 0.5,
                      py: 0.25,
                      minWidth: 0,
                      minHeight: 32,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Загрузить фото
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.currentTarget.value = "";
                        if (f) void uploadProfileImage(f, "upload-button");
                      }}
                    />
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    loading={imageAction === "delete"}
                    disabled={imageBusy || !hasImage}
                    onClick={() => void deleteProfileImage()}
                    sx={{
                      fontSize: 13,
                      px: 0.5,
                      py: 0.25,
                      minWidth: 0,
                      minHeight: 32,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Удалить фото
                  </Button>
                </Stack>
              </Stack>

              <Stack
                spacing={1}
                sx={{
                  display: { xs: "contents", sm: "flex" },
                  gridArea: { sm: "info" },
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    gridArea: { xs: "heading", sm: "auto" },
                    minWidth: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1.25,
                  }}
                >
                  <Typography
                    component="h2"
                    variant="h2"
                    sx={{
                      fontSize: { xs: "1.375rem", md: "1.75rem" },
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {name || "Пользователь"}
                  </Typography>
                  <Chip
                    size="small"
                    label={activeMembership ? "Исполнитель" : "Заказчик"}
                    sx={{ fontWeight: 700, bgcolor: "background.default" }}
                  />
                </Box>
                <Box
                  sx={{
                    gridArea: { xs: "details", sm: "auto" },
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    flexWrap: { xs: "nowrap", sm: "wrap" },
                    minWidth: 0,
                    width: "100%",
                    gap: { xs: 0.75, sm: "8px 20px" },
                    color: "text.secondary",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      minWidth: 0,
                    }}
                  >
                    <EmailOutlinedIcon sx={{ fontSize: 18 }} />
                    <Typography
                      variant="body2"
                      sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                    >
                      {email || "Email не указан"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <PhoneOutlinedIcon sx={{ fontSize: 18 }} />
                    <Typography variant="body2">
                      {savedPhone || "Телефон не указан"}
                    </Typography>
                  </Box>
                  {!providerSettings ? (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      <StarRoundedIcon
                        sx={{ fontSize: 18, color: "warning.main" }}
                      />
                      <Typography variant="body2">
                        {customerRating != null ? (
                          <>
                            <Box component="b" sx={{ color: "text.primary" }}>
                              {customerRating.toFixed(1).replace(".", ",")}
                            </Box>{" "}
                            · {customerReviewCount} оценок как заказчик
                          </>
                        ) : (
                          "Рейтинг заказчика появится после оценок"
                        )}
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              </Stack>
            </Box>

            {!providerSettings ? (
              <FormControlLabel
                labelPlacement="start"
                control={
                  <Switch
                    checked={profilePublic}
                    onChange={(_event, checked) => toggleProfilePublic(checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {profilePublic ? "Профиль виден другим" : "Профиль скрыт"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {profilePublic
                        ? "Исполнители видят имя и рейтинг"
                        : "Другие видят только имя"}
                    </Typography>
                  </Box>
                }
                sx={{
                  m: 0,
                  flex: { xs: "1 1 100%", md: "1 1 260px" },
                  maxWidth: { md: 320 },
                  justifyContent: "space-between",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: "background.default",
                }}
              />
            ) : null}
          </Box>
        </Paper>
        {!providerSettings ? <MessengerSettings singleColumn /> : null}
      </Box>

      {imageError ? <Alert severity="error">{imageError}</Alert> : null}
      {imageSuccess ? <Alert severity="success">{imageSuccess}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1fr) minmax(0, 1fr)",
          },
          gridTemplateAreas: showProfessionalCabinet
            ? {
                xs: '"cabinet" "contacts" "login"',
                md: '"contacts cabinet" "login cabinet"',
              }
            : { xs: '"contacts" "login"', md: '"contacts login"' },
        }}
      >
        <Paper elevation={0} sx={{ ...cardSx, gridArea: "contacts" }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
                Контакты и локация
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Локация сохраняется сразу после выбора.
              </Typography>
            </Box>

            {cityError ? <Alert severity="error">{cityError}</Alert> : null}

            <FormControl
              variant="outlined"
              size="small"
              error={Boolean(phoneError)}
              disabled={busy || phoneSaving}
              fullWidth
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.target instanceof HTMLElement) event.target.blur();
                  setPhoneDraft(savedPhone);
                  setPhoneError(null);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  void updatePhone();
                }
              }}
            >
              <InputLabel htmlFor={phoneInputId}>Телефон</InputLabel>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                <OutlinedInput
                  id={phoneInputId}
                  value={phoneDraft}
                  onChange={(event) => {
                    setPhoneDraft(formatRuPhoneInput(event.target.value));
                    if (phoneError) setPhoneError(null);
                  }}
                  onPaste={(event) => {
                    // Why: вставленный номер заменяет поле целиком, иначе его «8…» склеится с префиксом.
                    event.preventDefault();
                    setPhoneDraft(
                      formatRuPhoneInput(event.clipboardData.getData("text")),
                    );
                    if (phoneError) setPhoneError(null);
                  }}
                  onFocus={() => {
                    if (!phoneDraft) setPhoneDraft(RU_PHONE_PREFIX);
                  }}
                  onBlur={() => {
                    if (!phoneDraftDigits) setPhoneDraft("");
                  }}
                  placeholder="+7 900 000-00-00"
                  autoComplete="tel"
                  type="tel"
                  fullWidth
                  startAdornment={
                    <InputAdornment position="start">
                      <PhoneOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  }
                  slotProps={{
                    input: {
                      inputMode: "tel",
                      "aria-describedby": phoneError ? phoneErrorId : undefined,
                    },
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    "& .MuiOutlinedInput-notchedOutline": {
                      top: 0,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!phoneDirty || busy || phoneSaving}
                  loading={phoneSaving}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void updatePhone()}
                  sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    alignSelf: "stretch",
                    flexShrink: 0,
                    minHeight: 0,
                    px: 1.5,
                    py: 0,
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                    overflowWrap: "normal",
                  }}
                >
                  Сохранить
                </Button>
                <IconButton
                  aria-label="Сохранить телефон"
                  size="small"
                  disabled={!phoneDirty || busy || phoneSaving}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void updatePhone()}
                  sx={{
                    display: { xs: "inline-flex", sm: "none" },
                    alignSelf: "stretch",
                    flexShrink: 0,
                    minWidth: 40,
                    minHeight: 0,
                    px: 1,
                    py: 0,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&.Mui-disabled": {
                      bgcolor: "action.disabledBackground",
                      color: "action.disabled",
                    },
                  }}
                >
                  {phoneSaving ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <CheckIcon fontSize="small" />
                  )}
                </IconButton>
              </Stack>
              {phoneError ? (
                <FormHelperText id={phoneErrorId}>{phoneError}</FormHelperText>
              ) : null}
            </FormControl>

            {activeMembership && providerCityError ? (
              <Alert severity="error">{providerCityError}</Alert>
            ) : null}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                gap: 2,
              }}
            >
              <LocationField
                label="Ваша локация"
                caption="Ваша локация"
                iconColor="primary"
                value={customerCityValue}
                onChange={updateCustomerCity}
                disabled={busy}
              />
              {activeMembership?.role === "OWNER" ? (
                <LocationField
                  label="Город работы исполнителя"
                  caption="Город работы исполнителя"
                  iconColor="primary"
                  value={providerCityValue}
                  onChange={updateProviderCity}
                  disabled={busy}
                />
              ) : null}
            </Box>
          </Stack>
        </Paper>

        <Paper
          id="security"
          elevation={0}
          sx={{ ...cardSx, gridArea: "login", scrollMarginTop: 100 }}
        >
          <Stack spacing={2}>
            <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
              Способы входа
            </Typography>
            <Box
              sx={{
                display: { xs: "grid", sm: "flex" },
                gridTemplateColumns: { xs: "40px minmax(0, 1fr)", sm: "none" },
                gridTemplateAreas: {
                  xs: '"icon title" "email email" "status status"',
                  sm: "none",
                },
                alignItems: "center",
                columnGap: 1.75,
                rowGap: 1,
                px: 2,
                py: 1.5,
                borderRadius: 3,
                bgcolor: "background.default",
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  gridArea: { xs: "icon", sm: "auto" },
                  flex: "0 0 auto",
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "action.selected",
                }}
              >
                <LockOutlinedIcon fontSize="small" />
              </Box>
              <Box
                sx={{
                  display: { xs: "contents", sm: "block" },
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    gridArea: { xs: "title", sm: "auto" },
                    fontWeight: 700,
                  }}
                >
                  Email и пароль
                </Typography>
                {email ? (
                  <Typography
                    variant="caption"
                    component="p"
                    sx={{
                      gridArea: { xs: "email", sm: "auto" },
                      color: "text.secondary",
                      minWidth: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {email}
                  </Typography>
                ) : null}
              </Box>
              <Chip
                size="small"
                label="Включено"
                sx={{
                  gridArea: { xs: "status", sm: "auto" },
                  justifySelf: "start",
                  fontWeight: 700,
                  bgcolor: "action.selected",
                }}
              />
            </Box>
          </Stack>
        </Paper>

        {showProfessionalCabinet ? (
          <Paper elevation={0} sx={{ ...cardSx, gridArea: "cabinet" }}>
            <Stack spacing={2}>
              <Box>
                <Typography
                  component="h3"
                  variant="h6"
                  sx={{ fontWeight: 700 }}
                >
                  {providerSettings ? "Мои организации" : "Кабинет исполнителя"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {memberships.length > 0
                    ? "Выберите организацию, с которой хотите работать."
                    : "Создайте профиль исполнителя, чтобы предлагать услуги и работать от имени компании в отдельном кабинете."}
                </Typography>
              </Box>

              {switchError ? (
                <Alert severity="error">{switchError}</Alert>
              ) : null}

              {memberships.length > 0 ? (
                <Stack
                  component="ul"
                  spacing={1.25}
                  sx={{ listStyle: "none", m: 0, p: 0 }}
                >
                  {memberships.map((membership) => {
                    const isActive =
                      membership.providerId === activeMembership?.providerId;
                    const isSwitching =
                      switchingProviderId === membership.providerId;
                    const meta = [
                      providerTypeLabel(membership.providerType),
                      providerRoleLabel(membership.role),
                      membership.providerCity
                        ? displayCityName(membership.providerCity.name)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <Box component="li" key={membership.providerId}>
                        <ButtonBase
                          onClick={() =>
                            void openProviderCabinet(membership.providerId)
                          }
                          disabled={switchingProviderId !== null}
                          sx={{
                            width: "100%",
                            minHeight: 72,
                            display: { xs: "grid", sm: "flex" },
                            gridTemplateColumns: {
                              xs: "44px minmax(0, 1fr) 24px",
                              sm: "none",
                            },
                            gridTemplateAreas: {
                              xs: '"title title arrow" "avatar status status" "meta meta meta"',
                              sm: "none",
                            },
                            alignItems: "center",
                            columnGap: 1.5,
                            rowGap: 0.75,
                            px: 2,
                            py: 1.5,
                            textAlign: "left",
                            borderRadius: 3,
                            bgcolor: "background.default",
                            transition: "background-color .15s",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                            "&.Mui-focusVisible": {
                              outline: 2,
                              outlineColor: "primary.dark",
                              outlineOffset: 2,
                            },
                          }}
                        >
                          <CdnAvatar
                            variant="rounded"
                            src={membership.providerImage || undefined}
                            sx={{
                              width: 44,
                              height: 44,
                              gridArea: { xs: "avatar", sm: "auto" },
                              borderRadius: 3,
                              bgcolor: isActive
                                ? "primary.main"
                                : "action.selected",
                              color: "text.primary",
                              fontSize: "1rem",
                              fontWeight: 700,
                            }}
                          >
                            {getInitials(membership.providerName)}
                          </CdnAvatar>
                          <Box
                            sx={{
                              display: { xs: "contents", sm: "block" },
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Box
                              sx={{
                                display: { xs: "contents", sm: "flex" },
                                flexWrap: "wrap",
                                alignItems: "center",
                                columnGap: 1,
                              }}
                            >
                              <Typography
                                sx={{
                                  gridArea: { xs: "title", sm: "auto" },
                                  minWidth: 0,
                                  fontWeight: 700,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {membership.providerName}
                              </Typography>
                              {isActive ? (
                                <Chip
                                  size="small"
                                  label="Активный"
                                  sx={{
                                    gridArea: { xs: "status", sm: "auto" },
                                    justifySelf: "start",
                                    height: "auto",
                                    minHeight: 32,
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    bgcolor: "success.main",
                                    color: "success.contrastText",
                                  }}
                                />
                              ) : null}
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                gridArea: { xs: "meta", sm: "auto" },
                                color: "text.secondary",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {meta}
                            </Typography>
                          </Box>
                          {isSwitching ? (
                            <CircularProgress
                              size={20}
                              sx={{ gridArea: { xs: "arrow", sm: "auto" } }}
                            />
                          ) : (
                            <ChevronRightIcon
                              sx={{
                                gridArea: { xs: "arrow", sm: "auto" },
                                color: "text.secondary",
                              }}
                            />
                          )}
                        </ButtonBase>
                      </Box>
                    );
                  })}
                </Stack>
              ) : null}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onCreateProvider}
                sx={{
                  // Временно скрыто.
                  display: "none",
                  minHeight: 52,
                  borderRadius: 3,
                  borderStyle: "dashed",
                  "&:hover": { borderStyle: "dashed" },
                }}
              >
                Создать профиль исполнителя
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Stack>
  );
}

export default function ProfilePage({
  providerSettings = false,
}: {
  providerSettings?: boolean;
}) {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent providerSettings={providerSettings} />
    </Suspense>
  );
}

function ProfilePageFallback() {
  return (
    <Container maxWidth="xl" sx={sitePageContainerSx}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        sx={{
          alignItems: "flex-start",
        }}
      >
        <Paper
          variant="outlined"
          sx={{ width: { xs: "100%", md: CABINET_SIDEBAR_EXPANDED_W }, p: 3 }}
        >
          <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={52} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={180} />
        </Paper>
        <Paper sx={{ flex: 1, width: "100%", p: 4 }}>
          <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
            <Skeleton variant="circular" width={100} height={100} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={200} />
        </Paper>
      </Stack>
    </Container>
  );
}

function ProfilePageContent({
  providerSettings,
}: {
  providerSettings: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, user } = useAppSelector((state) => state.auth);
  const [selectedSection, setSelectedSection] = useState<ProfileSection>(() =>
    providerSettings
      ? "profile"
      : resolveProfileSection(searchParams.get("section")),
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  /** Старые ссылки исполнителя ведут в его единый кабинет. */
  const isProviderOutsideContact =
    status === "authenticated" &&
    user?.accountKind === "PROVIDER" &&
    !providerSettings;

  useEffect(() => {
    if (!isProviderOutsideContact) return;
    const target =
      selectedSection === "profile"
        ? "/pro/settings/account"
        : "/pro/requests/feed";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("section");
    router.replace(`${target}${params.size ? `?${params}` : ""}`);
  }, [isProviderOutsideContact, selectedSection, searchParams, router]);

  useEffect(() => {
    setSelectedSection(
      providerSettings
        ? "profile"
        : resolveProfileSection(searchParams.get("section")),
    );
  }, [searchParams, providerSettings]);

  const memberships = useMemo(
    () => user?.memberships ?? [],
    [user?.memberships],
  );
  const activeMembership = useMemo(
    () =>
      memberships.find(
        (membership) => membership.providerId === user?.activeProviderId,
      ) ??
      memberships[0] ??
      null,
    [memberships, user?.activeProviderId],
  );

  const handleSelectSection = (section: ProfileSection) => {
    setSelectedSection(section);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("section", section);

    // reset resume-flags for other flows
    if (section !== "requests") nextParams.delete("requestResume");

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  if (
    status === "unknown" ||
    status === "unauthenticated" ||
    isProviderOutsideContact
  ) {
    return <ProfilePageFallback />;
  }

  return (
    <Container
      maxWidth={providerSettings ? false : "xl"}
      disableGutters={providerSettings}
      sx={providerSettings ? { pb: 4 } : sitePageContainerSx}
    >
      {selectedSection !== "documents" ? (
        <Typography
          component="h1"
          variant="h1"
          sx={{
            fontWeight: 700,
            mb: 2,
          }}
        >
          {selectedSection === "stories"
            ? "Сторисы"
            : selectedSection === "profile"
              ? user?.accountKind === "PROVIDER"
                ? "Мои данные"
                : "Профиль"
              : "Лента заявок"}
        </Typography>
      ) : null}
      <CabinetNotices welcome="Аккаунт создан. Здесь будут ваши заявки." />
      {selectedSection === "requests" ? (
        <CustomerRequestsSection
          autoResumeEnabled={searchParams.get("requestResume") === "1"}
          onAutoResumeFinished={() => {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete("requestResume");
            const nextQuery = nextParams.toString();
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
          }}
        />
      ) : selectedSection === "stories" ? (
        <StoriesPage scope="user" authorName={user?.name} />
      ) : selectedSection === "profile" ? (
        <ProfileOverview
          name={user?.name}
          email={user?.email}
          phone={user?.phone}
          image={user?.image}
          customerCity={user?.customerCity}
          memberships={memberships}
          activeMembership={activeMembership}
          onOpenProfessionalArea={() => router.push("/pro/requests/feed")}
          onCreateProvider={() => router.push("/providers/new")}
          onCityUpdated={() => router.refresh()}
          providerSettings={providerSettings}
          showProfessionalCabinet={
            providerSettings
              ? memberships.length > 1
              : user?.systemRole === "PLATFORM_ADMIN"
          }
        />
      ) : (
        <CustomerDocumentsSection />
      )}
    </Container>
  );
}
