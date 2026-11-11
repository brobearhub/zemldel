"use client";

import { Badge, Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fetchRequestList } from "@/widgets/pro-my-services/lib/fetch-request-list";
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
  serviceIds?: readonly string[];
};

async function chooseInitialSection(serviceIds: readonly string[]): Promise<SectionId> {
  const serviceFeeds = await Promise.allSettled(
    serviceIds.map((serviceId) => fetchRequestList({ serviceId }, Date.now(), true)),
  );
  if (
    serviceFeeds.some((result) => result.status === "rejected") ||
    serviceFeeds.some((result) => result.status === "fulfilled" && result.value.items.length > 0)
  ) {
    return "services";
  }

  try {
    const free = await fetchRequestList({ serviceId: null }, Date.now(), true);
    return free.items.length > 0 ? "free" : "reminders";
  } catch {
    return "free";
  }
}

export function ProHomeSectionSwitch({
  services,
  freeRequests,
  reminders,
  serviceIds,
}: Props) {
  const [section, setSection] = useState<SectionId>("services");
  const [initialServiceIds] = useState(() => serviceIds ?? null);
  const [selecting, setSelecting] = useState(initialServiceIds !== null);
  const manualSelection = useRef(false);
  const selectionPromise = useRef<Promise<SectionId> | null>(null);
  const { hasNew } = useFreeRequestNotifications();

  useEffect(() => {
    if (initialServiceIds === null) return;
    let cancelled = false;
    selectionPromise.current ??= chooseInitialSection(initialServiceIds);
    void selectionPromise.current.then((next) => {
      if (cancelled) return;
      if (!manualSelection.current) setSection(next);
      setSelecting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initialServiceIds]);

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
            onClick={() => {
              manualSelection.current = true;
              setSelecting(false);
            }}
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
        {selecting ? (
          <Typography
            role="status"
            sx={{
              color: "text.secondary",
            }}
          >
            Загружаем заявки…
          </Typography>
        ) : content}
      </Box>
    </Stack>
  );
}
