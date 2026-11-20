"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import {
  Autocomplete,
  Box,
  CircularProgress,
  Paper,
  type PaperProps,
  TextField,
} from "@mui/material";
import { suggestAddresses } from "@/entities/geocoding/api";
import type { AddressSuggestion, GeocodingSource } from "@/entities/geocoding/types";

const SuggestionsSource = createContext<GeocodingSource | null>(null);

function SuggestionsPaper({ children, ...props }: PaperProps) {
  const source = useContext(SuggestionsSource);
  if (!source) return <Paper {...props}>{children}</Paper>;
  return (
    <Paper {...props}>
      {children}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          px: 1.5,
          py: 0.75,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box
          component="a"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          onMouseDown={(event) => event.preventDefault()}
          sx={{ display: "inline-flex" }}
        >
          {source.logoPath ? (
            <Image
              src={source.logoPath}
              alt={`Подсказки ${source.name}`}
              width={64}
              height={19}
              unoptimized
            />
          ) : (
            source.name
          )}
        </Box>
      </Box>
    </Paper>
  );
}

type Props = {
  label: string;
  value: string;
  onChange: (address: string) => void;
  onSelect: (address: AddressSuggestion) => void;
  disabled: boolean;
  error?: string;
};

export function AddressSuggestionsField({
  label,
  value,
  onChange,
  onSelect,
  disabled,
  error,
}: Props) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    query: string;
    options: AddressSuggestion[];
    source?: GeocodingSource;
    hint?: string;
  } | null>(null);
  const searching = !disabled && query.length >= 2;
  const current = searching && result?.query === query ? result : null;
  const options = current?.options ?? [];

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const { items: options, source } = await suggestAddresses(query, controller.signal);
        if (!controller.signal.aborted) {
          setResult({
            query,
            options,
            source,
            hint: options.length ? undefined : "Совпадений нет. Можно оставить введённый текст.",
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({
            query,
            options: [],
            hint: "Подсказки недоступны. Можно оставить введённый текст.",
          });
        }
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searching]);

  return (
    <SuggestionsSource.Provider value={current?.source ?? null}>
      <Autocomplete<AddressSuggestion, false, false, true>
        freeSolo
        fullWidth
        size="small"
        disabled={disabled}
        value={value || null}
        inputValue={value}
        options={options}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          return options.some((other) => other.label === option.label && other !== option)
            ? option.reference.text
            : option.label;
        }}
        getOptionKey={(option) =>
          typeof option === "string" ? option : (option.reference.key ?? option.reference.text)
        }
        filterOptions={(matches) => matches}
        open={options.length > 0}
        onClose={() => setQuery("")}
        onFocus={() => setQuery(value.trim())}
        onBlur={() => setQuery("")}
        onInputChange={(_, text, reason) => {
          if (reason === "input") {
            onChange(text);
            setQuery(text.trim());
          }
        }}
        onChange={(_, address) => {
          setQuery("");
          if (address && typeof address !== "string") onSelect(address);
          else onChange(address ?? "");
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") event.preventDefault();
          if (event.key === "Escape") setQuery("");
        }}
        slots={{ paper: SuggestionsPaper }}
        renderInput={(params) => (
          <TextField
            {...params}
            name="address"
            label={label}
            error={Boolean(error)}
            helperText={error || current?.hint}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                maxLength: 500,
              },
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {searching && !current && (
                      <CircularProgress
                        size={16}
                        aria-label="Ищем адрес"
                      />
                    )}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
    </SuggestionsSource.Provider>
  );
}
