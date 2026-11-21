"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import FormatListBulletedRounded from "@mui/icons-material/FormatListBulletedRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import MapOutlined from "@mui/icons-material/MapOutlined";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { landApi, useLandData } from "@/entities/land/api";
import {
  appliedLandFilters,
  catalogRequest,
  landFilterKeys,
  landOfferCount,
  landView,
  mapFilterScope,
  type LandFilters,
  type LandView,
} from "@/entities/land/catalog-query";
import type { LandCatalogResult } from "@/entities/land/types";
import { LandCard } from "./LandCard";
import { LandCatalogFilters } from "./LandCatalogFilters";
import { LandCatalogMap } from "./LandCatalogMap";

const views = [
  { value: "list", label: "Список", Icon: FormatListBulletedRounded },
  { value: "tiles", label: "Плитка", Icon: GridViewRounded },
  { value: "map", label: "Карта", Icon: MapOutlined },
] as const;

const sortOptions = [
  { value: "NEWEST", label: "Сначала новые", shortLabel: "Новые" },
  { value: "PRICE_ASC", label: "Сначала дешевле", shortLabel: "Дешевле" },
  { value: "PRICE_DESC", label: "Сначала дороже", shortLabel: "Дороже" },
  { value: "AREA_ASC", label: "По площади", shortLabel: "Площадь" },
];

function catalogHref(params: URLSearchParams) {
  return params.size ? `/lands?${params}` : "/lands";
}

export function LandCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const selection = params.get("kind") === "SELECTION";
  const theme = useTheme();
  const showListView = useMediaQuery(theme.breakpoints.up("md"));
  const compactToolbar = useMediaQuery(theme.breakpoints.down("sm"));
  const toolbarButtonSx = {
    [theme.breakpoints.down("sm")]: {
      minWidth: 44,
      minHeight: 44,
      p: 0,
      "& .MuiButton-startIcon": { m: 0 },
    },
  };
  const requestedView = landView(params);
  const view = requestedView === "list" && !showListView ? "tiles" : requestedView;
  const availableViews = views.filter(({ value }) => value !== "list" || showListView);
  const favorites = params.get("favorites") === "1";
  const filterParams = appliedLandFilters(params);
  const request = catalogRequest(params);
  const {
    data: response,
    setData,
    loadedPath,
    loading,
    error,
    refresh,
  } = useLandData<LandCatalogResult>(request);
  const scope = mapFilterScope(request);
  // Keep the map and camera mounted when a search only changes its bounds.
  const data =
    loadedPath === request ||
    (view === "map" && loadedPath && mapFilterScope(loadedPath) === scope)
      ? response
      : null;
  const [mobileFilters, setMobileFilters] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const returnTo = catalogHref(params);

  function navigate(change: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(window.location.search);
    change(next);
    const href = catalogHref(next);
    if (href !== window.location.pathname + window.location.search)
      window.history.pushState(null, "", href);
  }

  function setParam(key: string, value: string | null) {
    navigate((next) => {
      next.delete("page");
      if (value) next.set(key, value);
      else next.delete(key);
    });
  }

  function applyFilters(values: LandFilters) {
    navigate((next) => {
      if ((next.get("cityId") ?? "") !== (values.cityId ?? ""))
        next.delete("bbox");
      for (const key of landFilterKeys) {
        const value = values[key]?.trim();
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete("page");
    });
  }

  function reset() {
    navigate((next) => {
      for (const key of [...landFilterKeys, "bbox", "favorites", "page"])
        next.delete(key);
    });
  }

  function changeView(nextView: LandView | null) {
    if (!nextView) return;
    navigate((next) => {
      next.delete("map");
      if (nextView === "list") next.delete("view");
      else next.set("view", nextView);
    });
  }

  function signIn(path: string) {
    router.push(`/signin?returnTo=${encodeURIComponent(path)}`);
  }

  function toggleFavoritesFilter() {
    if (!favorites && !session?.user) {
      const next = new URLSearchParams(params);
      next.set("favorites", "1");
      next.delete("page");
      signIn(catalogHref(next));
      return;
    }
    setParam("favorites", favorites ? null : "1");
  }

  async function favorite(id: string) {
    if (!session?.user) return signIn(returnTo);
    if (pending.current.has(id)) return;
    pending.current.add(id);
    setPendingIds([...pending.current]);
    setFavoriteError("");
    const enabled = !data?.favoriteIds.includes(id);
    try {
      await landApi(`/${id}/favorite`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      setData((prev) => {
        if (!prev || !prev.items.some((row) => row.id === id)) return prev;
        const ids = prev.favoriteIds.filter((item) => item !== id);
        return { ...prev, favoriteIds: enabled ? [...ids, id] : ids };
      });
      if (favorites) refresh();
    } catch (e) {
      setFavoriteError(
        e instanceof Error ? e.message : "Не удалось изменить избранное",
      );
    } finally {
      pending.current.delete(id);
      setPendingIds([...pending.current]);
    }
  }

  return (
    <Container
      maxWidth="xl"
      disableGutters
      sx={{
        px: {
          xs: 2,
          sm: 3,
        },
        py: {
          xs: 2,
          md: 2,
        },
      }}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            alignItems: {
              xs: "flex-start",
              sm: "center",
            },
            flexDirection: {
              xs: "column",
              sm: "row",
            },
            flexWrap: "wrap",
            gap: {
              xs: 1,
              sm: 2.5,
            },
          }}
        >
          <Typography
            component="h1"
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: "1.6875rem",
              lineHeight: "34px",
            }}
          >
            Участки
          </Typography>
          <Tabs
            value={selection ? "SELECTION" : "SALE"}
            aria-label="Вид предложения"
            sx={{
              minHeight: 36,
              "& .MuiTab-root": {
                minWidth: 0,
                minHeight: 36,
                px: 1,
                py: 0.5,
                color: "text.secondary",
              },
              "& .Mui-selected": {
                color: "text.primary",
                fontWeight: 800,
              },
            }}
          >
            <Tab
              component={Link}
              href="/lands"
              value="SALE"
              label="Предложения"
            />
            <Tab
              component={Link}
              href="/lands?kind=SELECTION"
              value="SELECTION"
              label="Подбор участка"
            />
          </Tabs>
          <Stack
            direction="row"
            spacing={1}
            sx={{ ml: { sm: "auto" } }}
          >
            <Button
              component={Link}
              href="/lands/mine"
              size="small"
              sx={{ color: "text.secondary" }}
            >
              Мои объявления
            </Button>
            <Button
              component={Link}
              href={`/lands/new${selection ? "?kind=SELECTION" : ""}`}
              size="small"
              variant="outlined"
              color="inherit"
            >
              Разместить
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "274px minmax(0, 1fr)",
            },
            alignItems: "start",
            gap: {
              xs: 0,
              md: 2.5,
            },
          }}
        >
          <LandCatalogFilters
            key={String(selection) + filterParams.toString()}
            applied={Object.fromEntries(filterParams)}
            city={
              response?.city?.id === params.get("cityId") ? response.city : null
            }
            selection={selection}
            mobileOpen={mobileFilters}
            onClose={() => setMobileFilters(false)}
            onApply={applyFilters}
            onReset={reset}
          />
          <Stack
            component="section"
            aria-label="Результаты поиска"
            spacing={1.5}
            sx={{
              minWidth: 0,
              gridColumn: {
                xs: 1,
                md: 2,
              },
            }}
          >
            <Box
              sx={{
                display: { xs: "grid", sm: "flex" },
                gridTemplateColumns: "minmax(0, 1fr) repeat(3, auto)",
                alignItems: "center",
                flexWrap: "wrap",
                gap: { xs: 0.25, sm: 1 },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  display: { xs: "contents", sm: "flex" },
                  alignItems: "center",
                  mr: "auto",
                }}
              >
                <Typography
                  role="status"
                  variant="subtitle1"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                >
                  {data
                    ? landOfferCount(data.total) +
                      (view === "map" ? " на карте" : "")
                    : error
                      ? "Результаты поиска"
                      : "Ищем предложения…"}
                </Typography>
                <Button
                  size="small"
                  startIcon={<TuneRounded />}
                  aria-label="Фильтры"
                  onClick={() => setMobileFilters(true)}
                  sx={{
                    ...toolbarButtonSx,
                    display: {
                      xs: "inline-flex",
                      md: "none",
                    },
                    color: "text.secondary",
                  }}
                >
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    Фильтры
                  </Box>
                </Button>
              </Stack>
              <Button
                size="small"
                aria-label="Избранное"
                startIcon={
                  favorites ? <FavoriteRounded /> : <FavoriteBorderRounded />
                }
                aria-pressed={favorites}
                onClick={toggleFavoritesFilter}
                sx={{
                  ...toolbarButtonSx,
                  color: favorites ? "text.primary" : "text.secondary",
                }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Избранное
                </Box>
              </Button>
              {view !== "map" && (
                <Select
                  size="small"
                  variant="standard"
                  disableUnderline
                  value={params.get("sort") || "NEWEST"}
                  renderValue={
                    compactToolbar
                      ? (value) => sortOptions.find((option) => option.value === value)?.shortLabel
                      : undefined
                  }
                  onChange={(event) => setParam("sort", event.target.value)}
                  inputProps={{ "aria-label": "Сортировка" }}
                  sx={{
                    color: "text.secondary",
                    typography: "body2",
                    [theme.breakpoints.down("sm")]: {
                      "& .MuiSelect-select": {
                        display: "flex",
                        alignItems: "center",
                        boxSizing: "border-box",
                        minHeight: 44,
                      },
                    },
                  }}
                >
                  {sortOptions
                    .filter((option) => !selection || option.value !== "AREA_ASC")
                    .map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                </Select>
              )}
              {!selection && (
                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    width: {
                      xs: "100%",
                      sm: "auto",
                    },
                  }}
                >
                  <ToggleButtonGroup
                    value={view}
                    exclusive
                    onChange={(_, value: LandView | null) => changeView(value)}
                    size="small"
                    aria-label="Отображение результатов"
                    sx={{
                      "& .MuiToggleButton-root": {
                        gap: 0.5,
                        px: 1.25,
                        py: 0.625,
                      },
                      "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover":
                        {
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        },
                    }}
                  >
                    {availableViews.map(({ value, label, Icon }) => (
                      <ToggleButton
                        key={value}
                        value={value}
                      >
                        <Icon fontSize="small" />
                        {label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
            </Box>
            {params.has("bbox") && (
              <Chip
                size="small"
                label="В выбранной области карты"
                onDelete={() => setParam("bbox", null)}
                sx={{ alignSelf: "start" }}
              />
            )}
            {error && (
              <Alert
                severity="error"
                action={<Button onClick={refresh}>Повторить</Button>}
              >
                {error}
              </Alert>
            )}
            {favoriteError && (
              <Alert
                severity="error"
                onClose={() => setFavoriteError("")}
              >
                {favoriteError}
              </Alert>
            )}
            {data?.truncated && (
              <Alert severity="info">
                Показаны первые 500 предложений. Увеличьте масштаб или уточните
                фильтры.
              </Alert>
            )}
            {loading && !data && (
              <Skeleton
                aria-label="Загрузка предложений"
                variant="rounded"
                height={view === "map" ? 510 : view === "tiles" ? 270 : 96}
              />
            )}
            {view === "map" && data ? (
              <LandCatalogMap
                key={scope}
                data={data}
                bbox={
                  new URLSearchParams(loadedPath ?? "").get("bbox") ?? undefined
                }
                onSearch={(bbox) => setParam("bbox", bbox)}
                pendingIds={pendingIds}
                onFavorite={(id) => void favorite(id)}
                returnTo={returnTo}
              />
            ) : data && data.items.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    view === "tiles"
                      ? {
                          xs: "minmax(0, 1fr)",
                          sm: "repeat(2, minmax(0, 1fr))",
                          lg: "repeat(3, minmax(0, 1fr))",
                        }
                      : "minmax(0, 1fr)",
                  gap: view === "tiles" ? 1.5 : 0,
                }}
              >
                {data.items.map((row) => (
                  <LandCard
                    key={row.id}
                    row={row}
                    view={view === "tiles" ? "tiles" : "list"}
                    favorite={data.favoriteIds.includes(row.id)}
                    busy={pendingIds.includes(row.id)}
                    onFavorite={() => void favorite(row.id)}
                    returnTo={returnTo}
                  />
                ))}
              </Box>
            ) : null}
            {!loading && !error && data?.items.length === 0 && (
              <Paper
                variant="outlined"
                sx={{ p: 3 }}
              >
                <Typography variant="h6">Предложения не найдены</Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Попробуйте другой район или измените условия поиска.
                </Typography>
                <Button onClick={reset}>Сбросить фильтры</Button>
              </Paper>
            )}
            {view !== "map" && data && data.pages > 1 && (
              <Pagination
                count={data.pages}
                page={data.page}
                onChange={(_, page) => setParam("page", String(page))}
                sx={{ alignSelf: "center" }}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
