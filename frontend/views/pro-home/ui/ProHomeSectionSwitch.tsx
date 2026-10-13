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
        role="tablist"
        aria-label="Разделы кабинета"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          columnGap: { xs: 2.5, md: 4 },
          rowGap: 1,
          alignItems: "center",
        }}
      >
        {SECTIONS.map((item) => {
          const active = section === item.id;
          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(item.id)}
              sx={{
                minHeight: 44,
                px: 1.5,
                border: 0,
                borderBottom: "2px solid",
                borderColor: active ? "text.primary" : "transparent",
                outline: "none",
                "&:focus": { outline: "none" },
                "&:focus-visible": { outline: "2px solid", outlineColor: "text.primary", outlineOffset: 2 },
                bgcolor: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                fontWeight: active ? 700 : 500,
                fontSize: 16,
                lineHeight: 1.2,
                color: active ? "text.primary" : "text.secondary",
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
