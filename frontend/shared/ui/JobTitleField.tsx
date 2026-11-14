"use client";

import { Autocomplete, TextField } from "@mui/material";
import { JOB_TITLE_SUGGESTIONS } from "@/shared/config/job-titles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
};

export function JobTitleField({
  value,
  onChange,
  disabled,
  error,
  required = true,
}: Props) {
  return (
    <Autocomplete
      freeSolo
      forcePopupIcon
      fullWidth
      size="small"
      options={JOB_TITLE_SUGGESTIONS}
      inputValue={value}
      value={value || null}
      disabled={disabled}
      onInputChange={(_, next) => onChange(next)}
      onChange={(_, next) => onChange(next ?? "")}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Должность"
          required={required}
          error={Boolean(error)}
          helperText={error || "Выберите из списка или введите свою должность"}
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              maxLength: 120,
            },
          }}
        />
      )}
    />
  );
}
