"use client";

import { Badge, Box, Stack, Tab, Tabs } from "@mui/material";
import { useState, type ReactNode } from "react";
import { useFreeRequestNotifications } from "@/widgets/pro-my-services/model/FreeRequestNotificationsProvider";

type SectionId = "services" | "free" | "reminders";

const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "services", label: "Заявки по услугам" },
  { id: "free", label: "Свободные заявки" },
  { id: "reminders", label: "Напоминания" },
];

type Props = {
  services: ReactNode;
  freeRequests: ReactNode;
  reminders: ReactNode;
};

export function ProHomeSectionSwitch({
  services,
  freeRequests,
  reminders,
}: Props) {
  const [section, setSection] = useState<SectionId>("services");
  const { hasNew } = useFreeRequestNotifications();
  const content =
    section === "services"
      ? services
      : section === "free"
        ? freeRequests
        : reminders;

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
            label={
              item.id === "free" ? (
                <Badge
                  variant="dot"
                  color="error"
                  invisible={!hasNew}
                  sx={{
                    "& .MuiBadge-badge": {
                      top: 2,
                      right: -8,
                      width: 8,
                      minWidth: 8,
                      height: 8,
                      p: 0,
                      borderRadius: "50%",
                    },
                  }}
                >
                  {item.label}
                </Badge>
              ) : (
                item.label
              )
            }
            aria-label={
              item.id === "free" && hasNew
                ? `${item.label}: есть новые заявки`
                : item.label
            }
            id={`pro-home-tab-${item.id}`}
            aria-controls={`pro-home-panel-${item.id}`}
            sx={{
              minHeight: 44,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 700,
            }}
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
