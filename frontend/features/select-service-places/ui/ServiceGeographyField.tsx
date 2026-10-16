"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MutableRefObject,
} from "react";
import { Autocomplete, Box, Chip, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import type { AutocompleteProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { placeChipLabel, placeKey, type ServicePlace } from "@/entities/service";
import { displayCityName, formatRegionLabel, shortRegionLabel } from "@/shared/lib/format-city-label";

type SuggestItem = {
  kind: "city" | "region";
  id?: string;
  name: string;
  regionCode: string;
  regionName: string;
};

type Props = {
  value: ServicePlace[];
  onChange: (next: ServicePlace[]) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  /** Подпись поля поиска. Без неё остаётся только плейсхолдер. */
  label?: string;
  /** Выбранные места. Поиск может жить отдельно. */
  showChips?: boolean;
  size?: "small" | "medium";
};

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const SUGGEST_GROUP_REGION = "Области";
const SUGGEST_GROUP_CITY = "Населённые пункты";

const PLACE_PAGE_SIZE = 10;

type PlaceSuggestPage = {
  regions: SuggestItem[];
  cities: SuggestItem[];
  hasMore: boolean;
};

function isPlaceSuggestPage(value: unknown): value is PlaceSuggestPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<PlaceSuggestPage>;
  return Array.isArray(page.regions) && Array.isArray(page.cities) && typeof page.hasMore === "boolean";
}

async function fetchPlaceSuggestPage(query: string, offset: number): Promise<PlaceSuggestPage | null> {
  const params = new URLSearchParams({
    q: query,
    limit: String(PLACE_PAGE_SIZE),
    offset: String(offset),
  });
  const response = await fetch(`/api/cities/place-suggest?${params.toString()}`);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isPlaceSuggestPage(data)) return null;
  return data;
}

type SuggestListboxProps = HTMLAttributes<HTMLUListElement> & {
  onNearEnd?: () => void;
  optionCount?: number;
  savedScroll?: MutableRefObject<number>;
  ownerState?: unknown;
  sx?: SxProps<Theme>;
};

const GeographySuggestListbox = forwardRef<HTMLUListElement, SuggestListboxProps>(function GeographySuggestListbox(
  { children, onNearEnd, onScroll, optionCount = 0, ownerState: _ownerState, savedScroll: savedScrollRef, sx, ...props },
  ref,
) {
  const endArmed = useRef(true);
  const nodeRef = useRef<HTMLUListElement | null>(null);
  const restoring = useRef(false);
  const seenCount = useRef(optionCount);

  function setRefs(node: HTMLUListElement | null) {
    nodeRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  useEffect(() => {
    const previous = seenCount.current;
    seenCount.current = optionCount;
    const saved = savedScrollRef?.current ?? 0;
    if (optionCount <= previous || saved <= 0) return;
    let cancel = false;
    queueMicrotask(() => {
      if (cancel) return;
      const node = nodeRef.current;
      if (!node) return;
      restoring.current = true;
      node.scrollTop = saved;
      if (savedScrollRef) savedScrollRef.current = saved;
      restoring.current = false;
    });
    return () => {
      cancel = true;
    };
  }, [optionCount, savedScrollRef]);

  return (
    <Box
      component="ul"
      {...props}
      ref={setRefs}
      onScroll={(event) => {
        onScroll?.(event);
        const node = event.currentTarget;
        if (savedScrollRef && !restoring.current) savedScrollRef.current = node.scrollTop;
        if (restoring.current) return;
        const overflow = node.scrollHeight - node.clientHeight;
        const distanceToEnd = overflow - node.scrollTop;
        if (overflow <= 32 || distanceToEnd >= 32) {
          endArmed.current = true;
          return;
        }
        if (!endArmed.current) return;
        endArmed.current = false;
        onNearEnd?.();
      }}
      sx={[
        {
          listStyle: "none",
          m: 0,
          py: 1,
          px: 0,
          maxHeight: "40vh",
          overflow: "auto",
          position: "relative",
          "& .MuiAutocomplete-option": {
            minHeight: { xs: 48, sm: "auto" },
            display: "flex",
            overflow: "hidden",
            justifyContent: "flex-start",
            alignItems: "center",
            cursor: "pointer",
            boxSizing: "border-box",
            outline: 0,
            py: "6px",
            px: 2,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
});

function suggestLabel(item: SuggestItem) {
  if (item.kind === "region") return formatRegionLabel(item.regionName || item.name);
  return displayCityName(item.name);
}

function settlementRegionCaption(regionName: string) {
  return shortRegionLabel(regionName).replace(/республика$/iu, "Респ.");
}

function toPlace(item: SuggestItem): ServicePlace | null {
  if (item.kind === "city") {
    if (!item.id) return null;
    return {
      kind: "city",
      cityId: item.id,
      name: item.name,
      regionCode: item.regionCode,
      regionName: item.regionName,
    };
  }
  return {
    kind: "region",
    name: item.regionName || item.name,
    regionCode: item.regionCode,
    regionName: item.regionName || item.name,
  };
}

export function ServicePlaceChips({
  value,
  onChange,
  disabled,
  hideHeading = false,
}: {
  value: ServicePlace[];
  onChange: (next: ServicePlace[]) => void;
  disabled?: boolean;
  hideHeading?: boolean;
}) {
  if (!value.length) return null;

  function removePlace(place: ServicePlace) {
    const key = placeKey(place);
    onChange(value.filter((item) => placeKey(item) !== key));
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
      {hideHeading ? null : <Typography sx={{ fontWeight: 800 }}>География</Typography>}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, minWidth: 0 }}>
        {value.map((place) => (
          <Chip
            key={placeKey(place)}
            label={placeChipLabel(place)}
            onDelete={disabled ? undefined : () => removePlace(place)}
            sx={{
              borderRadius: 999,
              bgcolor: "primary.light",
              color: "text.primary",
              maxWidth: "100%",
              "& .MuiChip-deleteIcon": { color: "text.primary" },
              "& .MuiChip-label": { overflowWrap: "anywhere", whiteSpace: "normal" },
            }}
          />
        ))}
      </Box>
    </Stack>
  );
}

export function ServiceGeographyField({
  value,
  onChange,
  disabled,
  error,
  helperText,
  label,
  showChips = true,
  size = "medium",
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(inputValue, 250);
  const [options, setOptions] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestGen = useRef(0);
  const loadedCities = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const listScrollTop = useRef(0);
  const selectedKeys = useMemo(() => new Set(value.map(placeKey)), [value]);

  const loadMore = useCallback(() => {
    const q = debounced.trim();
    if (q.length < 2 || !hasMoreRef.current || loadingMoreRef.current) return;
    const gen = requestGen.current;
    const offset = loadedCities.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void fetchPlaceSuggestPage(q, offset)
      .then((page) => {
        if (requestGen.current !== gen) return;
        if (!page) {
          hasMoreRef.current = false;
          return;
        }
        loadedCities.current += page.cities.length;
        hasMoreRef.current = page.hasMore;
        setOptions((current) => [...current, ...page.cities]);
      })
      .catch(() => {
        if (requestGen.current !== gen) return;
        hasMoreRef.current = false;
      })
      .finally(() => {
        if (requestGen.current !== gen) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [debounced]);

  useEffect(() => {
    const q = debounced.trim();
    const gen = ++requestGen.current;
    listScrollTop.current = 0;
    loadedCities.current = 0;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setOptions([]);
    void fetchPlaceSuggestPage(q, 0)
      .then((page) => {
        if (cancelled || requestGen.current !== gen) return;
        if (!page) {
          setOptions([]);
          return;
        }
        loadedCities.current = page.cities.length;
        hasMoreRef.current = page.hasMore;
        setOptions([...page.regions, ...page.cities]);
      })
      .catch(() => {
        if (cancelled || requestGen.current !== gen) return;
        setOptions([]);
      })
      .finally(() => {
        if (!cancelled && requestGen.current === gen) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const visibleOptions = useMemo(() => {
    return options
      .filter((item) => {
        const place = toPlace(item);
        return place ? !selectedKeys.has(placeKey(place)) : false;
      })
      .sort((left, right) => Number(left.kind === "city") - Number(right.kind === "city"));
  }, [options, selectedKeys]);
  const hasRegionOptions = visibleOptions.some((item) => item.kind === "region");
  const query = inputValue.trim();
  const noOptionsText = query.length < 2 ? "Начните вводить (минимум 2 символа)" : "Ничего не найдено";

  function addPlace(item: SuggestItem | null) {
    if (!item) return;
    const place = toPlace(item);
    if (!place || selectedKeys.has(placeKey(place))) return;
    onChange([...value, place]);
    setInputValue("");
    setOpen(false);
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      {showChips ? (
        <Stack spacing={1.25}>
          <Typography sx={{ fontWeight: 800 }}>География</Typography>
          <ServicePlaceChips value={value} onChange={onChange} disabled={disabled} hideHeading />
        </Stack>
      ) : null}
      <Autocomplete
        size={size}
        options={visibleOptions}
        value={null}
        inputValue={inputValue}
        loading={loading}
        disabled={disabled}
        forcePopupIcon={false}
        open={open && query.length >= 2}
        onClose={() => setOpen(false)}
        filterOptions={(items) => items}
        groupBy={(item) => (item.kind === "region" ? SUGGEST_GROUP_REGION : SUGGEST_GROUP_CITY)}
        noOptionsText={noOptionsText}
        getOptionLabel={(item) => suggestLabel(item)}
        isOptionEqualToValue={() => false}
        onInputChange={(_, next, reason) => {
          if (reason === "reset") return;
          setInputValue(next);
          setOpen(next.trim().length >= 2);
        }}
        onChange={(_, next) => addPlace(next)}
        renderGroup={(params) => {
          const withDivider = params.group === SUGGEST_GROUP_CITY && hasRegionOptions;
          return (
            <Box component="li" key={params.key} sx={{ listStyle: "none" }}>
              <Typography
                component="div"
                sx={{
                  mx: 2,
                  mt: withDivider ? 1 : 0.5,
                  pt: withDivider ? 1.5 : 0.75,
                  pb: 0.75,
                  borderTop: withDivider ? "1px solid" : "none",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                }}
              >
                {params.group}
              </Typography>
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
                {params.children}
              </Box>
            </Box>
          );
        }}
        renderOption={(props, item) => {
          const { key, ...rest } = props;
          return (
            <li key={key} {...rest} style={{ ...rest.style, listStyle: "none" }}>
              <Box sx={{ minWidth: 0, py: 0.25 }}>
                <Typography sx={{ color: "text.primary", fontSize: 18, lineHeight: 1.3 }}>
                  {suggestLabel(item)}
                </Typography>
                {item.kind === "city" ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.3 }}>
                    {settlementRegionCaption(item.regionName)}
                  </Typography>
                ) : null}
              </Box>
            </li>
          );
        }}
        slotProps={
          {
            paper: {
              sx: {
                borderRadius: 1,
                mt: 0.5,
                bgcolor: "#fcfcfc",
                border: "1px solid",
                borderColor: "divider",
              },
            },
            // Кастомный listbox читает эти пропы, тип слота MUI их не знает.
            listbox: {
              onNearEnd: loadMore,
              optionCount: options.length,
              savedScroll: listScrollTop,
            },
          } as AutocompleteProps<SuggestItem, false, false, false>["slotProps"]
        }
        slots={{ listbox: GeographySuggestListbox }}
        renderInput={(params) => (
          <TextField
            {...params}
            size={size}
            label={label}
            placeholder="Введите город или область"
            error={error}
            helperText={helperText}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && inputValue === "" && value.length > 0) {
                event.preventDefault();
                onChange(value.slice(0, -1));
              }
            }}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                ...(label ? {} : { "aria-label": "Добавить город или область" }),
              },
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {loading || loadingMore ? (
                      <CircularProgress
                        color="primary"
                        size={18}
                        sx={{ position: "absolute", right: 12, top: "50%", mt: "-9px" }}
                      />
                    ) : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
    </Stack>
  );
}
