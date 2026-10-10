"use client";

// Why: titleFor — функция, серверный компонент не может передать её в клиентский список.
import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";
import { ServiceCard, type ServiceDto } from "@/entities/service";
import { serviceRequestRowTitle } from "../lib/format-service-request";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";

type Props = {
  services: ServiceDto[];
};

export function ProMyServicesSection({ services }: Props) {
  const visible = services.filter((service) => service.status !== "ARCHIVED");
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  return (
    <Stack spacing={2.5}>
      {visible.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>
          Пока нет услуг.{" "}
          <Link href="/pro/services/create" sx={{ color: "primary.main", textDecoration: "underline" }}>
            Создать услугу
          </Link>
        </Typography>
      ) : (
        visible.map((service) => (
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
        ))
      )}
    </Stack>
  );
}
