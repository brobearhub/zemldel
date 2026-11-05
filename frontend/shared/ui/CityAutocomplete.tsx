"use client";

import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Button, CircularProgress, TextField } from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { fetchCityJson } from "@/shared/lib/fetch-city-json";
import { formatCityLabel } from "@/shared/lib/format-city-label";

function isCityList(value: unknown): value is CitySuggestItemDto[] {
  return Array.isArray(value);
}

type Props = {
  label: string;
  value: CitySuggestItemDto | null;
  onChange: (next: CitySuggestItemDto | null) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: "small" | "medium";
  error?: boolean;
  helperText?: string;
  suggestCapitals?: boolean;
};

function foldCityName(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

function filterCapitals(capitals: CitySuggestItemDto[], query: string) {
  const q = foldCityName(query);
  if (!q) return capitals;
  return capitals.filter((item) => foldCityName(item.name).startsWith(q));
}

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function CityAutocomplete({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  size = "small",
  error,
  helperText,
  suggestCapitals = true,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebounced(inputValue, 250);
  const [capitals, setCapitals] = useState<CitySuggestItemDto[]>([]);
  const [options, setOptions] = useState<CitySuggestItemDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [capitalsLoading, setCapitalsLoading] = useState(false);
  const [capitalsError, setCapitalsError] = useState(false);
  const [suggestError, setSuggestError] = useState(false);
  const [capitalsRetry, setCapitalsRetry] = useState(0);
  const [suggestRetry, setSuggestRetry] = useState(0);

  const effectiveValue = useMemo(() => {
    if (!value) return null;
    const inOptions = options.find((o) => o.id === value.id);
    return inOptions ?? value;
  }, [options, value]);

  useEffect(() => {
    if (!suggestCapitals) {
      setCapitals([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setCapitalsLoading(true);
    setCapitalsError(false);
    void fetchCityJson("/api/cities/capitals", isCityList, controller.signal)
      .then((data) => {
        if (!cancelled) setCapitals(data);
      })
      .catch(() => {
        if (!cancelled) setCapitalsError(true);
      })
      .finally(() => {
        if (!cancelled) setCapitalsLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [suggestCapitals, capitalsRetry]);

  useEffect(() => {
    const q = debounced.trim();
    setSuggestError(false);
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setOptions([]);
    void fetchCityJson(`/api/cities/suggest?q=${encodeURIComponent(q)}&limit=10`, isCityList, controller.signal)
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setSuggestError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debounced, suggestRetry]);

  const query = inputValue.trim();
  const searching = query.length >= 2;
  const busy = searching ? loading || inputValue !== debounced : suggestCapitals && capitalsLoading;
  const failed = searching ? suggestError : suggestCapitals && capitalsError;
  const visibleOptions = searching ? options : suggestCapitals ? filterCapitals(capitals, query) : [];
  const retryButton = (
    <Button
      disabled={disabled || busy}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (searching) {
          setSuggestError(false);
          setLoading(true);
          setSuggestRetry((current) => current + 1);
        } else {
          setCapitalsError(false);
          setCapitalsLoading(true);
          setCapitalsRetry((current) => current + 1);
        }
      }}
    >
      Попробуйте еще раз
    </Button>
  );
  const noOptionsText =
    query.length < 2 ? "Начните вводить (минимум 2 символа)" : "Ничего не найдено";

  return (
    <Autocomplete
      value={effectiveValue}
      options={visibleOptions}
      loading={busy}
      loadingText="Загрузка…"
      noOptionsText={failed ? retryButton : noOptionsText}
      disabled={disabled}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(o) => formatCityLabel(o.name, o.regionName)}
      onChange={(_, next) => onChange(next)}
      inputValue={inputValue}
      onInputChange={(_, next) => {
        setInputValue(next);
        setSuggestError(false);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {busy ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}

