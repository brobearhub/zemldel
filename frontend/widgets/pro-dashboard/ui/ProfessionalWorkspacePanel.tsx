"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import { useAppSelector } from "@/core/store/hooks";
import type { AuthMembership } from "@/core/auth/authorization";

type ProviderMemberRecord = {
  id: string;
  role: "OWNER" | "MANAGER";
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
};

type ProviderMembersResponse = {
  id: string;
  name: string;
  slug: string;
  type: "SELF_EMPLOYED" | "COMPANY";
  members: ProviderMemberRecord[];
};

function providerTypeLabel(type: AuthMembership["providerType"]) {
  return type === "SELF_EMPLOYED" ? "самозанятый / физлицо" : "компания / организация";
}

function providerRoleLabel(role: AuthMembership["role"] | ProviderMemberRecord["role"]) {
  return role === "OWNER" ? "владелец" : "менеджер";
}

export function ProfessionalWorkspacePanel() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [providerMembers, setProviderMembers] = useState<ProviderMembersResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [switchingProviderId, setSwitchingProviderId] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [managerError, setManagerError] = useState<string | null>(null);
  const [managerSuccess, setManagerSuccess] = useState<string | null>(null);
  const [managerLoading, setManagerLoading] = useState(false);

  const [slugEditing, setSlugEditing] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSaving, setSlugSaving] = useState(false);
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberships = useMemo(() => user?.memberships ?? [], [user?.memberships]);
  const activeMembership = useMemo(
    () =>
      memberships.find((membership) => membership.providerId === user?.activeProviderId) ??
      memberships[0] ??
      null,
    [memberships, user?.activeProviderId]
  );
  const isActiveOwner = activeMembership?.role === "OWNER";

  useEffect(() => {
    if (!activeMembership?.providerId) {
      setProviderMembers(null);
      setMembersError(null);
      return;
    }

    let cancelled = false;

    async function loadProviderMembers() {
      setMembersLoading(true);
      setMembersError(null);

      try {
        const response = await fetch(`/api/providers/${activeMembership.providerId}/members`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | (ProviderMembersResponse & { error?: never })
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Не удалось загрузить участников provider"
          );
        }

        if (!cancelled) {
          setProviderMembers(payload as ProviderMembersResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(error instanceof Error ? error.message : "Не удалось загрузить участников provider");
          setProviderMembers(null);
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    void loadProviderMembers();

    return () => {
      cancelled = true;
    };
  }, [activeMembership?.providerId]);

  async function handleActivateProvider(providerId: string) {
    setSwitchingProviderId(providerId);
    setMembersError(null);

    try {
      const response = await fetch(`/api/providers/${providerId}/activate`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не удалось переключить provider");
      }

      router.refresh();
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Не удалось переключить provider");
    } finally {
      setSwitchingProviderId(null);
    }
  }

  const checkSlug = useCallback(async (value: string) => {
    if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      setSlugAvailable(null);
      setSlugChecking(false);
      return;
    }
    setSlugChecking(true);
    try {
      const res = await fetch(`/api/providers/slug-check?slug=${encodeURIComponent(value)}`);
      const data = (await res.json()) as { available?: boolean };
      setSlugAvailable(data.available ?? false);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  function handleSlugInputChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlugValue(raw);
    setSlugAvailable(null);

    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    slugCheckTimer.current = setTimeout(() => void checkSlug(raw), 500);
  }

  function handleSlugEditStart() {
    setSlugValue(providerMembers?.slug ?? "");
    setSlugAvailable(null);
    setSlugError(null);
    setSlugEditing(true);
  }

  function handleSlugEditCancel() {
    setSlugEditing(false);
    setSlugValue("");
    setSlugAvailable(null);
    setSlugError(null);
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
  }

  async function handleSlugSave() {
    if (!activeMembership?.providerId || !slugValue || !slugAvailable) return;

    setSlugSaving(true);
    setSlugError(null);

    try {
      const res = await fetch(`/api/providers/${activeMembership.providerId}/slug`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slugValue }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setSlugError(data?.error ?? "Не удалось обновить slug");
        return;
      }

      setSlugEditing(false);
      setSlugValue("");
      setSlugAvailable(null);
      // Reload provider members to get fresh slug
      const membersRes = await fetch(`/api/providers/${activeMembership.providerId}/members`, { cache: "no-store" });
      const membersData = (await membersRes.json()) as ProviderMembersResponse;
      setProviderMembers(membersData);
    } catch {
      setSlugError("Не удалось обновить slug");
    } finally {
      setSlugSaving(false);
    }
  }

  async function handleAddManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeMembership?.providerId) return;

    setManagerLoading(true);
    setManagerError(null);
    setManagerSuccess(null);

    try {
      const response = await fetch(`/api/providers/${activeMembership.providerId}/members`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: managerEmail }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | ProviderMemberRecord | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Не удалось добавить менеджера"
        );
      }

      setManagerEmail("");
      setManagerSuccess("Менеджер добавлен в профессиональный профиль");

      const membersResponse = await fetch(`/api/providers/${activeMembership.providerId}/members`, {
        cache: "no-store",
      });
      const membersPayload = (await membersResponse.json()) as ProviderMembersResponse;
      setProviderMembers(membersPayload);
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : "Не удалось добавить менеджера");
    } finally {
      setManagerLoading(false);
    }
  }

  if (!activeMembership) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Кабинет профессионала
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Создайте профессиональный профиль, чтобы предлагать услуги как самозанятый или компания.
            </Typography>
          </Box>
          <Box>
            <Button variant="contained" onClick={() => router.push("/providers/new")}>
              Создать provider
            </Button>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
          <BusinessCenterOutlinedIcon color="action" />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              Активный профессиональный профиль
            </Typography>
            <Typography fontWeight={600}>{activeMembership.providerName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Тип: {providerTypeLabel(activeMembership.providerType)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Роль: {providerRoleLabel(activeMembership.role)}
            </Typography>
            {providerMembers?.slug ? (
              <Box sx={{ mt: 0.5 }}>
                {slugEditing ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {slugError ? <Alert severity="error" sx={{ py: 0 }}>{slugError}</Alert> : null}
                    <TextField
                      label="Slug"
                      value={slugValue}
                      onChange={handleSlugInputChange}
                      disabled={slugSaving}
                      size="small"
                      fullWidth
                      helperText={
                        slugChecking
                          ? "Проверяем..."
                          : slugValue && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)
                          ? "Только латинские буквы, цифры и дефис"
                          : slugAvailable === true
                          ? `URL: /providers/${slugValue}`
                          : slugAvailable === false
                          ? "Этот slug уже занят"
                          : slugValue
                          ? `URL: /providers/${slugValue}`
                          : ""
                      }
                      InputProps={{
                        endAdornment: slugValue && !slugChecking ? (
                          <InputAdornment position="end">
                            {slugAvailable === true ? (
                              <CheckCircleOutlineIcon color="success" fontSize="small" />
                            ) : slugAvailable === false ? (
                              <HighlightOffIcon color="error" fontSize="small" />
                            ) : null}
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={slugSaving || slugChecking || !slugAvailable || !slugValue}
                        onClick={() => void handleSlugSave()}
                      >
                        Сохранить
                      </Button>
                      <Button variant="outlined" size="small" disabled={slugSaving} onClick={handleSlugEditCancel}>
                        Отмена
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                    <Typography variant="body2" color="text.secondary">
                      Slug: <b>{providerMembers.slug}</b>
                    </Typography>
                    {isActiveOwner ? (
                      <Button
                        size="small"
                        startIcon={<EditOutlinedIcon fontSize="small" />}
                        onClick={handleSlugEditStart}
                        sx={{ minWidth: 0, p: 0.25, fontSize: "0.75rem" }}
                      >
                        Изменить
                      </Button>
                    ) : null}
                  </Stack>
                )}
              </Box>
            ) : null}
          </Box>
        </Box>

        {memberships.length > 1 ? (
          <>
            <Divider />
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" fontWeight={800}>
                Мои профессиональные профили
              </Typography>
              {memberships.map((membership) => {
                const isActive = membership.providerId === activeMembership.providerId;
                return (
                  <Paper key={membership.providerId} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{membership.providerName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {providerTypeLabel(membership.providerType)} · {providerRoleLabel(membership.role)}
                        </Typography>
                      </Box>
                      <Button
                        variant={isActive ? "contained" : "outlined"}
                        size="small"
                        disabled={isActive || switchingProviderId === membership.providerId}
                        onClick={() => handleActivateProvider(membership.providerId)}
                      >
                        {isActive ? "Активный" : "Сделать активным"}
                      </Button>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </>
        ) : null}

        <Divider />

        <Stack spacing={1.25}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PeopleOutlineOutlinedIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={800}>
              Команда профессионального профиля
            </Typography>
          </Box>

          {membersError ? <Alert severity="error">{membersError}</Alert> : null}

          {membersLoading ? (
            <Typography variant="body2" color="text.secondary">
              Загрузка участников...
            </Typography>
          ) : providerMembers?.members?.length ? (
            <Stack spacing={1}>
              {providerMembers.members.map((member) => (
                <Paper key={member.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{member.user.name || member.user.email}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member.user.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {providerRoleLabel(member.role)}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              В этом профессиональном профиле пока нет участников.
            </Typography>
          )}

          {isActiveOwner ? (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack component="form" spacing={1.5} onSubmit={handleAddManager}>
                <Typography fontWeight={700}>Добавить менеджера</Typography>
                {managerError ? <Alert severity="error">{managerError}</Alert> : null}
                {managerSuccess ? <Alert severity="success">{managerSuccess}</Alert> : null}
                <TextField
                  label="Email пользователя"
                  type="email"
                  value={managerEmail}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setManagerEmail(event.target.value)}
                  disabled={managerLoading}
                  required
                  fullWidth
                  size="small"
                />
                <Button type="submit" variant="contained" disabled={managerLoading}>
                  Добавить менеджера
                </Button>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
