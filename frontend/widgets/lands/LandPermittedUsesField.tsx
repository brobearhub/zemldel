"use client";

import { useId, useState } from "react";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
} from "@mui/material";
import { LandPermittedUseChips } from "./LandPermittedUseChips";
import { LandPermittedUsesDialog } from "./LandPermittedUsesDialog";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
  error?: string;
};

export function LandPermittedUsesField({
  value,
  onChange,
  disabled,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <FormControl
      fullWidth
      disabled={disabled}
      error={Boolean(error)}
      data-land-invalid={Boolean(error)}
      sx={{ minWidth: 0 }}
    >
      <FormLabel
        htmlFor={id}
        sx={{ mb: 0.75 }}
      >
        ВРИ по документам
      </FormLabel>
      <Button
        id={id}
        type="button"
        name="permittedUses"
        variant="outlined"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        startIcon={<AccountTreeOutlined />}
        endIcon={<ChevronRightRounded />}
        onClick={() => setOpen(true)}
        sx={{
          gap: 1,
          justifyContent: "flex-start",
          minHeight: 42,
          px: 1.5,
          color: "text.primary",
          borderColor: error ? "error.main" : "divider",
          "& .MuiButton-endIcon": { ml: "auto" },
        }}
      >
        {value.length ? "Изменить выбор ВРИ" : "Выбрать из классификатора"}
      </Button>
      {value.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <LandPermittedUseChips values={value} />
        </Box>
      )}
      {error && <FormHelperText id={`${id}-error`}>{error}</FormHelperText>}
      {open && (
        <LandPermittedUsesDialog
          initialValue={value}
          onClose={() => setOpen(false)}
          onApply={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      )}
    </FormControl>
  );
}
