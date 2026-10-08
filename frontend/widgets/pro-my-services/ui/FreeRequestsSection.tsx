"use client";

import { serviceRequestRowTitle } from "../lib/format-service-request";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";

function freeRequestRowTitle(request: { customerName: string | null }): string {
  return serviceRequestRowTitle(request.customerName, null);
}

export function FreeRequestsSection() {
  return (
    <ServiceRequestsPanel
      serviceId={null}
      titleFor={freeRequestRowTitle}
      emptyLabel="Пока нет свободных заявок"
      showCustomerAvatar
    />
  );
}
