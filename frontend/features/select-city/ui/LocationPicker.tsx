"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto, RegionalCapitalItemDto } from "@/entities/city";
import { displayCityName } from "@/shared/lib/format-city-label";
import {
  capitalLetters,
  filterByLetter,
  filterByPrefix,
  formatRegionShort,
  groupCitiesByLetter,
  includeSelectedCity,
  selectFeaturedCities,
} from "../lib/location-list";
import { loadRegionalCapitals, suggestCities } from "../model/load-regional-capitals";

const CITY_LIST_HEIGHT = 320;

type Props = {
  value: CitySuggestItemDto | null;
  disabled?: boolean;
  fill?: boolean;
  onSelect: (city: CitySuggestItemDto) => void;
};

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function CityRow({
  city,
  selected,
  disabled,
  onSelect,
}: {
  city: CitySuggestItemDto;
  selected: boolean;
  disabled?: boolean;
  onSelect: (city: CitySuggestItemDto) => void;
}) {
  const region = formatRegionShort(city.regionName, city.name);
  return (
    <ListItemButton
      selected={selected}
      disabled={disabled}
      onClick={() => onSelect(city)}
      sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75, px: 2 }}
    >
      <Typography sx={{ fontWeight: 600 }}>{displayCityName(city.name)}</Typography>
      {region ? (
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "right" }}>
          {region}
        </Typography>
      ) : null}
    </ListItemButton>
  );
}

export function LocationPicker({ value, disabled, fill = false, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [capitals, setCapitals] = useState<RegionalCapitalItemDto[]>([]);
  const [capitalsError, setCapitalsError] = useState<string | null>(null);
  const [capitalsLoading, setCapitalsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<CitySuggestItemDto[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(query, 250);
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  useEffect(() => {
    let cancelled = false;
    loadRegionalCapitals()
      .then((cities) => {
        if (cancelled) return;
        setCapitals(cities);
        setCapitalsError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCapitals([]);
        setCapitalsError(error instanceof Error ? error.message : "Не удалось загрузить города");
      })
      .finally(() => {
        if (!cancelled) setCapitalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestError(null);
      setSuggestLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestLoading(true);
    setSuggestError(null);
    suggestCities(q)
      .then((cities) => {
        if (cancelled) return;
        setSuggestions(cities);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSuggestions([]);
        setSuggestError(error instanceof Error ? error.message : "Не удалось найти города");
      })
      .finally(() => {
        if (!cancelled) setSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [letter, trimmed]);

  const featured = useMemo(
    () => includeSelectedCity<CitySuggestItemDto>(selectFeaturedCities(capitals), value),
    [capitals, value],
  );
  const letters = useMemo(() => capitalLetters(capitals), [capitals]);
  const groups = useMemo(() => {
    const prefixed = filterByPrefix(capitals, trimmed);
    return groupCitiesByLetter(filterByLetter(prefixed, trimmed ? null : letter));
  }, [capitals, letter, trimmed]);

  function toggleLetter(next: string) {
    setQuery("");
    setLetter((current) => (current === next ? null : next));
  }

  const listMessage = capitalsLoading
    ? null
    : searching
      ? suggestError ?? (suggestLoading ? null : suggestions.length === 0 ? "Ничего не найдено" : null)
      : capitalsError ?? (groups.length === 0 ? "Ничего не найдено" : null);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: fill ? 1 : undefined,
        minHeight: 0,
        height: fill ? "100%" : undefined,
      }}
    >
      <Box sx={{ p: 2, pb: featured.length > 0 ? 1.5 : 2, flexShrink: 0 }}>
        <TextField
          value={query}
          placeholder="Поиск города"
          disabled={disabled}
          fullWidth
          size="small"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setLetter(null);
            if (next.trim().length >= 2) setSuggestLoading(true);
          }}
          slotProps={{ htmlInput: { "aria-label": "Поиск города" } }}
        />
        {featured.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 3, mb: 2 }}>
            {featured.map((city) => {
              const selected = value?.id === city.id;
              return (
                <Chip
                  key={city.id}
                  label={displayCityName(city.name)}
                  clickable
                  disabled={disabled}
                  onClick={() => onSelect(city)}
                  variant={selected ? "filled" : "outlined"}
                  sx={{
                    alignItems: "center",
                    "& .MuiChip-label": {
                      display: "flex",
                      alignItems: "center",
                      lineHeight: 1,
                      py: 0,
                      transform: "translateY(1px)",
                    },
                    ...(selected
                      ? {
                          bgcolor: "warning.light",
                          color: "warning.contrastText",
                          fontWeight: 700,
                          "&:hover": { bgcolor: "primary.dark" },
                        }
                      : {
                          bgcolor: "background.paper",
                          color: "text.primary",
                          borderColor: "divider",
                          fontWeight: 600,
                        }),
                  }}
                />
              );
            })}
          </Box>
        ) : null}
      </Box>

      {letters.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            columnGap: 0.5,
            rowGap: 0.5,
            px: 2,
            py: 1.25,
            flexShrink: 0,
            bgcolor: "grey.50",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {letters.map((item) => {
            const active = letter === item && !trimmed;
            return (
              <Box
                key={item}
                component="button"
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => toggleLetter(item)}
                sx={{
                  border: 0,
                  bgcolor: "transparent",
                  color: letter && !active ? "action.disabled" : "text.primary",
                  cursor: "pointer",
                  font: "inherit",
                  fontWeight: active ? 800 : 500,
                  px: 0.25,
                  py: 0.25,
                  minWidth: 18,
                }}
              >
                {item}
              </Box>
            );
          })}
        </Box>
      ) : null}

      <Box
        ref={listRef}
        sx={{
          borderTop: letters.length > 0 && !searching ? "none" : "1px dashed",
          borderColor: "grey.300",
          overflow: "auto",
          height: fill ? undefined : CITY_LIST_HEIGHT,
          minHeight: fill ? 0 : CITY_LIST_HEIGHT,
          flex: fill ? 1 : undefined,
          flexShrink: fill ? 1 : 0,
        }}
      >
        {capitalsLoading || (searching && suggestLoading) ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : listMessage ? (
          <Typography variant="body2" sx={{ color: "text.secondary", px: 2, py: 3 }}>
            {listMessage}
          </Typography>
        ) : searching ? (
          <List disablePadding>
            {suggestions.map((city) => (
              <CityRow
                key={city.id}
                city={city}
                selected={value?.id === city.id}
                disabled={disabled}
                onSelect={onSelect}
              />
            ))}
          </List>
        ) : (
          groups.map((group) => (
            <Box key={group.letter}>
              <Typography
                component="div"
                variant="body2"
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  px: 2,
                  pt: 1.5,
                  pb: 1,
                  color: "text.secondary",
                  fontWeight: 700,
                  bgcolor: "background.paper",
                  borderTop: "1px dashed",
                  borderBottom: "1px dashed",
                  borderColor: "grey.300",
                }}
              >
                {group.letter}
              </Typography>
              <List disablePadding>
                {group.cities.map((city) => (
                  <CityRow
                    key={city.id}
                    city={city}
                    selected={value?.id === city.id}
                    disabled={disabled}
                    onSelect={onSelect}
                  />
                ))}
              </List>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
