"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createServiceRequest,
  ensureRequestConversation,
  postConversationMessage,
} from "@/features/create-service-request-lead/api/service-request-lead.api";

type Input = {
  serviceId: string;
};

type SubmitInput = {
  questionText: string;
  cadastralNumbers: string[];
};

function normalizeQuestion(value: string): string {
  return value.trim();
}

export function useServiceAskQuestion(input: Input) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (submitInput: SubmitInput) => {
    setBusy(true);
    setError(null);
    try {
      const message = normalizeQuestion(submitInput.questionText);
      const created = await createServiceRequest({
        serviceId: input.serviceId,
        message: message || null,
        cadastralNumbers: submitInput.cadastralNumbers,
      });

      if (message) {
        try {
          const ensured = await ensureRequestConversation({ serviceRequestId: created.id });
          await postConversationMessage({
            conversationId: ensured.conversationId,
            body: message,
            clientMessageId: crypto.randomUUID(),
          });
        } catch {
          // Fallback: request detail page has a manual "start chat" action for SERVICE requests.
        }
      }

      const createdQuery = message ? "" : "?created=1";
      router.push(`/profile/requests/${created.id}${createdQuery}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  }, [input.serviceId, router]);

  return { busy, error, setError, submit };
}

