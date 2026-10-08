"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toPublicAssetSrc } from "@/shared/lib/public-asset-src";
import { useRouter } from "next/navigation";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import CopyAllRoundedIcon from "@mui/icons-material/CopyAllRounded";
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { normalizeContactEmailInput } from "@/shared/lib/contact-email";
import { normalizeContactPhoneInput } from "@/shared/lib/contact-phone";

type ProviderType = "SELF_EMPLOYED" | "COMPANY";

type ProviderPublicCity = {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
} | null;

type PublicProviderStat = { value: string; label: string };

export type PublicProviderProfile = {
  id: string;
  name: string;
  type: ProviderType;
  city: ProviderPublicCity;
  /** Фото, загруженное именно у провайдера (без фолбэка на owner user image). */
  providerImage: string | null;
  image: string | null;
  subtitle: string;
  about: string | null;
  phone: string | null;
  email: string | null;
  useOwnEmail: boolean;
  /** Email аккаунта владельца. Приходит только участнику провайдера. */
  ownerEmail?: string | null;
  availabilityLabel: string;
  stats: PublicProviderStat[];
};

type Props = {
  providerId: string;
  providerSlug: string;
  initialProfile: PublicProviderProfile;
  canEditName: boolean;
  imageSide?: "left" | "right";
};

function ProviderImagePlaceholder({ type }: { type: ProviderType }) {
  const isCompany = type === "COMPANY";

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.secondary",
        backgroundImage:
          "radial-gradient(circle at 50% 40%, rgba(160,180,160,0.22) 0%, rgba(255,255,255,0.32) 55%, rgba(36,71,55,0.10) 100%)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: { xs: 180, md: 240 },
          height: { xs: 140, md: 180 },
          opacity: 0.95,
        }}
      >
        {isCompany ? (
          <>
            <PersonRoundedIcon
              sx={{
                position: "absolute",
                left: "8%",
                top: "20%",
                fontSize: { xs: 84, md: 108 },
                color: "primary.dark",
                opacity: 0.22,
              }}
            />
            <PersonRoundedIcon
              sx={{
                position: "absolute",
                right: "8%",
                top: "20%",
                fontSize: { xs: 84, md: 108 },
                color: "primary.dark",
                opacity: 0.22,
              }}
            />
            <PersonRoundedIcon
              sx={{
                position: "absolute",
                left: "50%",
                top: "10%",
                transform: "translateX(-50%)",
                fontSize: { xs: 96, md: 124 },
                color: "primary.dark",
                opacity: 0.55,
                filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.08))",
              }}
            />
          </>
        ) : (
          <PersonRoundedIcon
            sx={{
              position: "absolute",
              left: "50%",
              top: "8%",
              transform: "translateX(-50%)",
              fontSize: { xs: 104, md: 140 },
              color: "primary.dark",
              opacity: 0.55,
              filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.08))",
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function providerTypeLabel(type: ProviderType): string {
  switch (type) {
    case "SELF_EMPLOYED":
      return "Самозанятый / физлицо";
    case "COMPANY":
      return "Компания / организация";
    default:
      return "";
  }
}

type EditId = "name" | "subtitle" | "phone" | "email" | "about" | `stat-${0 | 1 | 2}` | null;

function normalizeNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeRequiredString(value: string): string {
  return value.trim();
}

function getStats3(stats: PublicProviderStat[] | undefined | null): Array<{ value: string; label: string }> {
  const base = Array.isArray(stats) ? stats : [];
  const out = base.slice(0, 3).map((s) => ({ value: s.value ?? "", label: s.label ?? "" }));
  while (out.length < 3) out.push({ value: "", label: "" });
  return out.slice(0, 3);
}

function InlineEditableText(props: {
  id: Exclude<EditId, null>;
  editId: EditId;
  setEditId: (id: EditId) => void;
  canEdit?: boolean;
  disabled?: boolean;
  value: string | null;
  placeholderWhenEmpty?: string;
  typographySx?: object;
  viewVariant?: "h4" | "body1" | "body2" | "caption";
  isMultiline?: boolean;
  minRows?: number;
  normalizeBeforeSave: (draft: string) => string | null;
  validateDraft?: (draft: string) => string | null;
  onSave: (next: string | null) => Promise<void>;
}) {
  const isEditing = props.editId === props.id;
  const [draft, setDraft] = useState<string>(props.value ?? "");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    setDraft(props.value ?? "");
    setFieldError(null);
  }, [isEditing, props.value]);

  async function handleSave() {
    const validationMessage = props.validateDraft ? props.validateDraft(draft) : null;
    if (validationMessage) {
      setFieldError(validationMessage);
      return;
    }

    setSaving(true);
    setFieldError(null);
    try {
      const next = props.normalizeBeforeSave(draft);
      await props.onSave(next);
      props.setEditId(null);
    } catch (e) {
      setFieldError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = props.canEdit ?? true;
  const showPlaceholder = !isEditing && (props.value ?? "").trim().length === 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: props.isMultiline ? "flex-start" : props.viewVariant === "h4" ? "baseline" : "center",
        gap: 1,
        minWidth: 0,
      }}
    >
      {isEditing ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
          <Tooltip title="Сохранить">
            <span>
              <IconButton size="small" onClick={() => void handleSave()} disabled={props.disabled || saving}>
                <CheckRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Отмена">
            <span>
              <IconButton
                size="small"
                onClick={() => props.setEditId(null)}
                disabled={props.disabled || saving}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) : (
        <Tooltip title={canEdit ? "Редактировать" : "Только владелец"}>
          <span>
            <IconButton
              size="small"
              onClick={() => props.setEditId(props.id)}
              disabled={props.disabled || !canEdit}
              sx={{ color: "rgba(255,255,255,0.82)" }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Box sx={{ minWidth: 0, flex: "1 1 0" }}>
        {isEditing ? (
          <Stack spacing={0.75}>
            <TextField
              variant="outlined"
              size="small"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={props.disabled || saving}
              fullWidth
              multiline={props.isMultiline}
              minRows={props.isMultiline ? props.minRows ?? 3 : undefined}
              placeholder={props.placeholderWhenEmpty}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "common.white",
                  borderRadius: 1,
                },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiInputBase-input": {
                  ...(props.typographySx ?? {}),
                  color: "text.primary",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "text.secondary",
                  opacity: 1,
                },
              }}
            />
            {fieldError ? (
              <Typography variant="caption" sx={{ color: "#ffe2df" }}>
                {fieldError}
              </Typography>
            ) : null}
          </Stack>
        ) : (
          <Typography
            variant={props.viewVariant ?? "body2"}
            sx={{
              ...(props.typographySx ?? {}),
              minWidth: 0,
              ...(showPlaceholder ? { opacity: 0.75 } : null),
            }}
          >
            {showPlaceholder ? props.placeholderWhenEmpty ?? "—" : props.value}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function InlineEditableStatCard(props: {
  id: `stat-${0 | 1 | 2}`;
  index: 0 | 1 | 2;
  editId: EditId;
  setEditId: (id: EditId) => void;
  disabled?: boolean;
  stats3: Array<{ value: string; label: string }>;
  onSave: (nextStats3: Array<{ value: string; label: string }>) => Promise<void>;
}) {
  const isEditing = props.editId === props.id;
  const [draftValue, setDraftValue] = useState(props.stats3[props.index]?.value ?? "");
  const [draftLabel, setDraftLabel] = useState(props.stats3[props.index]?.label ?? "");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    setDraftValue(props.stats3[props.index]?.value ?? "");
    setDraftLabel(props.stats3[props.index]?.label ?? "");
    setFieldError(null);
  }, [isEditing, props.index, props.stats3]);

  async function handleSave() {
    const value = draftValue.trim();
    const label = draftLabel.trim();
    if (!value || !label) {
      setFieldError("Заполните value и label");
      return;
    }

    const next = props.stats3.map((s, idx) =>
      idx === props.index ? { value, label } : { value: s.value.trim(), label: s.label.trim() },
    );
    if (next.some((s) => !s.value || !s.label)) {
      setFieldError("Сначала заполните все 3 показателя");
      return;
    }

    setSaving(true);
    setFieldError(null);
    try {
      await props.onSave(next);
      props.setEditId(null);
    } catch (e) {
      setFieldError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const view = props.stats3[props.index] ?? { value: "", label: "" };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        pt: { xs: 1.5, md: 2.25 },
        borderTop: "1px solid",
        borderColor: "rgba(255,255,255,0.18)",
        alignItems: "flex-start",
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        {isEditing ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Tooltip title="Сохранить">
              <span>
                <IconButton size="small" onClick={() => void handleSave()} disabled={props.disabled || saving}>
                  <CheckRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Отмена">
              <span>
                <IconButton size="small" onClick={() => props.setEditId(null)} disabled={props.disabled || saving}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : (
          <Tooltip title="Редактировать">
            <span>
              <IconButton
                size="small"
                onClick={() => props.setEditId(props.id)}
                disabled={props.disabled}
                sx={{ color: "rgba(255,255,255,0.82)" }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <Stack spacing={0.5} sx={{ minWidth: 0, flex: "1 1 0" }}>
        {isEditing ? (
          <>
            <TextField
              variant="outlined"
              size="small"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              disabled={props.disabled || saving}
              placeholder="value"
              sx={{
                "& .MuiOutlinedInput-root": { bgcolor: "common.white", borderRadius: 1 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiInputBase-input": {
                  fontWeight: 800,
                  fontSize: { xs: 24, md: 32 },
                  lineHeight: { xs: 1.334, md: 1.235 },
                  color: "text.primary",
                },
                "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 1 },
              }}
            />
            <TextField
              variant="outlined"
              size="small"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              disabled={props.disabled || saving}
              placeholder="label"
              sx={{
                "& .MuiOutlinedInput-root": { bgcolor: "common.white", borderRadius: 1 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "& .MuiInputBase-input": {
                  color: "text.primary",
                  letterSpacing: "0.4px",
                  fontSize: 12,
                },
                "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 1 },
              }}
            />
            {fieldError ? (
              <Typography variant="caption" sx={{ color: "#ffe2df" }}>
                {fieldError}
              </Typography>
            ) : null}
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: 24, md: 32 },
                lineHeight: { xs: 1.334, md: 1.235 },
                color: "common.white",
              }}
            >
              {view.value}
            </Typography>
            <Typography variant="caption" sx={{ color: "#e8efea", letterSpacing: "0.4px" }}>
              {view.label}
            </Typography>
          </>
        )}
      </Stack>
    </Stack>
  );
}

export function ProviderProfileEditorSection({
  providerId,
  providerSlug,
  initialProfile,
  canEditName,
  imageSide = "left",
}: Props) {
  const router = useRouter();
  const isRight = imageSide === "right";

  const [profile, setProfile] = useState<PublicProviderProfile>(initialProfile);
  const [editId, setEditId] = useState<EditId>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(providerSlug);
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setEditId(null);
  }, [initialProfile]);

  useEffect(() => {
    setSlug(providerSlug);
  }, [providerSlug]);

  const PUBLIC_PROFILE_BASE_URL = "http://zemledelpro.ru/providers/";
  const publicUrl = useMemo(() => `${PUBLIC_PROFILE_BASE_URL}${slug}`, [slug]);
  const previewUrl = useMemo(() => `${PUBLIC_PROFILE_BASE_URL}${slugValue || slug}`, [slugValue, slug]);

  const stats3 = useMemo(() => getStats3(profile.stats), [profile.stats]);
  const hasProviderImage = Boolean(profile.providerImage);

  type PatchProfilePayload = Partial<{
    name: string;
    subtitle: string | null;
    about: string | null;
    phone: string | null;
    email: string | null;
    useOwnEmail: boolean;
    stats: PublicProviderStat[];
  }>;

  async function patchProfile(partial: PatchProfilePayload) {
    const res = await fetch(`/api/providers/${providerId}/public-profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(partial),
    });
    const payload = (await res.json().catch(() => null)) as PublicProviderProfile | { error?: string } | null;
    if (!res.ok) {
      const msg =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Не удалось сохранить профиль";
      throw new Error(msg);
    }
    if (payload && typeof payload === "object" && "id" in payload) {
      setProfile((current) => ({
        ...current,
        ...(payload as PublicProviderProfile),
        ownerEmail: (payload as PublicProviderProfile).ownerEmail ?? current.ownerEmail,
      }));
    }
  }

  async function uploadImage(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Поддерживаются только JPG, PNG или WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Максимальный размер изображения — 10 МБ.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/providers/${providerId}/image`, {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json().catch(() => null)) as PublicProviderProfile | { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Не удалось загрузить изображение");
      }
      if (payload && typeof payload === "object" && "id" in payload) {
        const next = payload as PublicProviderProfile;
        setProfile(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить изображение");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/image`, { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as PublicProviderProfile | { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Не удалось удалить изображение");
      }
      if (payload && typeof payload === "object" && "id" in payload) {
        const next = payload as PublicProviderProfile;
        setProfile(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить изображение");
    } finally {
      setBusy(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleSlugEditStart() {
    setSlugEditing(true);
    setSlugValue(slug);
    setSlugAvailable(true);
    setSlugError(null);
  }

  function handleSlugEditCancel() {
    setSlugEditing(false);
    setSlugValue("");
    setSlugChecking(false);
    setSlugAvailable(null);
    setSlugError(null);
    setSlugSaving(false);
  }

  function handleSlugInputChange(nextRaw: string) {
    const next = nextRaw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlugValue(next);
    setSlugAvailable(null);
    setSlugError(null);
  }

  useEffect(() => {
    if (!slugEditing) return;

    const value = slugValue.trim().toLowerCase();
    if (!value) {
      setSlugChecking(false);
      setSlugAvailable(null);
      return;
    }

    if (value === slug) {
      setSlugChecking(false);
      setSlugAvailable(true);
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      setSlugChecking(false);
      setSlugAvailable(false);
      return;
    }

    setSlugChecking(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/providers/slug-check?slug=${encodeURIComponent(value)}`);
          const data = (await res.json().catch(() => null)) as { available?: boolean } | null;
          if (cancelled) return;
          setSlugAvailable(Boolean(data?.available));
        } catch {
          if (cancelled) return;
          setSlugAvailable(null);
        } finally {
          if (cancelled) return;
          setSlugChecking(false);
        }
      })();
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slugEditing, slugValue, slug]);

  async function handleSlugSave() {
    if (!canEditName) return;
    const value = slugValue.trim().toLowerCase();
    if (!value) {
      setSlugError("Укажите slug");
      return;
    }
    if (value === slug) {
      handleSlugEditCancel();
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      setSlugError("Slug может содержать только латиницу, цифры и дефис");
      return;
    }
    if (!slugAvailable) {
      setSlugError("Этот slug занят");
      return;
    }

    setSlugSaving(true);
    setSlugError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/slug`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: value }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setSlugError(payload?.error ?? "Не удалось обновить slug");
        return;
      }

      setSlug(value);
      handleSlugEditCancel();
      router.refresh();
    } catch {
      setSlugError("Не удалось обновить slug");
    } finally {
      setSlugSaving(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Paper variant="elevation" sx={{ p: { xs: 2, md: 3 }, bgcolor: "primary.main", }}>
        <Stack spacing={2} sx={{ width: "fit-content" }}>
          <Typography variant="h5">
            Профиль провайдера
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              bgcolor: "common.white",
              py: 1,
              px: 2,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "space-between",
              width: { xs: "100%", sm: "fit-content" },
              minWidth: { sm: 520 },
              maxWidth: "100%",
            }}
          >
            {slugEditing ? (
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: "1 1 0" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                    {PUBLIC_PROFILE_BASE_URL}
                  </Typography>
                  <TextField
                    size="small"
                    value={slugValue}
                    onChange={(e) => handleSlugInputChange(e.target.value)}
                    disabled={slugSaving}
                    placeholder="some-slug-provider"
                    sx={{ flex: "1 1 0", minWidth: 120 }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: slugError ? "error.main" : "text.secondary" }}>
                  {slugError
                    ? slugError
                    : slugChecking
                      ? "Проверяем доступность…"
                      : slugValue.trim().toLowerCase() === slug
                        ? "Это текущий URL"
                        : slugAvailable === true
                          ? "Slug свободен"
                          : slugAvailable === false
                            ? "Slug занят или некорректен"
                            : " "}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Превью: <Box component="span" sx={{ fontFamily: "monospace" }}>{previewUrl}</Box>
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary", minWidth: 0 }}>
                <Box component="span" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                  {publicUrl}
                </Box>
              </Typography>
            )}

            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
              {slugEditing ? (
                <>
                  <Tooltip title="Сохранить">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => void handleSlugSave()}
                        disabled={slugSaving || slugChecking || !slugValue.trim() || slugValue.trim().toLowerCase() === slug || slugAvailable !== true}
                      >
                        <CheckRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Отмена">
                    <span>
                      <IconButton size="small" onClick={handleSlugEditCancel} disabled={slugSaving}>
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Скопировать">
                    <span>
                      <IconButton size="small" onClick={() => void copyToClipboard(publicUrl)}>
                        <CopyAllRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={canEditName ? "Редактировать slug" : "Только владелец"}>
                    <span>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<EditOutlinedIcon fontSize="small" />}
                        onClick={handleSlugEditStart}
                        disabled={!canEditName || busy}
                        sx={{ textTransform: "none" }}
                      >
                        Редактировать
                      </Button>
                    </span>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Stack>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </Paper>

      <Paper
        variant="elevation"
        sx={{
          bgcolor: "primary.main",
          py: { xs: "48px", md: "100px" },
          overflowX: "hidden",
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: isRight ? "row-reverse" : "row" },
              gap: { xs: 3, md: 9 },
              alignItems: { xs: "stretch", md: "center" },
            }}
          >
            <Stack
              spacing={1.25}
              sx={{
                width: "100%",
                flexGrow: { md: 0 },
                flexShrink: { md: 1 },
                flexBasis: { md: "clamp(120px, 38vw, 300px)" },
                maxWidth: { md: 300 },
                alignSelf: { md: "flex-start" },
              }}
            >
              <Paper
                
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  bgcolor: "action.hover",
                  width: "100%",
                  height: { xs: 280, md: "auto" },
                  aspectRatio: { xs: "280 / 280", md: "300 / 300" },
                  borderRadius: { xs: 2.5, md: 999 },
                }}
              >
                {profile.image ? (
                  <Image
                    src={toPublicAssetSrc(profile.image)}
                    alt=""
                    fill
                    unoptimized={process.env.NODE_ENV !== "production"}
                    sizes="(max-width: 900px) 100vw, 300px"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                ) : (
                  <ProviderImagePlaceholder type={profile.type} />
                )}

                <Box
                  sx={{
                    position: "absolute",
                    left: "50%",
                    bottom: 18,
                    transform: "translate(-50%, 0)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: { xs: "6px", md: "8px" },
                    px: { xs: "1px", md: "10px" },
                    py: { xs: "1px", md: "1px" },
                    borderRadius: "999px",
                    bgcolor: "rgba(255,255,255,0.93)",
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 8, md: 9 },
                      height: { xs: 8, md: 9 },
                      borderRadius: "50%",
                      bgcolor: "success.main",
                    }}
                  />
                  <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                    {profile.availabilityLabel}
                  </Typography>
                </Box>
              </Paper>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Button
                  variant="text"
                  size="small"
                  component="label"
                  startIcon={<CloudUploadIcon fontSize="small" />}
                  disabled={busy}
                  sx={{
                    borderColor: "rgba(255,255,255,0.35)",
                    color: "common.white",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.46px",
                    py: { xs: "6px", md: "8px" },
                    px: { xs: "10px", md: "12px" },
                    minWidth: 0,
                    flex: "1 1 0",
                    "&:hover": { borderColor: "rgba(255,255,255,0.55)" },
                  }}
                >
                  Загрузить
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.currentTarget.value = "";
                      if (f) void uploadImage(f);
                    }}
                  />
                </Button>

                {hasProviderImage ? (
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() => void deleteImage()}
                    startIcon={<RemoveCircleIcon fontSize="small" />}
                    sx={{
                      textTransform: "uppercase",
                      fontWeight: 600,
                      letterSpacing: "0.46px",
                      py: { xs: "6px", md: "8px" },
                      px: { xs: "8px", md: "11px" },
                      minWidth: 0,
                      flex: "1 1 0",
                      color: "rgba(255,255,255,0.82)",
                      "&:hover": { color: "rgba(255,255,255,0.95)" },
                    }}
                  >
                    Удалить
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Stack spacing={{ xs: 2, md: 3 }} sx={{ minWidth: 0, flex: { md: "1 1 0" } }}>
              <Stack spacing={0.25}>
                <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                  {providerTypeLabel(profile.type)}
                </Typography>
                <InlineEditableText
                  id="name"
                  editId={editId}
                  setEditId={setEditId}
                  canEdit={canEditName}
                  disabled={busy}
                  value={profile.name}
                  viewVariant="h4"
                  typographySx={{ color: "common.white" }}
                  placeholderWhenEmpty="Название провайдера"
                  normalizeBeforeSave={(draft) => normalizeRequiredString(draft) || null}
                  validateDraft={(draft) => {
                    const normalized = draft.trim();
                    if (normalized.length < 2) return "Название должно быть не короче 2 символов";
                    return null;
                  }}
                  onSave={async (next) => {
                    if (!next) throw new Error("Укажите название");
                    setBusy(true);
                    try {
                      await patchProfile({ name: next });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />

                <InlineEditableText
                  id="subtitle"
                  editId={editId}
                  setEditId={setEditId}
                  disabled={busy}
                  value={profile.subtitle}
                  viewVariant="body1"
                  typographySx={{
                    color: "common.white",
                    fontSize: { xs: 14, md: 16 },
                    lineHeight: { xs: 1.43, md: 1.75 },
                  }}
                  placeholderWhenEmpty="Подзаголовок"
                  normalizeBeforeSave={(draft) => normalizeNullableString(draft)}
                  onSave={async (next) => {
                    setBusy(true);
                    try {
                      await patchProfile({ subtitle: next });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </Stack>

              <InlineEditableText
                id="about"
                editId={editId}
                setEditId={setEditId}
                disabled={busy}
                value={profile.about}
                viewVariant="body1"
                typographySx={{
                  color: "common.white",
                  lineHeight: 1.5,
                  fontSize: { xs: 14, md: 16 },
                }}
                placeholderWhenEmpty="Добавьте описание провайдера"
                isMultiline
                minRows={3}
                normalizeBeforeSave={(draft) => normalizeNullableString(draft)}
                onSave={async (next) => {
                  setBusy(true);
                  try {
                    await patchProfile({ about: next });
                  } finally {
                    setBusy(false);
                  }
                }}
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: { xs: 2, md: 3 },
                }}
              >
                {([0, 1, 2] as const).map((idx) => (
                  <InlineEditableStatCard
                    key={idx}
                    id={`stat-${idx}`}
                    index={idx}
                    editId={editId}
                    setEditId={setEditId}
                    disabled={busy}
                    stats3={stats3}
                    onSave={async (nextStats3) => {
                      setBusy(true);
                      try {
                        await patchProfile({ stats: nextStats3 });
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                ))}
              </Box>

              <Stack
                spacing={1}
                sx={{
                  pt: { xs: 2, md: 3 },
                  borderTop: "1px solid",
                  borderColor: "rgba(255,255,255,0.28)",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Эта информация будет отображаться только клиенту после заключения договора
                </Typography>
                <InlineEditableText
                  id="phone"
                  editId={editId}
                  setEditId={setEditId}
                  disabled={busy}
                  value={profile.phone}
                  viewVariant="body2"
                  typographySx={{ color: "common.white" }}
                  placeholderWhenEmpty="Телефон"
                  normalizeBeforeSave={(draft) => normalizeContactPhoneInput(draft).phone}
                  validateDraft={(draft) => normalizeContactPhoneInput(draft).error}
                  onSave={async (next) => {
                    setBusy(true);
                    try {
                      await patchProfile({ phone: next });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />

                <InlineEditableText
                  id="email"
                  editId={editId}
                  setEditId={setEditId}
                  disabled={busy}
                  value={profile.email}
                  viewVariant="body2"
                  typographySx={{ color: "common.white" }}
                  placeholderWhenEmpty="Email"
                  normalizeBeforeSave={(draft) => normalizeContactEmailInput(draft).email}
                  validateDraft={(draft) => normalizeContactEmailInput(draft).error}
                  onSave={async (next) => {
                    setBusy(true);
                    try {
                      await patchProfile({ email: next });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />

                <FormControlLabel
                  sx={{ alignItems: "flex-start", ml: 0 }}
                  control={
                    <Switch
                      checked={profile.useOwnEmail}
                      disabled={busy}
                      onChange={(event) => {
                        setBusy(true);
                        setError(null);
                        void patchProfile({ useOwnEmail: event.target.checked })
                          .catch((cause: unknown) => {
                            setError(cause instanceof Error ? cause.message : "Не удалось сохранить email");
                          })
                          .finally(() => setBusy(false));
                      }}
                      sx={{
                        "& .MuiSwitch-switchBase": {
                          color: "rgba(255,255,255,0.85)",
                        },
                        "& .MuiSwitch-track": {
                          backgroundColor: "rgba(255,255,255,0.35)",
                          opacity: 1,
                        },
                        "& .MuiSwitch-switchBase.Mui-checked": {
                          color: "primary.dark",
                        },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "common.white",
                          opacity: 1,
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ color: "common.white" }}>
                        Использовать свой email
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }}>
                        {profile.useOwnEmail && profile.ownerEmail
                          ? `Если email провайдера не указан, клиент увидит ${profile.ownerEmail}`
                          : "Если email провайдера не указан и переключатель выключен, клиент не увидит email"}
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </Stack>
          </Box>
        </Container>
      </Paper>
    </Stack>
  );
}

