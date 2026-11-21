"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import type { CitySuggestItemDto } from "@/entities/city";
import type { LandFilters } from "@/entities/land/catalog-query";
import {
  CATEGORY_LABELS,
  DEAL_LABELS,
  FACT_LABELS,
  PURPOSE_LABELS,
  RELATION_LABELS,
  RENT_PERIODS,
  UTILITY_LABELS,
} from "@/entities/land/types";
import {
  collectCadastralNumbersFromParts,
  createEmptyCadastralParts,
  parseCadastralValue,
} from "@/entities/request/lib/cadastral-number";
import { LocationField } from "@/features/select-city";
import { CadastralNumberChipsField } from "@/shared/ui/CadastralNumberChipsField";
import { AppDateField } from "@/shared/ui/date-field";

type Props = {
  applied: LandFilters;
  city: CitySuggestItemDto | null;
  selection: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onApply: (filters: LandFilters) => void;
  onReset: () => void;
};

function FilterGroup({
  title,
  open,
  showDivider = true,
  children,
}: {
  title: string;
  open?: boolean;
  showDivider?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      component="details"
      open={open}
      sx={{
        borderTop: showDivider ? "1px solid" : 0,
        borderColor: "divider",
        pt: 1.25,
        "& > summary": {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          listStyle: "none",
          typography: "body2",
          fontWeight: 700,
        },
        "& summary::-webkit-details-marker": { display: "none" },
        "&[open] > summary svg": { transform: "rotate(180deg)" },
      }}
    >
      <summary>
        {title}
        <ExpandMoreRounded fontSize="small" />
      </summary>
      <Stack
        spacing={1.5}
        sx={{ mt: 1 }}
      >
        {children}
      </Stack>
    </Box>
  );
}

export function LandCatalogFilters({
  applied,
  city,
  selection,
  mobileOpen,
  onClose,
  onApply,
  onReset,
}: Props) {
  const desktop = useMediaQuery(useTheme().breakpoints.up("md"));
  const [draft, setDraft] = useState(applied);
  const [chosenCity, setChosenCity] = useState<
    CitySuggestItemDto | null | undefined
  >();
  const [numbers, setNumbers] = useState(() => [
    ...(applied.cadastralNumbers ?? "").split(",").flatMap((text) => {
      const parts = parseCadastralValue(text);
      return parts ? [parts] : [];
    }),
    createEmptyCadastralParts(),
  ]);
  const [numberError, setNumberError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [areaUnit, setAreaUnit] = useState(100);

  function change(key: keyof LandFilters, value: string) {
    setRangeError("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    const { numbers: complete, partialError } =
      collectCadastralNumbersFromParts(numbers);
    if (partialError) {
      setNumberError(partialError);
      return;
    }
    if (draft.rentMax && !draft.rentPeriod) {
      setRangeError("Выберите период арендной платы.");
      return;
    }
    if (
      (draft.minPrice && draft.maxPrice && +draft.minPrice > +draft.maxPrice) ||
      (draft.minArea && draft.maxArea && +draft.minArea > +draft.maxArea)
    ) {
      setRangeError(
        "Значение «от» должно быть меньше или равно значению «до».",
      );
      return;
    }
    onApply({
      ...draft,
      cityId: chosenCity === undefined ? draft.cityId : chosenCity?.id,
      cadastralNumbers: [...new Set(complete)].join(","),
    });
    onClose();
  }

  function reset() {
    setDraft({});
    setChosenCity(null);
    setNumbers([createEmptyCadastralParts()]);
    setNumberError("");
    setRangeError("");
    setAreaUnit(100);
    onReset();
  }

  function field(
    key: keyof LandFilters,
    label: string,
    options?: Record<string, string>,
    type = "text",
  ) {
    return (
      <TextField
        key={key}
        size="small"
        fullWidth
        label={label}
        select={Boolean(options)}
        value={draft[key] ?? ""}
        type={options ? undefined : type}
        onChange={(event) => change(key, event.target.value)}
        slotProps={{
          htmlInput: type === "number" ? { min: 0, step: "any" } : undefined,
        }}
      >
        {options && [
          <MenuItem
            key="any"
            value=""
          >
            Все
          </MenuItem>,
          ...Object.entries(options).map(([key, name]) => (
            <MenuItem
              key={key}
              value={key}
            >
              {name}
            </MenuItem>
          )),
        ]}
      </TextField>
    );
  }

  function range(
    title: string,
    keys: [keyof LandFilters, keyof LandFilters],
    unit = 1,
  ) {
    return (
      <Stack spacing={0.5}>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {title}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
        >
          {keys.map((key, index) => {
            const boundary = index ? "до" : "от";
            return (
              <TextField
                key={key}
                fullWidth
                size="small"
                type="number"
                placeholder={boundary}
                value={draft[key] ? Number(draft[key]) / unit : ""}
                onChange={({ target }) =>
                  change(
                    key,
                    target.value ? String(Number(target.value) * unit) : "",
                  )
                }
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: "any",
                    "aria-label": `${title}, ${boundary}`,
                  },
                }}
              />
            );
          })}
        </Stack>
      </Stack>
    );
  }

  const purposes = draft.purpose?.split(",") ?? [];
  const form = (
    <Stack
      component="form"
      onSubmit={apply}
      aria-label="Фильтры каталога"
      spacing={{ xs: 1.5, md: 1 }}
      sx={{
        p: 2,
        '& button[aria-haspopup="dialog"]': {
          minHeight: { md: 32 },
          py: { md: 0.25 },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          component="h2"
          variant="h6"
          sx={{
            fontWeight: 800,
            mr: "auto",
          }}
        >
          Фильтры
        </Typography>
        <Button
          size="small"
          onClick={reset}
          sx={{ color: "text.secondary" }}
        >
          Сбросить
        </Button>
        {!desktop && (
          <IconButton
            aria-label="Закрыть фильтры"
            onClick={onClose}
          >
            <CloseRounded />
          </IconButton>
        )}
      </Stack>
      <LocationField
        label="Выберите город"
        caption="Город"
        emptyLabel={
          draft.cityId && chosenCity === undefined
            ? "Выбранный город"
            : "Выбрать город"
        }
        value={chosenCity === undefined ? city : chosenCity}
        typeToSearch
        onChange={setChosenCity}
      />
      {!selection && (
        <CadastralNumberChipsField
          value={numbers}
          onChange={(next) => {
            setNumberError("");
            setNumbers(next);
          }}
          errorText={numberError}
        />
      )}
      {range(
        draft.dealType === "SHARE"
          ? "Цена доли, ₽"
          : draft.dealType === "LEASE_ASSIGNMENT"
            ? "Цена уступки, ₽"
            : "Цена, ₽",
        ["minPrice", "maxPrice"],
      )}
      {!selection && (
        <>
          {range(
            `Площадь, ${{ 1: "м²", 100: "сотки", 10000: "га" }[areaUnit]}`,
            ["minArea", "maxArea"],
            areaUnit,
          )}
          <Stack spacing={0.5}>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Тип сделки
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={draft.dealType ?? ""}
              onChange={(event) => change("dealType", event.target.value)}
              slotProps={{
                select: {
                  displayEmpty: true,
                  inputProps: { "aria-label": "Тип сделки" },
                },
              }}
            >
              <MenuItem value="">Все предложения</MenuItem>
              {Object.entries(DEAL_LABELS).map(([key, name]) => (
                <MenuItem
                  key={key}
                  value={key}
                >
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </>
      )}
      <FilterGroup
        title="Назначение"
        showDivider={!selection}
        open
      >
        <Box>
          {Object.entries(PURPOSE_LABELS).map(([key, title]) => (
            <FormControlLabel
              key={key}
              label={title}
              control={
                <Checkbox
                  size="small"
                  checked={purposes.includes(key)}
                  onChange={(_, checked) =>
                    change(
                      "purpose",
                      (checked
                        ? [...purposes, key]
                        : purposes.filter((p) => p !== key)
                      ).join(","),
                    )
                  }
                  sx={{
                    p: 0.5,
                    color: "text.secondary",
                    "&.Mui-checked": { color: "primary.main" },
                  }}
                />
              }
              sx={{
                display: "flex",
                m: 0,
                gap: 0.5,
                minHeight: { xs: 44, md: 28 },
              }}
              slotProps={{ typography: { variant: "body2" } }}
            />
          ))}
        </Box>
      </FilterGroup>
      <FilterGroup title="Ещё фильтры">
        {field("q", selection ? "Название или регион" : "Название или адрес")}
        {!selection && (
          <>
            <TextField
              select
              size="small"
              label="Единица площади"
              value={areaUnit}
              onChange={(event) => setAreaUnit(Number(event.target.value))}
            >
              <MenuItem value={1}>м²</MenuItem>
              <MenuItem value={100}>Сотки</MenuItem>
              <MenuItem value={10000}>Гектары</MenuItem>
            </TextField>
            {field("category", "Категория земли", CATEGORY_LABELS)}
            {field("vri", "Вид разрешённого использования")}
            {field("boundaries", "Границы установлены", FACT_LABELS)}
            {field("buildings", "Есть постройки", FACT_LABELS)}
            {field("restrictions", "Есть ограничения", FACT_LABELS)}
            {field("electricity", "Электричество", UTILITY_LABELS)}
            {field("gas", "Газ", UTILITY_LABELS)}
            {field("water", "Вода", UTILITY_LABELS)}
            {field("sewerage", "Канализация", UTILITY_LABELS)}
            {field(
              "sellerRelation",
              "Отношение автора к участку",
              RELATION_LABELS,
            )}
            {field("author", "Профиль автора", {
              PERSONAL: "Личный",
              PROVIDER: "Исполнитель",
            })}
            <Typography variant="subtitle2">Уступка аренды</Typography>
            {field("rentMax", "Арендная плата до, ₽", undefined, "number")}
            {field("rentPeriod", "Период платы", RENT_PERIODS)}
            <AppDateField
              label="Договор действует после"
              value={draft.leaseAfter ?? ""}
              onChange={(value) => change("leaseAfter", value)}
              fullWidth
            />
          </>
        )}
      </FilterGroup>
      {rangeError && (
        <Typography
          role="alert"
          variant="body2"
          color="error"
        >
          {rangeError}
        </Typography>
      )}
      <Button
        type="submit"
        variant="contained"
        fullWidth
      >
        Найти
      </Button>
    </Stack>
  );

  if (!desktop)
    return (
      <Dialog
        open={mobileOpen}
        onClose={onClose}
        fullScreen
        aria-label="Фильтры"
      >
        <DialogContent sx={{ p: 0 }}>{form}</DialogContent>
      </Dialog>
    );
  return (
    <Paper
      component="aside"
      aria-label="Параметры поиска"
      elevation={0}
      sx={{
        alignSelf: "start",
        borderRadius: 1.5,
      }}
    >
      {form}
    </Paper>
  );
}
