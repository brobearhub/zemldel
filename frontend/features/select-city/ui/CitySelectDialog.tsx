"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import type { CitySelectScope } from "@/features/select-city/model/use-selected-city";
import { useSelectedCity } from "@/features/select-city/model/use-selected-city";
import { writeGuestCity } from "@/features/select-city/model/guest-city.storage";

type Props = {
  open: boolean;
  scope: CitySelectScope;
  onClose: () => void;
  onSaved: (city: CitySuggestItemDto | null) => void;
};

export function CitySelectDialog({ open, scope, onClose, onSaved }: Props) {
  const { status, user } = useAppSelector((s) => s.auth);
  const { update: updateSession } = useSession();

  const selected = useSelectedCity(scope);
  const [value, setValue] = useState<CitySuggestItemDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(selected);
    setError(null);
    setBusy(false);
  }, [open, selected]);

  const title = useMemo(() => {
    if (scope === "provider") return "Локация провайдера";
    return "Локация";
  }, [scope]);

  async function save(next: CitySuggestItemDto | null) {
    setBusy(true);
    setError(null);
    try {
      if (scope === "provider") {
        if (status !== "authenticated" || !user) {
          throw new Error("Нужно войти, чтобы сохранить локацию провайдера.");
        }
        const membership = getActiveMembership(user);
        const providerId = membership?.providerId ?? null;
        if (!providerId) {
          throw new Error("Не найден активный провайдер.");
        }
        const res = await fetch(`/api/providers/${providerId}/city`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cityId: next?.id ?? null }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(payload?.error ?? "Не удалось обновить локацию");
        }
        await updateSession();
        onSaved(next);
        return;
      }

      // customer scope
      if (status === "authenticated" && user) {
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ customerCityId: next?.id ?? null }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(payload?.error ?? "Не удалось обновить локацию");
        }
        await updateSession();
        onSaved(next);
        return;
      }

      // guest
      writeGuestCity(
        next
          ? {
              id: next.id,
              name: next.name,
              regionCode: next.regionCode,
              regionName: next.regionName,
            }
          : null
      );
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить локацию");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {error ? <Alert severity="warning">{error}</Alert> : null}
          <CityAutocomplete
            label="Локация"
            value={value}
            onChange={(next) => {
              setValue(next);
              // UX: сохраняем сразу после выбора
              void save(next);
            }}
            disabled={busy}
            placeholder="Начните вводить (минимум 2 символа)"
            size="medium"
          />
          {busy ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <CircularProgress size={22} />
            </Box>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
          Закрыть
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={() => void save(null)}
          disabled={busy || !value}
          color="inherit"
          sx={{ textTransform: "none" }}
        >
          Сбросить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

