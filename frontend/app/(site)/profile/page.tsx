"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import { useAppSelector } from "@/core/store/hooks";
import type { AuthMembership } from "@/core/auth/authorization";
import { CustomerRequestsSection } from "@/widgets/customer-requests/ui/CustomerRequestsSection";
import { CustomerPassportSection } from "@/widgets/customer-documents/ui/CustomerPassportSection";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
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

function buildLocationDisplayName(locationName: string, regionName: string) {
  const loc = locationName.trim();
  const region = regionName.trim();
  const locKey = loc.toLowerCase();
  const regionKey = region.toLowerCase();
  if (regionKey.includes(locKey)) return loc;
  return `${loc}, ${region}`;
}

type ProfileSection = "profile" | "requests" | "documents";

function resolveProfileSection(value: string | null): ProfileSection {
  if (value === "profile" || value === "requests" || value === "documents") {
    return value;
  }

  return "requests";
}

interface ProfileOverviewProps {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  customerCity: { id: string; name: string; regionCode: string; regionName: string } | null | undefined;
  memberships: AuthMembership[];
  activeMembership: AuthMembership | null;
  onOpenProfessionalArea: () => void;
  onCreateProvider: () => void;
  onCityUpdated: () => void;
}

function ProfileOverview({
  name,
  email,
  image,
  customerCity,
  memberships,
  activeMembership,
  onOpenProfessionalArea,
  onCreateProvider,
  onCityUpdated,
}: ProfileOverviewProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [providerCityError, setProviderCityError] = useState<string | null>(null);

  const customerCityValue = useMemo<CitySuggestItemDto | null>(() => {
    if (!customerCity) return null;
    return {
      id: customerCity.id,
      name: customerCity.name,
      regionCode: customerCity.regionCode,
      regionName: customerCity.regionName,
      displayName: buildLocationDisplayName(customerCity.name, customerCity.regionName),
    };
  }, [customerCity]);

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
    }
  }

  async function deleteProfileImage() {
    setImageBusy(true);
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
    }
  }

  const providerCityValue = useMemo<CitySuggestItemDto | null>(() => {
    const city = activeMembership?.providerCity ?? null;
    if (!city) return null;
    return {
      id: city.id,
      name: city.name,
      regionCode: city.regionCode,
      regionName: city.regionName,
      displayName: buildLocationDisplayName(city.name, city.regionName),
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

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
        <Avatar
          src={image || undefined}
          sx={{
            width: 100,
            height: 100,
            bgcolor: "primary.main",
            fontSize: 40,
            fontWeight: 600,
          }}
        >
          {getInitials(name) || email?.charAt(0)?.toUpperCase() || "U"}
        </Avatar>
        <Box>
          <Typography variant="h4" gutterBottom sx={{
            fontWeight: 600
          }}>
            {name || "Пользователь"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <EmailIcon fontSize="small" />
            <Typography variant="body1">{email || "Email не указан"}</Typography>
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              mt: 1.5
            }}>
            <Button
              variant="outlined"
              component="label"
              disabled={imageBusy}
              sx={{ whiteSpace: "nowrap" }}
            >
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
              disabled={imageBusy || !(image && image.trim().length > 0)}
              onClick={() => void deleteProfileImage()}
              sx={{ whiteSpace: "nowrap" }}
            >
              Удалить фото
            </Button>
          </Stack>
        </Box>
      </Box>

      {imageError ? <Alert severity="error">{imageError}</Alert> : null}
      {imageSuccess ? <Alert severity="success">{imageSuccess}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>
            Данные аккаунта
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Статус: {activeMembership ? "профессионал" : "заказчик"}
          </Typography>
          {activeMembership ? (
            <>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Активный профессиональный профиль: {activeMembership.providerName}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Роль: {providerRoleLabel(activeMembership.role)}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Вы используете платформу для поиска и оформления заказов.
            </Typography>
          )}
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Профессиональных профилей: {memberships.length}
          </Typography>

          {cityError ? <Alert severity="error">{cityError}</Alert> : null}

          <Box sx={{ pt: 1 }}>
            <CityAutocomplete
              label="Ваша локация"
              value={customerCityValue}
              onChange={updateCustomerCity}
              disabled={busy}
              placeholder="Начните вводить (минимум 2 символа)"
            />
          </Box>

          {activeMembership ? (
            <>
              {providerCityError ? <Alert severity="error">{providerCityError}</Alert> : null}
              <Box sx={{ pt: 1 }}>
                <CityAutocomplete
                  label="Локация провайдера"
                  value={providerCityValue}
                  onChange={updateProviderCity}
                  disabled={busy}
                  placeholder="Начните вводить (минимум 2 символа)"
                />
              </Box>
            </>
          ) : null}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>
            Способы входа
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Email и пароль: включено
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>
            Кабинет профессионала
          </Typography>
          {activeMembership ? (
            <>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Рабочее пространство поставщика услуг вынесено в отдельный кабинет. Активный
                provider: {activeMembership.providerName}.
              </Typography>
              <Box>
                <Button variant="contained" onClick={onOpenProfessionalArea}>
                  Перейти в кабинет профессионала
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Создайте профессиональный профиль, чтобы предлагать услуги и работать от имени
                компании в отдельном кабинете.
              </Typography>
              <Box>
                <Button variant="contained" onClick={onCreateProvider}>
                  Создать профессиональный профиль
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </Paper>
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

  if (status === "unknown" || status === "unauthenticated") {
    return <ProfilePageFallback />;
  }

  return (
    <Container maxWidth="xl" sx={sitePageContainerSx}>
      <Paper sx={{ width: "100%", p: { xs: 3, md: 4 } }}>
        {selectedSection === "profile" ? (
          <ProfileOverview
            name={user?.name}
            email={user?.email}
            image={user?.image}
            customerCity={user?.customerCity}
            memberships={memberships}
            activeMembership={activeMembership}
            onOpenProfessionalArea={() => router.push("/pro")}
            onCreateProvider={() => router.push("/providers/new")}
            onCityUpdated={() => router.refresh()}
          />
        ) : null}

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
        ) : null}

        {selectedSection === "documents" ? <CustomerPassportSection /> : null}
      </Paper>
    </Container>
  );
}
