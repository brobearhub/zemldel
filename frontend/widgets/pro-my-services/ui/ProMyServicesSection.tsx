"use client";

// Why: titleFor — функция, серверный компонент не может передать её в клиентский список.
import { useState } from "react";
import Link from "@/shared/ui/Link";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ServiceCard, type ServiceDto } from "@/entities/service";
import { serviceRequestRowTitle } from "../lib/format-service-request";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";

type Props = {
  services: ServiceDto[];
};

export function ProMyServicesSection({ services }: Props) {
  const visible = services.filter((service) => service.status !== "ARCHIVED");
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  if (visible.length === 0) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: "flex-start", maxWidth: 640 }}>
        <Typography sx={{ color: "text.secondary" }}>
          Здесь появятся ваши услуги и заявки по ним.
        </Typography>
        <Button component={Link} href="/pro/services/create" variant="outlined" sx={{ minHeight: 44 }}>
          Добавить услугу
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      {visible.map((service) => (
        <Box
          key={service.id}
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "start",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "280px minmax(0, 1fr)" },
          }}
        >
          <Box sx={{ alignSelf: "start", height: "fit-content" }}>
            <ServiceCard item={service} />
          </Box>
          <ServiceRequestsPanel
            serviceId={service.id}
            showCustomerAvatar
            expanded={expandedServiceId === service.id}
            onExpandedChange={(open) => setExpandedServiceId(open ? service.id : null)}
            titleFor={(request) => serviceRequestRowTitle(request.customerName, service.title)}
          />
        </Box>
      ))}
    </Stack>
  );
}
