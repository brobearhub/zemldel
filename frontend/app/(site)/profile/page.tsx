"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Avatar,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import { useAppSelector } from "@/core/store/hooks";
import type { AuthMembership } from "@/core/auth/authorization";
import { CustomerOrdersSection } from "@/widgets/customer-orders/ui/CustomerOrdersSection";
import { CustomerRequestsSection } from "@/widgets/customer-requests/ui/CustomerRequestsSection";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";

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

type ProfileSection = "profile" | "orders" | "requests";

function resolveProfileSection(value: string | null): ProfileSection {
  if (value === "profile" || value === "requests") {
    return value;
  }

  return "orders";
}

interface ProfileSidebarProps {
  selectedSection: ProfileSection;
  onSelectSection: (section: ProfileSection) => void;
}

function ProfileSidebar({ selectedSection, onSelectSection }: ProfileSidebarProps) {
  const { unreadByRequestId } = useChatSocket();
  const unreadRequestsTotal = useMemo(
    () => Object.values(unreadByRequestId).reduce((acc, value) => acc + value, 0),
    [unreadByRequestId]
  );
  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        overflow: "hidden",
        borderColor: "divider",
        position: { md: "sticky" },
        top: { md: 112 },
      }}
    >
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
          Профиль
        </Typography>
      </Box>

      <Divider />

      <List dense disablePadding>
        <ListItemButton
          selected={selectedSection === "orders"}
          sx={{
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
          onClick={() => onSelectSection("orders")}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Badge color="error" badgeContent={unreadRequestsTotal} max={99} invisible={unreadRequestsTotal === 0}>
              <ReceiptLongOutlinedIcon />
            </Badge>
          </ListItemIcon>
          <ListItemText
            primary="Заказы"
            secondary="Текущие и завершённые"
            primaryTypographyProps={{ fontWeight: selectedSection === "orders" ? 700 : 600 }}
          />
        </ListItemButton>

        <ListItemButton
          selected={selectedSection === "requests"}
          sx={{
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
          onClick={() => onSelectSection("requests")}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Badge color="error" badgeContent={unreadRequestsTotal} max={99} invisible={unreadRequestsTotal === 0}>
              <AssignmentTurnedInOutlinedIcon />
            </Badge>
          </ListItemIcon>
          <ListItemText
            primary="Заявки"
            secondary="Все ваши заявки"
            primaryTypographyProps={{ fontWeight: selectedSection === "requests" ? 700 : 600 }}
          />
        </ListItemButton>
        <ListItemButton
          selected={selectedSection === "profile"}
          sx={{
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
          onClick={() => onSelectSection("profile")}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <PersonOutlineOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Профиль"
            secondary="Личные данные"
            primaryTypographyProps={{ fontWeight: selectedSection === "profile" ? 700 : 600 }}
          />
        </ListItemButton>
      </List>
    </Paper>
  );
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
  const { update: updateSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [providerCityError, setProviderCityError] = useState<string | null>(null);
  const customerCityValue = useMemo<CitySuggestItemDto | null>(() => {
    if (!customerCity) return null;
    return {
      id: customerCity.id,
      name: customerCity.name,
      regionCode: customerCity.regionCode,
      regionName: customerCity.regionName,
      displayName: `г ${customerCity.name}, ${customerCity.regionName}`,
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
        setCityError(payload.error ?? "Не удалось обновить город");
        return;
      }
      await updateSession();
      onCityUpdated();
    } catch {
      setCityError("Не удалось обновить город");
    } finally {
      setBusy(false);
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
      displayName: `г ${city.name}, ${city.regionName}`,
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
        setProviderCityError(payload.error ?? "Не удалось обновить город провайдера");
        return;
      }
      await updateSession();
      onCityUpdated();
    } catch {
      setProviderCityError("Не удалось обновить город провайдера");
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
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {name || "Пользователь"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <EmailIcon fontSize="small" />
            <Typography variant="body1">{email || "Email не указан"}</Typography>
          </Box>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={700}>
            Данные аккаунта
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Статус: {activeMembership ? "профессионал" : "заказчик"}
          </Typography>
          {activeMembership ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Активный профессиональный профиль: {activeMembership.providerName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Роль: {providerRoleLabel(activeMembership.role)}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Вы используете платформу для поиска и оформления заказов.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Профессиональных профилей: {memberships.length}
          </Typography>

          {cityError ? <Alert severity="error">{cityError}</Alert> : null}

          <Box sx={{ pt: 1 }}>
            <CityAutocomplete
              label="Ваш город"
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
                  label="Город провайдера"
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
          <Typography variant="h6" fontWeight={700}>
            Кабинет профессионала
          </Typography>
          {activeMembership ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Рабочее пространство поставщика услуг вынесено в отдельный кабинет. Активный
                provider: {activeMembership.providerName}.
              </Typography>
              <Box>
                <Button variant="contained" onClick={onOpenProfessionalArea}>
                  Открыть кабинет профессионала
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
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
    <Container maxWidth="xl" sx={{ py: 4, pt: 14, pb: 10 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
        <Paper variant="outlined" sx={{ width: { xs: "100%", md: 320 }, p: 3 }}>
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

  const memberships = user?.memberships ?? [];
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
    <Container maxWidth="xl" sx={{ py: 4, pt: 14, pb: 10 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
        <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
          <ProfileSidebar
            selectedSection={selectedSection}
            onSelectSection={handleSelectSection}
          />
        </Box>

        <Paper sx={{ flex: 1, width: "100%", p: { xs: 3, md: 4 } }}>
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

          {selectedSection === "orders" ? (
            <CustomerOrdersSection />
          ) : null}

          {selectedSection === "requests" ? <CustomerRequestsSection autoResumeEnabled={searchParams.get("requestResume") === "1"} /> : null}
        </Paper>
      </Stack>
    </Container>
  );
}
