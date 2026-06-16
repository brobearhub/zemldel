"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";

type ProviderType = "SELF_EMPLOYED" | "COMPANY";

export function ProviderOnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProviderType>("SELF_EMPLOYED");
  const [city, setCity] = useState<CitySuggestItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Не удалось создать профиль поставщика");
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch {
      setError("Не удалось создать профиль поставщика");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                Профессиональный профиль
              </Typography>
              <Typography color="text.secondary">
                Можно продолжить как <b>заказчик</b> и вернуться к этому шагу позже.
              </Typography>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

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
                  label="Тип поставщика"
                  value={type}
                  onChange={(event) => setType(event.target.value as ProviderType)}
                  disabled={loading}
                  fullWidth
                >
                  <MenuItem value="SELF_EMPLOYED">Самозанятый / физлицо</MenuItem>
                  <MenuItem value="COMPANY">Компания / организация</MenuItem>
                </TextField>
                <CityAutocomplete
                  label="Локация"
                  value={city}
                  onChange={setCity}
                  disabled={loading}
                  placeholder="Начните вводить (минимум 2 символа)"
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button type="submit" variant="contained" disabled={loading}>
                    Создать
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={loading}
                    onClick={() => {
                      router.push("/");
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
