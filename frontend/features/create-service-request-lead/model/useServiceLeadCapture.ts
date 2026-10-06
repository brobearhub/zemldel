"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildRequestAuthHref,
  collectCadastralNumbersFromParts,
  createEmptyCadastralParts,
  savePendingRequestDraft,
  type CadastralNumberParts,
} from "@/entities/request";
import { DEFAULT_SERVICE_QUESTION } from "@/features/create-service-request-lead";

type Input = {
  serviceId: string;
  initialCustomerEmail: string | null;
};

function normalizeQuestion(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_SERVICE_QUESTION;
}

export function useServiceLeadCapture(input: Input) {
  const router = useRouter();
  const [customerEmail, setCustomerEmail] = useState(input.initialCustomerEmail ?? "");
  const [question, setQuestion] = useState("");
  const [cadastralNumbers, setCadastralNumbers] = useState<CadastralNumberParts[]>([createEmptyCadastralParts()]);
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
      const message = normalizeQuestion(question);
      const cadastral = collectCadastralNumbersFromParts(cadastralNumbers);
      if (cadastral.partialError) {
        setError(cadastral.partialError);
        return;
      }
      savePendingRequestDraft({
        kind: "SERVICE",
        serviceId: input.serviceId,
        customerName: null,
        customerEmail: email,
        customerPhone: null,
        message,
        requestCityId: null,
        cadastralNumbers: cadastral.numbers,
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
    question,
    setQuestion,
    cadastralNumbers,
    setCadastralNumbers,
    busy,
    error,
    setError,
    validationError,
    submit,
  };
}

