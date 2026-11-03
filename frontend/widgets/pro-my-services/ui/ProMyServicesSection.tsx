"use client";

import { useCallback, useState } from "react";
import Link from "@/shared/ui/Link";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ServiceDto } from "@/entities/service";
import { serviceRequestRowTitle } from "../lib/format-service-request";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";

type Summary = { count: number; needsReply: number };
export function ProMyServicesSection({ services }: { services: ServiceDto[] }) {
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [showEmpty, setShowEmpty] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(
    null,
  );
  const onSummary = useCallback((id: string, summary: Summary) => {
    setSummaries((current) =>
      current[id]?.count === summary.count &&
      current[id]?.needsReply === summary.needsReply
        ? current
        : { ...current, [id]: summary },
    );
  }, []);
  const visible = services
    .filter((service) => service.status !== "ARCHIVED")
    .sort((a, b) => {
      const left = summaries[a.id];
      const right = summaries[b.id];
      return (
        (right?.needsReply ?? 0) - (left?.needsReply ?? 0) ||
        Number((right?.count ?? 1) > 0) - Number((left?.count ?? 1) > 0)
      );
    });
  const emptyCount = visible.filter(
    (service) => summaries[service.id]?.count === 0,
  ).length;
  if (!visible.length)
    return (
      <Stack spacing={1.5} sx={{ alignItems: "flex-start", maxWidth: 640 }}>
        <Typography color="text.secondary">
          Здесь появятся ваши услуги и заявки по ним.
        </Typography>
        <Button
          component={Link}
          href="/pro/services/create"
          variant="outlined"
          sx={{ minHeight: 44 }}
        >
          Добавить услугу
        </Button>
      </Stack>
    );
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Сначала — заявки, ожидающие вашего ответа. Завершённые работы доступны в
        списке заявок.
      </Typography>
      {visible.map((service) => (
        <Box
          key={service.id}
          sx={{
            display:
              summaries[service.id]?.count === 0 && !showEmpty
                ? "none"
                : "block",
            minWidth: 0,
          }}
        >
          <Typography
            component="h2"
            variant="subtitle1"
            sx={{ fontWeight: 700, mb: 1, overflowWrap: "anywhere" }}
          >
            {service.title}
          </Typography>
          <ServiceRequestsPanel
            serviceId={service.id}
            showCustomerAvatar
            onSummary={onSummary}
            expanded={expandedServiceId === service.id}
            onExpandedChange={(open) =>
              setExpandedServiceId(open ? service.id : null)
            }
            titleFor={(request) =>
              serviceRequestRowTitle(request.customerName, service.title)
            }
          />
        </Box>
      ))}
      {emptyCount > 0 ? (
        <Button
          color="inherit"
          variant="text"
          onClick={() => setShowEmpty((value) => !value)}
          aria-expanded={showEmpty}
          sx={{ alignSelf: "flex-start", minHeight: 44 }}
        >
          {showEmpty
            ? "Скрыть услуги без заявок"
            : `Услуги без заявок (${emptyCount})`}
        </Button>
      ) : null}
    </Stack>
  );
}
