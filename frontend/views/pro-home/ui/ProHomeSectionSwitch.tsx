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
          flexWrap: "nowrap",
          overflowX: "auto",
          columnGap: 1,
          alignItems: "stretch",
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
                m: 0,
                px: 1.5,
                py: 1,
                border: 0,
                borderBottom: "3px solid",
                borderColor: active ? "text.primary" : "transparent",
                outline: "none",
                bgcolor: active ? "action.hover" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                whiteSpace: "nowrap",
                minHeight: 44,
                fontWeight: active ? 800 : 700,
                fontSize: 16,
                lineHeight: 1.2,
                color: "text.primary",
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
