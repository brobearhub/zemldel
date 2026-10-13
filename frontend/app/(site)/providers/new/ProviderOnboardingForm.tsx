"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { setLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { LocationField } from "@/features/select-city";

type ProviderType = "SELF_EMPLOYED" | "COMPANY";

export function ProviderOnboardingForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const cityPrefilled = useRef(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProviderType>("SELF_EMPLOYED");
  const [city, setCity] = useState<CitySuggestItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerAcknowledged, setOfferAcknowledged] = useState(false);
  const [offerVersion, setOfferVersion] = useState<string | null>(null);
  const [offerLoadError, setOfferLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (cityPrefilled.current) return;
    const sessionCity = session?.user?.customerCity;
    if (!sessionCity) return;
    cityPrefilled.current = true;
    const region = sessionCity.regionName ? `, ${sessionCity.regionName}` : "";
    setCity({
      id: sessionCity.id,
      name: sessionCity.name,
      regionCode: sessionCity.regionCode,
      regionName: sessionCity.regionName,
      displayName: `${sessionCity.name}${region}`,
    });
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function loadOfferVersion() {
      try {
        const res = await fetch("/api/legal-docs/offer/current", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as
          | { version?: string; error?: string }
          | null;
        if (!res.ok || !payload?.version) {
          throw new Error(payload?.error ?? "Не удалось загрузить оферту");
        }
        if (!cancelled) setOfferVersion(payload.version);
      } catch (e) {
        if (!cancelled) {
          setOfferLoadError(e instanceof Error ? e.message : "Не удалось загрузить оферту");
        }
      }
    }
    void loadOfferVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!offerAcknowledged || !offerVersion) {
      setError("Нужно подтвердить ознакомление с офертой на платные услуги");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/providers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          cityId: city?.id ?? null,
          offerVersion,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Не удалось создать профиль исполнителя");
        return;
      }

      setLastCabinetRole("provider");
      router.push("/pro?welcome=1");
      router.refresh();
    } catch {
      setError("Не удалось создать профиль исполнителя");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <Container maxWidth="sm" sx={sitePageContainerSx}>
        <Paper sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" component="h1" sx={{
                fontWeight: 700
              }}>
                Профиль исполнителя
              </Typography>
              <Typography sx={{
                color: "text.secondary"
              }}>
                Заполните профиль, чтобы публиковать услуги.
              </Typography>
            </Stack>

            <CabinetNotices welcome="Аккаунт исполнителя создан. Осталось заполнить профиль." />

            {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
            {offerLoadError ? <Alert severity="error" role="alert">{offerLoadError}</Alert> : null}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Название профиля"
                  value={name}
                  onChange={handleNameChange}
                  disabled={loading}
                  fullWidth
                  required
                />
                <TextField
                  select
                  label="Тип профиля"
                  value={type}
                  onChange={(event) => setType(event.target.value as ProviderType)}
                  disabled={loading}
                  fullWidth
                >
                  <MenuItem value="SELF_EMPLOYED">Самозанятый / физлицо</MenuItem>
                  <MenuItem value="COMPANY">Компания / организация</MenuItem>
                </TextField>
                <LocationField
                  label="Локация"
                  value={city}
                  onChange={setCity}
                  disabled={loading}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={offerAcknowledged}
                      onChange={(e) => setOfferAcknowledged(e.target.checked)}
                      disabled={loading || !offerVersion}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      Ознакомлен(а) с{" "}
                      <Link
                        href="/offer"
                        target="_blank"
                        style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
                      >
                        офертой на платные услуги платформы
                      </Link>
                      {offerVersion ? ` (версия ${offerVersion})` : ""}. Галочка подтверждает,
                      что текст оферты прочитан. Подключение и оплата услуг выполняются отдельно.
                    </Typography>
                  }
                  sx={{ alignItems: "flex-start", m: 0 }}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !offerAcknowledged || !offerVersion}
                    sx={{ minHeight: 44 }}
                  >
                    Создать
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={loading}
                    sx={{ minHeight: 44 }}
                    onClick={() => {
                      router.push("/pro");
                      router.refresh();
                    }}
                  >
                    Пока пропустить
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}
