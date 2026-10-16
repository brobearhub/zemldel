"use client";

import { useState, type ReactNode } from "react";
import { Autocomplete, Box, TextField } from "@mui/material";
import {
  STOCK_BADGE_MAX_LENGTH,
  filterStockBadgeSuggestions,
} from "../lib/stock-badge-suggestions";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Кружок цвета справа от черты. */
  endAdornment?: ReactNode;
};

function clampBadge(value: string): string {
  return value.slice(0, STOCK_BADGE_MAX_LENGTH);
}

export function StockBadgeField({ value, onChange, disabled = false, endAdornment }: Props) {
  const [open, setOpen] = useState(false);
  const options = filterStockBadgeSuggestions(value);

  return (
    <Autocomplete
      freeSolo
      disableClearable
      forcePopupIcon={false}
      size="small"
      disabled={disabled}
      fullWidth
      options={options}
      filterOptions={(items) => items}
      inputValue={value}
      value={value}
      open={open && options.length > 0}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onChange={(_, next) => {
        onChange(clampBadge(next));
      }}
      onInputChange={(_, next, reason) => {
        if (reason === "reset") return;
        onChange(clampBadge(next));
      }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        },
        listbox: {
          sx: {
            display: "flex",
            flexDirection: "column",
            py: 0.5,
            "& .MuiAutocomplete-option": {
              width: "100%",
            },
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Метка"
          disabled={disabled}
          fullWidth
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              maxLength: STOCK_BADGE_MAX_LENGTH,
              "aria-label": "Метка",
            },
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {endAdornment ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        alignSelf: "stretch",
                        flexShrink: 0,
                        ml: 1,
                        pl: 1,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {endAdornment}
                    </Box>
                  ) : null}
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
