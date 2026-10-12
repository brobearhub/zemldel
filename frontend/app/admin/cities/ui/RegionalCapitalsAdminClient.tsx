"use client";

import { useState } from "react";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import {
  Alert,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto, RegionalCapitalAdminItemDto } from "@/entities/city";
import { formatCityLabel } from "@/shared/lib/format-city-label";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";

type Props = {
  initialCities: RegionalCapitalAdminItemDto[];
};

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { error?: unknown; message?: unknown };
  if (typeof record.error === "string") return record.error;
  if (typeof record.message === "string") return record.message;
  return fallback;
}

function sortCities(cities: RegionalCapitalAdminItemDto[]) {
  return [...cities].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.featured && a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, "ru");
  });
}

function withFeatured(cities: RegionalCapitalAdminItemDto[], cityId: string, featured: boolean) {
  const maxOrder = cities.reduce((max, city) => (city.featured ? Math.max(max, city.sortOrder) : max), 0);
  return sortCities(
    cities.map((city) => {
      if (city.id !== cityId) return city;
      if (!featured) return { ...city, featured: false, sortOrder: 0 };
      if (city.featured) return city;
      return { ...city, featured: true, sortOrder: maxOrder + 1 };
    }),
  );
}

function withMove(cities: RegionalCapitalAdminItemDto[], cityId: string, direction: "up" | "down") {
  const sorted = sortCities(cities);
  const featured = sorted.filter((city) => city.featured);
  const rest = sorted.filter((city) => !city.featured);
  const index = featured.findIndex((city) => city.id === cityId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= featured.length) return sorted;

  const ordered = [...featured];
  const [moved] = ordered.splice(index, 1);
  if (!moved) return sorted;
  ordered.splice(nextIndex, 0, moved);
  return [
    ...ordered.map((city, position) => ({ ...city, sortOrder: position + 1 })),
    ...rest,
  ];
}

export function RegionalCapitalsAdminClient({ initialCities }: Props) {
  const [cities, setCities] = useState(() => sortCities(initialCities));
  const [value, setValue] = useState<CitySuggestItemDto | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featuredCount = cities.filter((city) => city.featured).length;

  async function addCity(next: CitySuggestItemDto) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regional-capitals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cityId: next.id }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (res.status === 409) {
        throw new Error("Этот город уже в списке");
      }
      if (!res.ok) {
        throw new Error(readErrorMessage(payload, "Не удалось добавить город"));
      }
      const created = payload as RegionalCapitalAdminItemDto;
      setCities((prev) => sortCities([...prev.filter((item) => item.id !== created.id), created]));
      setValue(null);
      setPickerKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить город");
    } finally {
      setBusy(false);
    }
  }

  async function removeCity(cityId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regional-capitals/${encodeURIComponent(cityId)}`, {
        method: "DELETE",
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readErrorMessage(payload, "Не удалось удалить город"));
      }
      setCities((prev) => prev.filter((item) => item.id !== cityId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить город");
    } finally {
      setBusy(false);
    }
  }

  async function setFeatured(cityId: string, featured: boolean) {
    const previous = cities;
    setCities(withFeatured(cities, cityId, featured));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regional-capitals/${encodeURIComponent(cityId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featured }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readErrorMessage(payload, "Не удалось обновить эшелон"));
      }
    } catch (cause) {
      setCities(previous);
      setError(cause instanceof Error ? cause.message : "Не удалось обновить эшелон");
    } finally {
      setBusy(false);
    }
  }

  async function moveCity(cityId: string, direction: "up" | "down") {
    const previous = cities;
    setCities(withMove(cities, cityId, direction));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regional-capitals/${encodeURIComponent(cityId)}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readErrorMessage(payload, "Не удалось изменить порядок"));
      }
    } catch (cause) {
      setCities(previous);
      setError(cause instanceof Error ? cause.message : "Не удалось изменить порядок");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined">
        {cities.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
            Список пуст. Найдите город ниже и выберите его.
          </Typography>
        ) : (
          <List disablePadding>
            {cities.map((city, index) => {
              const label = formatCityLabel(city.name, city.regionName);
              const featuredIndex = city.featured ? index : -1;
              return (
                <ListItem
                  key={city.id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      {city.featured ? (
                        <>
                          <IconButton
                            aria-label={`Поднять ${label}`}
                            disabled={busy || featuredIndex === 0}
                            onClick={() => {
                              void moveCity(city.id, "up");
                            }}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label={`Опустить ${label}`}
                            disabled={busy || featuredIndex === featuredCount - 1}
                            onClick={() => {
                              void moveCity(city.id, "down");
                            }}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : null}
                      <IconButton
                        edge="end"
                        aria-label={`Удалить ${label}`}
                        disabled={busy}
                        onClick={() => {
                          void removeCity(city.id);
                        }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  }
                >
                  <Checkbox
                    edge="start"
                    checked={city.featured}
                    disabled={busy}
                    slotProps={{ input: { "aria-label": `Первый эшелон: ${label}` } }}
                    onChange={(event) => {
                      void setFeatured(city.id, event.target.checked);
                    }}
                  />
                  <ListItemText primary={label} />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      <CityAutocomplete
        key={pickerKey}
        label="Добавить город"
        value={value}
        onChange={(next) => {
          setValue(next);
          if (next) void addCity(next);
        }}
        disabled={busy}
        suggestCapitals={false}
        placeholder="Начните вводить (минимум 2 символа)"
      />
    </Stack>
  );
}
