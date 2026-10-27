"use client";

import { Box, Stack, Tab, Tabs } from "@mui/material";
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
      <Tabs
        value={section}
        onChange={(_, next: SectionId) => setSection(next)}
        aria-label="Разделы кабинета"
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider", minHeight: 44 }}
      >
        {SECTIONS.map((item) => (
          <Tab
            key={item.id}
            value={item.id}
            label={item.label}
            id={`pro-home-tab-${item.id}`}
            aria-controls={`pro-home-panel-${item.id}`}
            sx={{ minHeight: 44, textTransform: "none", fontSize: 16, fontWeight: 700 }}
          />
        ))}
      </Tabs>
      <Box
        role="tabpanel"
        id={`pro-home-panel-${section}`}
        aria-labelledby={`pro-home-tab-${section}`}
      >
        {content}
      </Box>
    </Stack>
  );
}
