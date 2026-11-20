import { useState, type ReactNode } from "react";
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import CheckRounded from "@mui/icons-material/CheckRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import {
  CATEGORY_LABELS,
  DEAL_LABELS,
  FACT_LABELS,
  PURPOSE_LABELS,
  RELATION_LABELS,
  UTILITY_LABELS,
  sotkaLabel,
  type LandDraft,
} from "@/entities/land/types";
import { CadastralNumberTextField } from "@/shared/ui/CadastralNumberTextField";
import { LAND_CADASTRAL_NUMBER } from "@/entities/land/address-location";
import { LandPermittedUsesField } from "./LandPermittedUsesField";
import {
  LandCheckbox,
  LandFieldPair,
  LandFormCard,
  type LandEditorInputs,
} from "./LandEditorControls";

type Props = {
  form: LandDraft;
  change: (patch: Partial<LandDraft>) => void;
  inputs: LandEditorInputs;
};

export function LandParcelPassport({
  form,
  change,
  inputs,
  errors,
  disabled,
  onConfirmNumber,
  locating,
  cadastralHint,
}: Props & {
  errors: Record<string, string>;
  disabled: boolean;
  onConfirmNumber: () => void;
  locating: boolean;
  cadastralHint: string;
}) {
  const [unit, setUnit] = useState(100);
  const area = form.areaM2 == null ? null : form.areaM2 / unit;
  const completeNumber = LAND_CADASTRAL_NUMBER.test(form.cadastralNumber);
  return (
    <LandFormCard
      title="Паспорт участка"
      icon={<DescriptionOutlined />}
    >
      <TextField
        select
        fullWidth
        size="small"
        label="Тип сделки"
        value={form.dealType}
        disabled={disabled}
        onChange={(event) =>
          change({
            dealType: event.target.value as LandDraft["dealType"],
            priceRubles: null,
          })
        }
      >
        {Object.entries(DEAL_LABELS).map(([value, label]) => (
          <MenuItem
            key={value}
            value={value}
          >
            {label}
          </MenuItem>
        ))}
      </TextField>
      <CadastralNumberTextField
        name="cadastralNumber"
        label="Кадастровый номер"
        value={form.cadastralNumber}
        onValueChange={(cadastralNumber) => change({ cadastralNumber })}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (completeNumber && !locating && !disabled) onConfirmNumber();
        }}
        endAdornment={completeNumber && (
          <InputAdornment position="end">
            <IconButton
              type="button"
              size="small"
              edge="end"
              color="success"
              aria-label="Сохранить кадастровый номер"
              title="Сохранить номер и найти расположение"
              disabled={disabled || locating}
              onClick={onConfirmNumber}
            >
              {locating ? <CircularProgress size={18} color="success" /> : <CheckRounded />}
            </IconButton>
          </InputAdornment>
        )}
        disabled={disabled}
        error={Boolean(errors.cadastralNumber)}
        helperText={
          <span aria-live="polite">
            {errors.cadastralNumber || (locating ? "Ищем расположение по номеру…" : cadastralHint) || "Обязателен для публикации."}
          </span>
        }
        data-land-invalid={Boolean(errors.cadastralNumber)}
      />
      <LandFieldPair>
        <TextField
          fullWidth
          size="small"
          type="number"
          name="areaM2"
          label="Площадь всего участка"
          disabled={disabled}
          value={area ?? ""}
          onChange={(event) =>
            change({
              areaM2:
                event.target.value === ""
                  ? null
                  : Number(event.target.value) * unit,
            })
          }
          error={Boolean(errors.areaM2)}
          helperText={errors.areaM2}
          data-land-invalid={Boolean(errors.areaM2)}
          slotProps={{
            htmlInput: { min: 0, step: "any" },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Select
                    variant="standard"
                    size="small"
                    value={unit}
                    renderValue={unit === 100 && area != null ? () => sotkaLabel(area) : undefined}
                    disabled={disabled}
                    disableUnderline
                    inputProps={{ "aria-label": "Единица площади" }}
                    onChange={(event) => setUnit(Number(event.target.value))}
                  >
                    <MenuItem value={1}>м²</MenuItem>
                    <MenuItem value={100}>сотки</MenuItem>
                    <MenuItem value={10000}>га</MenuItem>
                  </Select>
                </InputAdornment>
              ),
            },
          }}
        />
        {inputs.field("sellerRelation", "Ваше отношение", {
          choices: RELATION_LABELS,
          allowEmpty: false,
        })}
      </LandFieldPair>
      {inputs.field("category", "Категория земли", {
        choices: CATEGORY_LABELS,
      })}
      <LandPermittedUsesField
        value={form.permittedUses}
        disabled={disabled}
        onChange={(permittedUses) => change({ permittedUses })}
        error={errors.permittedUses}
      />
    </LandFormCard>
  );
}

export function LandPurposeFields({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Box
      role="group"
      aria-label="Для каких задач подходит"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: 2,
      }}
    >
      {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
        <LandCheckbox
          key={value}
          label={label}
          checked={values.includes(value)}
          onChange={(checked) =>
            onChange(
              checked
                ? [...values, value]
                : values.filter((item) => item !== value),
            )
          }
        />
      ))}
    </Box>
  );
}

function CharacteristicGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      sx={{
        display: "grid",
        minWidth: 0,
        gap: 1.5,
      }}
    >
      <Typography
        component="h3"
        variant="subtitle2"
        sx={{ fontWeight: 750 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

const utilities = {
  electricity: "Электричество",
  gas: "Газ",
  water: "Вода",
  sewerage: "Канализация",
} as const;

export function LandCharacteristics({ form, change, inputs }: Props) {
  return (
    <LandFormCard
      title="Характеристики"
      icon={<TuneRounded />}
      fullWidth
    >
      <CharacteristicGroup title="Для каких задач подходит">
        <LandPurposeFields
          values={form.purposes}
          onChange={(purposes) => change({ purposes })}
        />
      </CharacteristicGroup>
      <Divider />
      <Box
        sx={(theme) => ({
          display: "grid",
          gap: 1.5,
          [theme.breakpoints.up("tablet")]: {
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            // The columns share a heading and three rows of label, control and helper text.
            gridTemplateRows: "auto repeat(3, auto auto auto)",
            columnGap: 2,
            rowGap: 0,
            "& > section": {
              gridRow: "1 / -1",
              gridTemplateRows: "subgrid",
              rowGap: 0,
            },
            "& > section:last-child": {
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              columnGap: 2,
              "& > h3, & > :last-child": {
                gridColumn: "1 / -1",
              },
            },
            "& .MuiTextField-root": {
              display: "grid",
              gridRow: "span 3",
              gridTemplateRows: "subgrid",
              gridTemplateColumns: "minmax(0, 1fr)",
              alignItems: "start",
              mt: 1.5,
            },
          },
        })}
      >
        <CharacteristicGroup title="Границы и ограничения">
          {inputs.detail("boundaries", "Границы установлены", {
            choices: FACT_LABELS,
          })}
          {inputs.detail("restrictions", "Известны ограничения и обременения", {
            choices: FACT_LABELS,
          })}
          {inputs.detail(
            "restrictionsDescription",
            "Ограничения, обременения, зоны",
            { rows: 1 },
          )}
        </CharacteristicGroup>
        <CharacteristicGroup title="Коммуникации">
          {Object.entries(utilities).map(([key, label]) =>
            inputs.detail(key as keyof typeof utilities, label, {
              choices: UTILITY_LABELS,
            }),
          )}
          {inputs.detail("powerKw", "Мощность электричества", {
            type: "number",
            suffix: "кВт",
          })}
        </CharacteristicGroup>
      </Box>
      <Divider />
      <CharacteristicGroup title="Подъезд и постройки">
        <LandFieldPair>
          {inputs.detail("access", "Подъезд и доступ к участку", { rows: 1 })}
          <Stack spacing={1.5}>
            {inputs.detail("buildings", "Есть постройки", {
              choices: FACT_LABELS,
            })}
            {inputs.detail(
              "buildingsDescription",
              "Какие постройки есть и как они передаются",
              { rows: 2 },
            )}
          </Stack>
        </LandFieldPair>
      </CharacteristicGroup>
    </LandFormCard>
  );
}
