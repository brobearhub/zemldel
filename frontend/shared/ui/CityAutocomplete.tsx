"use client";

import { useEffect, useMemo, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";

type Props = {
  label: string;
  value: CitySuggestItemDto | null;
  onChange: (next: CitySuggestItemDto | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function CityAutocomplete({ label, value, onChange, disabled, placeholder }: Props) {
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebounced(inputValue, 250);
  const [options, setOptions] = useState<CitySuggestItemDto[]>([]);
  const [loading, setLoading] = useState(false);

  const effectiveValue = useMemo(() => {
    if (!value) return null;
    const inOptions = options.find((o) => o.id === value.id);
    return inOptions ?? value;
  }, [options, value]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const q = debounced.trim();
      if (q.length < 2) {
        setOptions([]);
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
  }, [debounced]);

  return (
    <Autocomplete
      value={effectiveValue}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(o) => o.displayName}
      onChange={(_, next) => onChange(next)}
      inputValue={inputValue}
      onInputChange={(_, next) => setInputValue(next)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

