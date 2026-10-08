"use client";

import type { ReactNode } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ruRU } from "@mui/x-date-pickers/locales";
import "dayjs/locale/ru";

type Props = {
  children: ReactNode;
};

export function AppDateLocalization({ children }: Props) {
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="ru"
      localeText={ruRU.components.MuiLocalizationProvider.defaultProps.localeText}
    >
      {children}
    </LocalizationProvider>
  );
}
