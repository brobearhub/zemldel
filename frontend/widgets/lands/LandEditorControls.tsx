import { useId, type ReactNode } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  type TextFieldProps,
} from "@mui/material";
import {
  NumberFormatBase,
  useNumericFormat,
  type NumericFormatProps,
} from "react-number-format";
import type { LandDetails, LandDraft } from "@/entities/land/types";
import { AppDateField } from "@/shared/ui/date-field";

export function LandFormCard({
  title,
  icon,
  children,
  sidePanel,
  fullWidth,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  sidePanel?: ReactNode;
  fullWidth?: boolean;
}) {
  const heading = useId();
  return (
    <Paper
      component="section"
      aria-labelledby={heading}
      variant="outlined"
      sx={{
        minWidth: 0,
        borderRadius: "13px",
        boxShadow: "none",
        gridColumn: fullWidth || sidePanel ? "1 / -1" : undefined,
        ...(sidePanel && {
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            tablet: "repeat(2, minmax(0, 1fr))",
          },
          columnGap: 2.5,
          overflow: "hidden",
        }),
      }}
    >
      <Stack
        spacing={2}
        sx={{
          minWidth: 0,
          p: {
            xs: 2,
            tablet: 2.5,
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center" }}
        >
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: "9px",
              bgcolor: "action.selected",
              color: "primary.main",
              "& svg": { fontSize: 19 },
            }}
          >
            {icon}
          </Box>
          <Typography
            id={heading}
            component="h2"
            sx={{
              fontSize: "1.1875rem",
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {title}
          </Typography>
        </Stack>
        {children}
      </Stack>
      {sidePanel}
    </Paper>
  );
}

export function LandFieldPair({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          tablet: "repeat(2, minmax(0, 1fr))",
        },
        alignItems: "start",
        gap: {
          xs: 1.5,
          tablet: 2,
        },
      }}
    >
      {children}
    </Box>
  );
}

export function LandCheckbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <FormControlLabel
      label={label}
      disabled={disabled}
      control={
        <Checkbox
          size="small"
          checked={Boolean(checked)}
          onChange={(event) => onChange(event.target.checked)}
        />
      }
    />
  );
}

type InputKey<T> = Extract<
  {
    [K in keyof T]-?: NonNullable<T[K]> extends number | string ? K : never;
  }[keyof T],
  string
>;

type FieldOptions = {
  choices?: Record<string, string>;
  allowEmpty?: boolean;
  type?: "number" | "money" | "date" | "tel";
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  placeholder?: string;
  helper?: string;
  suffix?: string;
};

type InputProps = FieldOptions & {
  name: string;
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string | number | null) => void;
  error?: string;
  disabled: boolean;
};

function RubleInput(props: NumericFormatProps<TextFieldProps>) {
  const format = useNumericFormat({
    ...props,
    thousandSeparator: "\u00a0",
    decimalSeparator: ",",
  });

  return (
    <NumberFormatBase
      {...format}
      customInput={TextField}
      // Pasted amounts can use a decimal point as well as a comma.
      removeFormatting={(text, change) =>
        format.removeFormatting!(text.replaceAll(".", ","), change)
      }
    />
  );
}

function LandInput({
  name,
  label,
  value,
  onChange,
  disabled,
  error,
  choices,
  allowEmpty = true,
  type,
  min,
  max,
  step,
  rows,
  placeholder,
  helper,
  suffix,
}: InputProps) {
  const fieldProps = {
    name,
    label,
    size: "small" as const,
    fullWidth: true,
    value: value ?? "",
    disabled,
    placeholder,
    error: Boolean(error),
    helperText: error || helper,
    "data-land-invalid": Boolean(error),
  };
  const input = suffix
    ? { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> }
    : undefined;

  if (type === "date") {
    return (
      <AppDateField
        {...fieldProps}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }

  if (type === "money") {
    return (
      <RubleInput
        {...fieldProps}
        onValueChange={({ floatValue }, { source }) => {
          if (source === "event") onChange(floatValue ?? null);
        }}
        slotProps={{ input, htmlInput: { inputMode: "decimal" } }}
      />
    );
  }

  return (
    <TextField
      {...fieldProps}
      select={Boolean(choices)}
      type={type}
      multiline={Boolean(rows)}
      minRows={rows}
      onChange={(event) => {
        const raw = event.target.value;
        if (type === "number") onChange(raw === "" ? null : Number(raw));
        else onChange(raw);
      }}
      slotProps={{
        htmlInput:
          type === "number"
            ? {
                min,
                max,
                step: step ?? "any",
              }
            : undefined,
        input,
      }}
    >
      {choices && [
        allowEmpty && (
          <MenuItem
            key="empty"
            value=""
          >
            Не указано
          </MenuItem>
        ),
        ...Object.entries(choices).map(([key, title]) => (
          <MenuItem
            key={key}
            value={key}
          >
            {title}
          </MenuItem>
        )),
      ]}
    </TextField>
  );
}

export function landEditorInputs(
  form: LandDraft,
  errors: Record<string, string>,
  disabled: boolean,
  change: (patch: Partial<LandDraft>) => void,
  changeDetails: (patch: Partial<LandDetails>) => void,
) {
  return {
    field(name: InputKey<LandDraft>, label: string, options?: FieldOptions) {
      return (
        <LandInput
          {...options}
          key={name}
          name={name}
          label={label}
          value={form[name]}
          disabled={disabled}
          error={errors[name]}
          onChange={(value) => change({ [name]: value })}
        />
      );
    },
    detail(name: InputKey<LandDetails>, label: string, options?: FieldOptions) {
      return (
        <LandInput
          {...options}
          key={name}
          name={name}
          label={label}
          value={form.details[name]}
          disabled={disabled}
          error={errors[name]}
          onChange={(value) => changeDetails({ [name]: value })}
        />
      );
    },
  };
}

export type LandEditorInputs = ReturnType<typeof landEditorInputs>;
