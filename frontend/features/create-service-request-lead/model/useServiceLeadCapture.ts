"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  REQUESTS_PROFILE_URL,
  buildRequestAuthHref,
  savePendingRequestDraft,
} from "@/entities/request";
import { postServiceRequestLead } from "@/features/create-service-request-lead/api/service-request-lead.api";

type Input = {
  serviceId: string;
  isAuthenticated: boolean;
  initialCustomerEmail: string | null;
};

export function useServiceLeadCapture(input: Input) {
  const router = useRouter();
  const [customerEmail, setCustomerEmail] = useState(input.initialCustomerEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => {
    const email = customerEmail.trim();
    if (!email) return "Укажите электронную почту.";
    // Let browser validate too, but keep a lightweight check for UX.
    if (!email.includes("@") || email.length < 5) return "Проверьте email.";
    return null;
  }, [customerEmail]);

  async function submit() {
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const email = customerEmail.trim();
      if (input.isAuthenticated) {
        await postServiceRequestLead({ serviceId: input.serviceId, customerEmail: email });
        router.push(REQUESTS_PROFILE_URL);
        return;
      }

      savePendingRequestDraft({
        kind: "SERVICE",
        serviceId: input.serviceId,
        customerName: null,
        customerEmail: email,
        customerPhone: null,
        message: null,
        requestCityId: null,
        cadastralNumbers: [],
      });

      router.push(buildRequestAuthHref("signup", { kind: "SERVICE", serviceId: input.serviceId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  }

  return {
    customerEmail,
    setCustomerEmail,
    busy,
    error,
    setError,
    validationError,
    submit,
  };
}

