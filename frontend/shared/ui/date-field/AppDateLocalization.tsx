"use client";

import type { ReactNode } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ruRU } from "@mui/x-date-pickers/locales";
import type { PickersInputLocaleText } from "@mui/x-date-pickers/locales";
import "dayjs/locale/ru";

type Props = {
  children: ReactNode;
};

const localeText: PickersInputLocaleText = {
  ...ruRU.components.MuiLocalizationProvider.defaultProps.localeText,
  fieldDayPlaceholder: () => "дд",
  fieldMonthPlaceholder: ({ contentType }) => contentType === "letter" ? "мммм" : "мм",
  fieldYearPlaceholder: ({ digitAmount }) => "г".repeat(digitAmount),
};

export function AppDateLocalization({ children }: Props) {
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="ru"
      localeText={localeText}
    >
      {children}
    </LocalizationProvider>
  );
}
