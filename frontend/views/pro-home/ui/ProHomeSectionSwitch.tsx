"use client";

import { Box, Stack } from "@mui/material";
import { useState, type ReactNode } from "react";

type SectionId = "services" | "free" | "reminders";

const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "services", label: "Мои услуги" },
  { id: "free", label: "Свободные заявки" },
  { id: "reminders", label: "Напоминания" },
];

type Props = {
  services: ReactNode;
  freeRequests: ReactNode;
  reminders: ReactNode;
};

export function ProHomeSectionSwitch({ services, freeRequests, reminders }: Props) {
  const [section, setSection] = useState<SectionId>("services");
  const content = section === "services" ? services : section === "free" ? freeRequests : reminders;

  return (
    <Stack spacing={2.5}>
      <Box
        component="nav"
        aria-label="Разделы кабинета"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          columnGap: { xs: 2.5, md: 4 },
          rowGap: 1,
          alignItems: "baseline",
        }}
      >
        {SECTIONS.map((item) => {
          const active = section === item.id;
          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => setSection(item.id)}
              sx={{
                m: 0,
                p: 0,
                border: 0,
                outline: "none",
                "&:focus": { outline: "none" },
                "&:focus-visible": { outline: "none" },
                bgcolor: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                fontWeight: active ? 800 : 700,
                fontSize: { xs: 28, md: 32 },
                lineHeight: 1.2,
                color: active ? "text.primary" : "text.secondaryLight",
              }}
            >
              {item.label}
            </Box>
          );
        })}
      </Box>
      {content}
    </Stack>
  );
}
