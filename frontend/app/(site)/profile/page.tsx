"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  IconButton,
  InputAdornment,
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
import { formatRuPhoneInput, RU_PHONE_PREFIX, ruPhoneDigits } from "@/shared/lib/contact-phone";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import { useAppSelector } from "@/core/store/hooks";
import { resolveAccountKind, type AuthMembership } from "@/core/auth/authorization";
import { CustomerRequestsSection } from "@/widgets/customer-requests/ui/CustomerRequestsSection";
import { CustomerPassportSection } from "@/widgets/customer-documents/ui/CustomerPassportSection";
import { StoriesPage } from "@/views/stories-page";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import type { CitySuggestItemDto } from "@/entities/city";
import { displayCityName, formatCityLabel } from "@/shared/lib/format-city-label";
import { LocationField } from "@/features/select-city";
import { CABINET_SIDEBAR_EXPANDED_W, sitePageContainerSx } from "@/shared/config/site-layout";

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
  if (value === "profile" || value === "requests" || value === "documents" || value === "stories") {
    return value;
  }

  return "requests";
}

interface ProfileOverviewProps {
  name: string | null | undefined;
  email: string | null | undefined;
  phone: string | null | undefined;
  image: string | null | undefined;
  customerCity: { id: string; name: string; regionCode: string; regionName: string } | null | undefined;
  memberships: AuthMembership[];
  activeMembership: AuthMembership | null;
  onOpenProfessionalArea: () => void;
  onCreateProvider: () => void;
  onCityUpdated: () => void;
  showProfessionalCabinet: boolean;
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
}: ProfileOverviewProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageAction, setImageAction] = useState<"upload" | "delete" | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const savedPhone = phone ? formatRuPhoneInput(phone) : "";
  const [phoneDraft, setPhoneDraft] = useState(savedPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [providerCityError, setProviderCityError] = useState<string | null>(null);
  const [customerRating, setCustomerRating] = useState<number | null>(null);
  const [customerReviewCount, setCustomerReviewCount] = useState(0);
  const [profilePublic, setProfilePublic] = useState(false);
  const [switchingProviderId, setSwitchingProviderId] = useState<string | null>(null);
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
  }, []);

  async function updatePhone() {
    if (!phoneDirty) return;
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
        const payload = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        setPhoneError(payload.message ?? payload.error ?? "Не удалось обновить телефон");
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
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
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

  async function uploadProfileImage(file: File) {
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
    setImageAction("upload");
    setImageError(null);
    setImageSuccess(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/users/me/image", { method: "POST", body: formData });
      const payload = (await res.json().catch(() => null)) as { error?: string } | { image?: string | null } | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось загрузить фото" : "Не удалось загрузить фото");
      }
      await updateSession();
      router.refresh();
      setImageSuccess("Фото профиля обновлено.");
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Не удалось загрузить фото");
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
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload ? payload.error ?? "Не удалось удалить фото" : "Не удалось удалить фото");
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
      const res = await fetch(`/api/providers/${activeMembership.providerId}/city`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cityId: next?.id ?? null }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setProviderCityError(payload.error ?? "Не удалось обновить локацию провайдера");
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
      const res = await fetch(`/api/providers/${providerId}/activate`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Не удалось открыть кабинет исполнителя");
      }
      await updateSession();
      onOpenProfessionalArea();
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Не удалось открыть кабинет исполнителя");
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
      <Paper elevation={0} sx={cardSx}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: { xs: 2, md: "24px 32px" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, md: 4 }, flex: "999 1 320px", minWidth: 0 }}>
            <Box sx={{ position: "relative", flex: "0 0 auto" }}>
              <CdnAvatar
                src={image || undefined}
                sx={{
                  width: { xs: 76, md: 104 },
                  height: { xs: 76, md: 104 },
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontSize: { xs: 28, md: 38 },
                  fontWeight: 800,
                }}
              >
                {getInitials(name) || email?.charAt(0)?.toUpperCase() || "U"}
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
                }}
              >
                {imageAction === "upload" ? (
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
                    if (f) void uploadProfileImage(f);
                  }}
                />
              </IconButton>
            </Box>

            <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
                <Typography component="h2" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 800, lineHeight: 1.2 }}>
                  {name || "Пользователь"}
                </Typography>
                <Chip
                  size="small"
                  label={activeMembership ? "Исполнитель" : "Заказчик"}
                  sx={{ fontWeight: 700, bgcolor: "action.selected" }}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  flexWrap: "wrap",
                  gap: { xs: 0.75, sm: "8px 20px" },
                  color: "text.secondary",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                  <EmailOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2" noWrap>
                    {email || "Email не указан"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <PhoneOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2">{savedPhone || "Телефон не указан"}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <StarRoundedIcon sx={{ fontSize: 18, color: "warning.main" }} />
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
              </Box>
              <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.5, ml: -1 }}>
                <Button component="label" variant="text" disabled={imageBusy} loading={imageAction === "upload"}>
                  Загрузить фото
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.currentTarget.value = "";
                      if (f) void uploadProfileImage(f);
                    }}
                  />
                </Button>
                <Button
                  variant="text"
                  color="error"
                  loading={imageAction === "delete"}
                  disabled={imageBusy || !hasImage}
                  onClick={() => void deleteProfileImage()}
                >
                  Удалить фото
                </Button>
              </Box>
            </Stack>
          </Box>

          <FormControlLabel
            labelPlacement="start"
            control={<Switch checked={profilePublic} onChange={(_event, checked) => toggleProfilePublic(checked)} />}
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {profilePublic ? "Профиль виден другим" : "Профиль скрыт"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {profilePublic ? "Исполнители видят имя и рейтинг" : "Другие видят только имя"}
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
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              bgcolor: "background.default",
            }}
          />

          <Box
            sx={{
              display: { xs: "grid", sm: "none" },
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1,
              width: "100%",
            }}
          >
            <Button component="label" variant="outlined" disabled={imageBusy} loading={imageAction === "upload"}>
              Загрузить фото
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.currentTarget.value = "";
                  if (f) void uploadProfileImage(f);
                }}
              />
            </Button>
            <Button
              variant="outlined"
              color="error"
              loading={imageAction === "delete"}
              disabled={imageBusy || !hasImage}
              onClick={() => void deleteProfileImage()}
            >
              Удалить фото
            </Button>
          </Box>
        </Box>
      </Paper>

      {imageError ? <Alert severity="error">{imageError}</Alert> : null}
      {imageSuccess ? <Alert severity="success">{imageSuccess}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.1fr) minmax(0, 1fr)" },
          gridTemplateAreas: showProfessionalCabinet
            ? { xs: '"cabinet" "contacts" "login"', md: '"contacts cabinet" "login cabinet"' }
            : { xs: '"contacts" "login"', md: '"contacts login"' },
        }}
      >
        <Paper elevation={0} sx={{ ...cardSx, gridArea: "contacts" }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="h3" variant="h6" sx={{ fontWeight: 800 }}>
                Контакты и локация
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Локация сохраняется сразу после выбора.
              </Typography>
            </Box>

            {cityError ? <Alert severity="error">{cityError}</Alert> : null}

            <TextField
              label="Телефон"
              value={phoneDraft}
              onChange={(event) => {
                setPhoneDraft(formatRuPhoneInput(event.target.value));
                if (phoneError) setPhoneError(null);
              }}
              onPaste={(event) => {
                // Why: вставленный номер заменяет поле целиком, иначе его «8…» склеится с префиксом.
                event.preventDefault();
                setPhoneDraft(formatRuPhoneInput(event.clipboardData.getData("text")));
                if (phoneError) setPhoneError(null);
              }}
              onFocus={() => {
                if (!phoneDraft) setPhoneDraft(RU_PHONE_PREFIX);
              }}
              onBlur={() => {
                if (!phoneDraftDigits) setPhoneDraft("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void updatePhone();
              }}
              error={Boolean(phoneError)}
              helperText={phoneError}
              disabled={busy || phoneSaving}
              placeholder="+7 900 000-00-00"
              autoComplete="tel"
              type="tel"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: phoneDirty ? (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        size="small"
                        loading={phoneSaving}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void updatePhone()}
                        sx={{ display: { xs: "none", sm: "inline-flex" } }}
                      >
                        Сохранить
                      </Button>
                      <IconButton
                        aria-label="Сохранить телефон"
                        edge="end"
                        disabled={phoneSaving}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void updatePhone()}
                        sx={{
                          display: { xs: "inline-flex", sm: "none" },
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          "&:hover": { bgcolor: "primary.dark" },
                        }}
                      >
                        {phoneSaving ? <CircularProgress size={18} color="inherit" /> : <CheckIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
                htmlInput: { inputMode: "tel" },
              }}
            />

            <LocationField
              label="Ваша локация"
              caption="Ваша локация"
              iconColor="primary"
              value={customerCityValue}
              onChange={updateCustomerCity}
              disabled={busy}
            />

            {activeMembership ? (
              <>
                {providerCityError ? <Alert severity="error">{providerCityError}</Alert> : null}
                <LocationField
                  label="Локация провайдера"
                  caption="Локация провайдера"
                  iconColor="primary"
                  value={providerCityValue}
                  onChange={updateProviderCity}
                  disabled={busy}
                />
              </>
            ) : null}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ ...cardSx, gridArea: "login" }}>
          <Stack spacing={2}>
            <Typography component="h3" variant="h6" sx={{ fontWeight: 800 }}>
              Способы входа
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
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
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Email и пароль
                </Typography>
                {email ? (
                  <Typography variant="caption" noWrap component="p" sx={{ color: "text.secondary" }}>
                    {email}
                  </Typography>
                ) : null}
              </Box>
              <Chip size="small" label="Включено" sx={{ fontWeight: 700, bgcolor: "action.selected" }} />
            </Box>
          </Stack>
        </Paper>

        {showProfessionalCabinet ? (
          <Paper elevation={0} sx={{ ...cardSx, gridArea: "cabinet" }}>
            <Stack spacing={2}>
              <Box>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 800 }}>
                  Кабинет исполнителя
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {memberships.length > 0
                    ? "Ваши профили исполнителя. Нажмите на профиль, чтобы открыть его кабинет."
                    : "Создайте профиль исполнителя, чтобы предлагать услуги и работать от имени компании в отдельном кабинете."}
                </Typography>
              </Box>

              {switchError ? <Alert severity="error">{switchError}</Alert> : null}

              {memberships.length > 0 ? (
                <Stack component="ul" spacing={1.25} sx={{ listStyle: "none", m: 0, p: 0 }}>
                  {memberships.map((membership) => {
                    const isActive = membership.providerId === activeMembership?.providerId;
                    const isSwitching = switchingProviderId === membership.providerId;
                    const meta = [
                      providerTypeLabel(membership.providerType),
                      providerRoleLabel(membership.role),
                      membership.providerCity ? displayCityName(membership.providerCity.name) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <Box component="li" key={membership.providerId}>
                        <ButtonBase
                          onClick={() => void openProviderCabinet(membership.providerId)}
                          disabled={switchingProviderId !== null}
                          sx={{
                            width: "100%",
                            minHeight: 72,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.75,
                            px: 2,
                            py: 1.5,
                            textAlign: "left",
                            borderRadius: 3,
                            border: 1,
                            borderColor: isActive ? "primary.main" : "divider",
                            bgcolor: isActive ? "action.hover" : "background.paper",
                            transition: "background-color .15s, border-color .15s",
                            "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                            "&.Mui-focusVisible": { outline: 2, outlineColor: "primary.dark", outlineOffset: 2 },
                          }}
                        >
                          <CdnAvatar
                            variant="rounded"
                            src={membership.providerImage || undefined}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 3,
                              bgcolor: isActive ? "primary.main" : "action.selected",
                              color: "text.primary",
                              fontSize: 15,
                              fontWeight: 800,
                            }}
                          >
                            {getInitials(membership.providerName)}
                          </CdnAvatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1 }}>
                              <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                                {membership.providerName}
                              </Typography>
                              {isActive ? (
                                <Chip
                                  size="small"
                                  label="Активный"
                                  sx={{ height: 20, fontSize: 12, fontWeight: 700, bgcolor: "success.main", color: "success.contrastText" }}
                                />
                              ) : null}
                            </Box>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                              {meta}
                            </Typography>
                          </Box>
                          {isSwitching ? (
                            <CircularProgress size={20} />
                          ) : (
                            <ChevronRightIcon sx={{ color: "text.secondary" }} />
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
                sx={{ minHeight: 52, borderRadius: 3, borderStyle: "dashed", "&:hover": { borderStyle: "dashed" } }}
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageFallback() {
  return (
    <Container maxWidth="xl" sx={sitePageContainerSx}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{
        alignItems: "flex-start"
      }}>
        <Paper variant="outlined" sx={{ width: { xs: "100%", md: CABINET_SIDEBAR_EXPANDED_W }, p: 3 }}>
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

function ProfilePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, user } = useAppSelector((state) => state.auth);
  const { unreadByRequestId } = useChatSocket();
  const requestsUnreadCount = useMemo(
    () => Object.values(unreadByRequestId).reduce((acc, value) => acc + value, 0),
    [unreadByRequestId]
  );
  const [selectedSection, setSelectedSection] = useState<ProfileSection>(() =>
    resolveProfileSection(searchParams.get("section"))
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  /** Why: исполнитель открывает здесь только данные контактного лица — заявки заказчика у него в отдельном аккаунте. */
  const isProviderOutsideContact =
    status === "authenticated" && user?.accountKind === "PROVIDER" && selectedSection !== "profile";

  useEffect(() => {
    if (!isProviderOutsideContact) return;
    router.replace("/pro?notice=customer-account");
  }, [isProviderOutsideContact, router]);

  useEffect(() => {
    setSelectedSection(resolveProfileSection(searchParams.get("section")));
  }, [searchParams]);

  const memberships = useMemo(() => user?.memberships ?? [], [user?.memberships]);
  const activeMembership = useMemo(
    () =>
    memberships.find((membership) => membership.providerId === user?.activeProviderId) ??
      memberships[0] ??
      null,
    [memberships, user?.activeProviderId]
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

  if (status === "unknown" || status === "unauthenticated" || isProviderOutsideContact) {
    return <ProfilePageFallback />;
  }

  return (
    <Container maxWidth="xl" sx={sitePageContainerSx}>
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {selectedSection === "documents"
          ? "Документы"
          : selectedSection === "stories"
            ? "История"
            : selectedSection === "profile"
              ? user?.accountKind === "PROVIDER"
                ? "Контактное лицо"
                : "Профиль"
              : "Заявки"}
      </Typography>
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
          onOpenProfessionalArea={() => router.push("/pro")}
          onCreateProvider={() => router.push("/providers/new")}
          onCityUpdated={() => router.refresh()}
          showProfessionalCabinet={
            resolveAccountKind(user) === "PROVIDER" || user?.systemRole === "PLATFORM_ADMIN"
          }
        />
      ) : (
        <Paper sx={{ width: "100%", p: { xs: 3, md: 4 } }}>
          <CustomerPassportSection />
        </Paper>
      )}
    </Container>
  );
}
