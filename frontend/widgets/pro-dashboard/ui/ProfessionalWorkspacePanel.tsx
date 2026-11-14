"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import { ProviderTeamManagement, providerRoleLabel, type ProviderMembersResponse } from "@/widgets/provider-team/ProviderTeamManagement";
import { useAppSelector } from "@/core/store/hooks";
import type { AuthMembership } from "@/core/auth/authorization";

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

export function ProfessionalWorkspacePanel() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [providerMembers, setProviderMembers] =
    useState<ProviderMembersResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [switchingProviderId, setSwitchingProviderId] = useState<string | null>(
    null,
  );
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSaving, setSlugSaving] = useState(false);
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const response = await fetch(
          `/api/providers/${activeMembership.providerId}/members`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | (ProviderMembersResponse & { error?: never })
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Не удалось загрузить команду исполнителя",
          );
        }

        if (!cancelled) {
          setProviderMembers(payload as ProviderMembersResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить команду исполнителя",
          );
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
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не удалось переключить профиль");
      }

      router.refresh();
    } catch (error) {
      setMembersError(
        error instanceof Error
          ? error.message
          : "Не удалось переключить профиль",
      );
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
      const res = await fetch(
        `/api/providers/slug-check?slug=${encodeURIComponent(value)}`,
      );
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
      const res = await fetch(
        `/api/providers/${activeMembership.providerId}/slug`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: slugValue }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        setSlugError(data?.error ?? "Не удалось обновить slug");
        return;
      }

      setSlugEditing(false);
      setSlugValue("");
      setSlugAvailable(null);
      // Reload provider members to get fresh slug
      const membersRes = await fetch(
        `/api/providers/${activeMembership.providerId}/members`,
        { cache: "no-store" },
      );
      const membersData = (await membersRes.json()) as ProviderMembersResponse;
      setProviderMembers(membersData);
      router.refresh();
    } catch {
      setSlugError("Не удалось обновить slug");
    } finally {
      setSlugSaving(false);
    }
  }

  if (!activeMembership) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
          <BusinessCenterOutlinedIcon color="action" />
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
              }}
            >
              Активный профиль исполнителя
            </Typography>
            <Typography
              sx={{
                fontWeight: 600,
              }}
            >
              {providerMembers?.name ?? activeMembership.providerName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Тип: {providerTypeLabel(activeMembership.providerType)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Роль: {providerRoleLabel(activeMembership.role)}
            </Typography>
            {providerMembers?.slug ? (
              <Box sx={{ mt: 0.5 }}>
                {slugEditing ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {slugError ? (
                      <Alert severity="error" sx={{ py: 0 }}>
                        {slugError}
                      </Alert>
                    ) : null}
                    <TextField
                      label="Адрес профиля"
                      value={slugValue}
                      onChange={handleSlugInputChange}
                      disabled={slugSaving}
                      size="small"
                      fullWidth
                      helperText={
                        slugChecking
                          ? "Проверяем..."
                          : slugValue &&
                              !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)
                            ? "Только латинские буквы, цифры и дефис"
                            : slugAvailable === true
                              ? `URL: /providers/${slugValue}`
                              : slugAvailable === false
                                ? "Этот slug уже занят"
                                : slugValue
                                  ? `URL: /providers/${slugValue}`
                                  : ""
                      }
                      slotProps={{
                        input: {
                          endAdornment:
                            slugValue && !slugChecking ? (
                              <InputAdornment position="end">
                                {slugAvailable === true ? (
                                  <CheckCircleOutlineIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                ) : slugAvailable === false ? (
                                  <HighlightOffIcon
                                    color="error"
                                    fontSize="small"
                                  />
                                ) : null}
                              </InputAdornment>
                            ) : undefined,
                        },
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        loading={slugSaving}
                        disabled={slugChecking || !slugAvailable || !slugValue}
                        onClick={() => void handleSlugSave()}
                      >
                        Сохранить
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={slugSaving}
                        onClick={handleSlugEditCancel}
                      >
                        Отмена
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={0.5}
                    sx={{
                      alignItems: { xs: "flex-start", sm: "center" },
                      mt: 0.25,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        overflowWrap: "anywhere",
                      }}
                    >
                      Адрес профиля: <b>{providerMembers.slug}</b>
                    </Typography>
                    {isActiveOwner ? (
                      <Button
                        size="small"
                        startIcon={<EditOutlinedIcon fontSize="small" />}
                        onClick={handleSlugEditStart}
                        sx={{
                          minWidth: 0,
                          p: 0.25,
                          fontSize: "1rem",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
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
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                }}
              >
                Мои профили исполнителя
              </Typography>
              {memberships.map((membership) => {
                const isActive =
                  membership.providerId === activeMembership.providerId;
                return (
                  <Paper
                    key={membership.providerId}
                    variant="outlined"
                    sx={{ p: 1.5 }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", sm: "center" },
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                          }}
                        >
                          {membership.providerName}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                          }}
                        >
                          {providerTypeLabel(membership.providerType)} ·{" "}
                          {providerRoleLabel(membership.role)}
                        </Typography>
                      </Box>
                      <Button
                        variant={isActive ? "contained" : "outlined"}
                        size="small"
                        loading={switchingProviderId === membership.providerId}
                        disabled={
                          isActive ||
                          (switchingProviderId !== null &&
                            switchingProviderId !== membership.providerId)
                        }
                        onClick={() =>
                          handleActivateProvider(membership.providerId)
                        }
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

        {membersError ? <Alert severity="error">{membersError}</Alert> : null}
        {membersLoading ? <Typography>Загрузка команды…</Typography> : null}
        <ProviderTeamManagement
          key={activeMembership.providerId}
          providerId={activeMembership.providerId}
          isOwner={isActiveOwner}
          data={providerMembers}
          onChange={setProviderMembers}
        />
      </Stack>
    </Paper>
  );
}
