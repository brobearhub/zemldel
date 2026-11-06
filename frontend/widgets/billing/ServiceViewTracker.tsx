"use client";
import { useEffect } from "react";
export function ServiceViewTracker({ serviceId }: { serviceId: string }) {
  useEffect(() => {
    try {
      const visitorId =
        localStorage.getItem("service-visitor") ?? crypto.randomUUID();
      localStorage.setItem("service-visitor", visitorId);
      void fetch(`/api/billing/services/${serviceId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      }).catch(() => undefined);
    } catch {
      /* analytics must not block viewing */
    }
  }, [serviceId]);
  return null;
}
