"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { CitySuggestItemDto } from "@/entities/city";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import { LocationDialog } from "./LocationDialog";
import type { CitySelectScope } from "../model/use-selected-city";
import { useSelectedCity } from "../model/use-selected-city";
import { writeGuestCity } from "../model/guest-city.storage";

type Props = {
  open: boolean;
  scope: CitySelectScope;
  browseCity: CitySuggestItemDto | null;
  onBrowseCity: (city: CitySuggestItemDto | null) => void;
  onClose: () => void;
  onSaved: (city: CitySuggestItemDto | null) => void;
};

export function CitySelectDialog({ open, scope, browseCity, onBrowseCity, onClose, onSaved }: Props) {
  const { status, user } = useAppSelector((s) => s.auth);
  const { update: updateSession } = useSession();

  const saved = useSelectedCity(scope);
  const hasProfileCity = status === "authenticated" && Boolean(user?.customerCity);
  const selected = scope === "customer" && hasProfileCity ? (browseCity ?? saved) : saved;
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
    if (scope === "provider") return "Локация исполнителя";
    return "Локация";
  }, [scope]);

  async function save(next: CitySuggestItemDto | null) {
    setBusy(true);
    setError(null);
    try {
      if (scope === "provider") {
        if (status !== "authenticated" || !user) {
          throw new Error("Нужно войти, чтобы сохранить локацию исполнителя.");
        }
        const membership = getActiveMembership(user);
        const providerId = membership?.providerId ?? null;
        if (!providerId) {
          throw new Error("Не найден активный профиль исполнителя.");
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

      if (status === "authenticated" && user) {
        if (user.customerCity) {
          onBrowseCity(next);
          onSaved(next);
          return;
        }

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
    <LocationDialog
      open={open}
      title={title}
      value={value}
      busy={busy}
      error={error}
      onClose={onClose}
      onSelect={(next) => {
        setValue(next);
        void save(next);
      }}
      onReset={() => {
        void save(null);
      }}
    />
  );
}
