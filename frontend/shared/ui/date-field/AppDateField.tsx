"use client";

import { useMemo } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DateField, type DateFieldProps } from "@mui/x-date-pickers/DateField";
import type { PickersActionBarAction } from "@mui/x-date-pickers/PickersActionBar";
import type { SxProps, Theme } from "@mui/material/styles";
import dayjs, { type Dayjs } from "dayjs";
import { AppDateLocalization } from "./AppDateLocalization";

type Props = Pick<
  DateFieldProps,
  "name" | "disabled" | "autoFocus" | "onFocus" | "fullWidth" | "size" | "error" | "helperText"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  keyboardOnly?: boolean;
};

const calendarSx: SxProps<Theme> = {
  borderRadius: 3,
  "& .MuiPickersCalendarHeader-label": { color: "text.primary", fontWeight: 700 },
  "& .MuiDayCalendar-weekDayLabel": { color: "text.secondary" },
  "& .MuiPickerDay-root:hover": {
    bgcolor: "background.secondary",
  },
  "& .MuiPickerDay-root.Mui-selected": {
    bgcolor: "primary.main",
    color: "primary.contrastText",
  },
  "& .MuiPickerDay-root.Mui-selected:hover, & .MuiPickerDay-root.Mui-selected:focus": {
    bgcolor: "primary.dark",
  },
  "& .MuiPickerDay-today:not(.Mui-selected)": {
    borderColor: "primary.main",
  },
};

export function AppDateField({
  label,
  value,
  onChange,
  name,
  disabled,
  autoFocus,
  fullWidth,
  size = "small",
  withTime = false,
  keyboardOnly = false,
  ...textFieldProps
}: Props) {
  const date = useMemo(() => {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }, [value]);
  const format = withTime ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY";
  const reference = date ?? dayjs();
  const field = {
    label,
    name,
    disabled,
    autoFocus,
    value: date,
    format,
    // Keep distant lease dates selectable without rendering thousands of year buttons.
    minDate: reference.year(Math.max(1, reference.year() - 150)).startOf("year"),
    maxDate: reference.year(Math.min(9999, reference.year() + 150)).endOf("year"),
    onChange: (next: Dayjs | null) => {
      onChange(next?.isValid() ? next.format(withTime ? "YYYY-MM-DDTHH:mm" : "YYYY-MM-DD") : "");
    },
  };
  const textField = {
    ...textFieldProps,
    fullWidth,
    size,
    sx: { minWidth: fullWidth ? 0 : 168 },
    slotProps: {
      htmlInput: {
        // An optional native date input allows empty values but blocks incomplete dates on submit.
        pattern: date ? date.format(format).replaceAll(".", "\\.") : "",
      },
    },
  };
  const Picker = withTime ? DateTimePicker : DatePicker;
  const actions: PickersActionBarAction[] = withTime
    ? ["clear", "cancel", "nextOrAccept"]
    : ["clear", "today"];

  return (
    <AppDateLocalization>
      {keyboardOnly ? (
        <DateField {...field} slotProps={{ textField }} />
      ) : (
        <Picker
          {...field}
          {...(withTime && { ampm: false, timeSteps: { minutes: 1 } })}
          closeOnSelect={!withTime}
          dayOfWeekFormatter={(date) => date.locale("ru").format("dd")}
          slotProps={{
            textField,
            actionBar: { actions },
            desktopPaper: { sx: calendarSx },
            mobilePaper: { sx: calendarSx },
          }}
        />
      )}
    </AppDateLocalization>
  );
}
