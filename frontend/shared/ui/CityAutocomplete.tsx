"use client";

import { useEffect, useMemo, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { formatCityLabel } from "@/shared/lib/format-city-label";

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
    async function loadCapitals() {
      try {
        const res = await fetch("/api/cities/capitals");
        const data = (await res.json().catch(() => [])) as CitySuggestItemDto[] | { error?: string };
        if (cancelled) return;
        setCapitals(res.ok && Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCapitals([]);
      }
    }
    void loadCapitals();
    return () => {
      cancelled = true;
    };
  }, [suggestCapitals]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const q = debounced.trim();
      if (q.length < 2) {
        setOptions(suggestCapitals ? filterCapitals(capitals, q) : []);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/cities/suggest?q=${encodeURIComponent(q)}&limit=10`);
        const data = (await res.json().catch(() => [])) as CitySuggestItemDto[] | { error?: string };
        if (cancelled) return;
        if (!res.ok || !Array.isArray(data)) {
          setOptions([]);
          return;
        }
        setOptions(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced, capitals, suggestCapitals]);

  const query = inputValue.trim();
  const noOptionsText =
    query.length < 2 ? "Начните вводить (минимум 2 символа)" : "Ничего не найдено";

  return (
    <Autocomplete
      value={effectiveValue}
      options={options}
      loading={loading}
      noOptionsText={noOptionsText}
      disabled={disabled}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(o) => formatCityLabel(o.name, o.regionName)}
      onChange={(_, next) => onChange(next)}
      inputValue={inputValue}
      onInputChange={(_, next) => setInputValue(next)}
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
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
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

