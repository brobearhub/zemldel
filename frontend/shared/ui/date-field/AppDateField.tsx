"use client";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { SxProps, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import dayjs, { type Dayjs } from "dayjs";
import { AppDateLocalization } from "./AppDateLocalization";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const calendarSx: SxProps<Theme> = {
  borderRadius: 3,
  "& .MuiPickersCalendarHeader-label": { color: "text.primary", fontWeight: 700 },
  "& .MuiDayCalendar-weekDayLabel": { color: "text.secondary" },
  "& .MuiPickersDay-root:hover": {
    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
  },
  "& .MuiPickersDay-root.Mui-selected": {
    bgcolor: "primary.main",
    color: "primary.contrastText",
  },
  "& .MuiPickersDay-root.Mui-selected:hover, & .MuiPickersDay-root.Mui-selected:focus": {
    bgcolor: "primary.dark",
  },
  "& .MuiPickersDay-today:not(.Mui-selected)": {
    borderColor: "primary.main",
  },
};

export function AppDateField({ label, value, onChange }: Props) {
  const parsed = value ? dayjs(value) : null;

  return (
    <AppDateLocalization>
      <DatePicker
        label={label}
        value={parsed?.isValid() ? parsed : null}
        format="DD.MM.YYYY"
        dayOfWeekFormatter={(date) => dayjs(date).locale("ru").format("dd")}
        onChange={(next: Dayjs | null) => {
          onChange(next?.isValid() ? next.format("YYYY-MM-DD") : "");
        }}
        slotProps={{
          textField: { size: "small", sx: { minWidth: 168 } },
          actionBar: { actions: ["clear", "today"] },
          desktopPaper: { sx: calendarSx },
          mobilePaper: { sx: calendarSx },
        }}
      />
    </AppDateLocalization>
  );
}
