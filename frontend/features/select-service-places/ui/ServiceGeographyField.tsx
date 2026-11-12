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
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { AutocompleteProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { fetchCityJson } from "@/shared/lib/fetch-city-json";
import {
  placeChipLabel,
  placeKey,
  placeSelectionKey,
  uniqueServicePlaces,
  type ServicePlace,
} from "@/entities/service";
import {
  displayCityName,
  formatRegionLabel,
  shortRegionLabel,
} from "@/shared/lib/format-city-label";

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
  return (
    Array.isArray(page.regions) &&
    Array.isArray(page.cities) &&
    typeof page.hasMore === "boolean"
  );
}

async function fetchPlaceSuggestPage(
  query: string,
  offset: number,
  signal?: AbortSignal,
): Promise<PlaceSuggestPage> {
  const params = new URLSearchParams({
    q: query,
    limit: String(PLACE_PAGE_SIZE),
    offset: String(offset),
  });
  return fetchCityJson(
    `/api/cities/place-suggest?${params.toString()}`,
    isPlaceSuggestPage,
    signal,
  );
}

type SuggestListboxProps = HTMLAttributes<HTMLUListElement> & {
  onNearEnd?: () => void;
  onRetry?: () => void;
  optionCount?: number;
  savedScroll?: MutableRefObject<number>;
  ownerState?: unknown;
  sx?: SxProps<Theme>;
};

const GeographySuggestListbox = forwardRef<
  HTMLUListElement,
  SuggestListboxProps
>(function GeographySuggestListbox(
  {
    children,
    onNearEnd,
    onRetry,
    onScroll,
    optionCount = 0,
    ownerState: _ownerState,
    savedScroll: savedScrollRef,
    sx,
    ...props
  },
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
        if (savedScrollRef && !restoring.current)
          savedScrollRef.current = node.scrollTop;
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
      {onRetry ? (
        <Box component="li" sx={{ px: 2 }}>
          <Button
            onMouseDown={(event) => event.preventDefault()}
            onClick={onRetry}
          >
            Попробуйте еще раз
          </Button>
        </Box>
      ) : null}
    </Box>
  );
});

function suggestLabel(item: SuggestItem) {
  if (item.kind === "region")
    return formatRegionLabel(item.regionName || item.name);
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
    const location = placeSelectionKey(place);
    onChange(value.filter((item) => placeKey(item) !== key && placeSelectionKey(item) !== location));
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
      {hideHeading ? null : (
        <Typography sx={{ fontWeight: 700 }}>География</Typography>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, minWidth: 0 }}>
        {uniqueServicePlaces(value).map((place) => (
          <Chip
            key={placeKey(place)}
            label={placeChipLabel(place)}
            onDelete={disabled ? undefined : () => removePlace(place)}
            sx={{
              borderRadius: 999,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              color: "text.primary",
              maxWidth: "100%",
              "& .MuiChip-deleteIcon": { color: "text.primary" },
              "& .MuiChip-label": {
                overflowWrap: "anywhere",
                whiteSpace: "normal",
              },
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
  const [loadError, setLoadError] = useState<"initial" | "more" | null>(null);
  const [retry, setRetry] = useState(0);
  const errorRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);
  const loadedCities = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const listScrollTop = useRef(0);
  const selectedKeys = useMemo(() => new Set(value.map(placeKey)), [value]);
  const selectedLocations = useMemo(() => new Set(value.map(placeSelectionKey)), [value]);

  const loadMore = useCallback(() => {
    const q = debounced.trim();
    if (q.length < 2 || !hasMoreRef.current || loadingMoreRef.current) return;
    const gen = requestGen.current;
    const offset = loadedCities.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    errorRef.current = false;
    setLoadError(null);
    void fetchPlaceSuggestPage(q, offset, controllerRef.current?.signal)
      .then((page) => {
        if (requestGen.current !== gen) return;
        loadedCities.current += page.cities.length;
        hasMoreRef.current = page.hasMore;
        setOptions((current) => [...current, ...page.cities]);
      })
      .catch(() => {
        if (requestGen.current !== gen) return;
        errorRef.current = true;
        setLoadError("more");
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
    const controller = new AbortController();
    controllerRef.current = controller;
    errorRef.current = false;
    setLoadError(null);
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
    void fetchPlaceSuggestPage(q, 0, controller.signal)
      .then((page) => {
        if (cancelled || requestGen.current !== gen) return;
        loadedCities.current = page.cities.length;
        hasMoreRef.current = page.hasMore;
        setOptions([...page.regions, ...page.cities]);
      })
      .catch(() => {
        if (cancelled || requestGen.current !== gen) return;
        setOptions([]);
        setLoadError("initial");
      })
      .finally(() => {
        if (!cancelled && requestGen.current === gen) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debounced, retry]);

  const visibleOptions = useMemo(() => {
    const identities = new Set(selectedKeys);
    const locations = new Set(selectedLocations);
    return options
      .filter((item) => {
        const place = toPlace(item);
        if (!place) return false;
        const identity = placeKey(place);
        const location = placeSelectionKey(place);
        if (identities.has(identity) || locations.has(location)) return false;
        identities.add(identity);
        locations.add(location);
        return true;
      })
      .sort(
        (left, right) =>
          Number(left.kind === "city") - Number(right.kind === "city"),
      );
  }, [options, selectedKeys, selectedLocations]);
  const hasRegionOptions = visibleOptions.some(
    (item) => item.kind === "region",
  );
  const query = inputValue.trim();
  const noOptionsText =
    query.length < 2
      ? "Начните вводить (минимум 2 символа)"
      : options.length > 0 && visibleOptions.length === 0 && !hasMoreRef.current
        ? "Все найденные места уже добавлены"
        : "Ничего не найдено";

  function addPlace(item: SuggestItem | null) {
    if (!item) return;
    const place = toPlace(item);
    if (!place || selectedKeys.has(placeKey(place)) || selectedLocations.has(placeSelectionKey(place))) return;
    onChange([...value, place]);
    setInputValue("");
    setOpen(false);
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      {showChips ? (
        <Stack spacing={1.25}>
          <Typography sx={{ fontWeight: 700 }}>География</Typography>
          <ServicePlaceChips
            value={value}
            onChange={onChange}
            disabled={disabled}
            hideHeading
          />
        </Stack>
      ) : null}
      <Autocomplete
        size={size}
        options={visibleOptions}
        value={null}
        inputValue={inputValue}
        loading={loading}
        loadingText="Загрузка…"
        disabled={disabled}
        forcePopupIcon={false}
        open={open && query.length >= 2 && loadError !== "initial"}
        onClose={() => setOpen(false)}
        filterOptions={(items) => items}
        groupBy={(item) =>
          item.kind === "region" ? SUGGEST_GROUP_REGION : SUGGEST_GROUP_CITY
        }
        noOptionsText={loadError ? "" : noOptionsText}
        getOptionLabel={(item) => suggestLabel(item)}
        getOptionKey={(item) => item.kind === "city" ? `city:${item.id}` : `region:${item.regionCode}`}
        isOptionEqualToValue={() => false}
        onInputChange={(_, next, reason) => {
          if (reason === "reset") return;
          setInputValue(next);
          setOpen(next.trim().length >= 2);
        }}
        onChange={(_, next) => addPlace(next)}
        renderGroup={(params) => {
          const withDivider =
            params.group === SUGGEST_GROUP_CITY && hasRegionOptions;
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
                  fontSize: "1rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  lineHeight: 1.5,
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
            <li
              key={key}
              {...rest}
              style={{ ...rest.style, listStyle: "none" }}
            >
              <Box sx={{ minWidth: 0, py: 0.25 }}>
                <Typography
                  sx={{
                    color: "text.primary",
                    fontSize: "1.125rem",
                    lineHeight: 1.5,
                  }}
                >
                  {suggestLabel(item)}
                </Typography>
                {item.kind === "city" ? (
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", lineHeight: 1.3 }}
                  >
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
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              },
            },
            // Кастомный listbox читает эти пропы, тип слота MUI их не знает.
            listbox: {
              onNearEnd: () => {
                if (!errorRef.current) loadMore();
              },
              onRetry: loadError === "more" && !disabled ? loadMore : undefined,
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
              if (
                event.key === "Backspace" &&
                inputValue === "" &&
                value.length > 0
              ) {
                event.preventDefault();
                onChange(value.slice(0, -1));
              }
            }}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                ...(label
                  ? {}
                  : { "aria-label": "Добавить город или область" }),
              },
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {loading || loadingMore ? (
                      <CircularProgress
                        color="primary"
                        size={18}
                        sx={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          mt: "-9px",
                        }}
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
      {loadError &&
      (loadError === "initial" || !open) &&
      query === debounced.trim() ? (
        <Button
          disabled={disabled || loading || loadingMore}
          onClick={() => {
            if (loadError === "more") loadMore();
            else {
              setLoadError(null);
              setLoading(true);
              setRetry((current) => current + 1);
            }
            setOpen(true);
          }}
          sx={{ alignSelf: "flex-start" }}
        >
          Попробуйте еще раз
        </Button>
      ) : null}
    </Stack>
  );
}
