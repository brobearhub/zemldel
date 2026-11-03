"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createServiceRequest,
  completeServiceRequestCreation,
  ensureRequestConversation,
  postConversationMessage,
  ServiceRequestAuthRequiredError,
} from "@/features/create-service-request-lead/api/service-request-lead.api";
import { buildRequestAuthHref, savePendingRequestDraft } from "@/entities/request";

type Input = {
  serviceId: string;
  serviceTitle?: string;
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
    let createdRequestId: string | null = null;
    let chatEnsured = false;
    try {
      const message = normalizeQuestion(submitInput.questionText);
      const created = await createServiceRequest({
        serviceId: input.serviceId,
        message: message || null,
        cadastralNumbers: submitInput.cadastralNumbers,
      });
      createdRequestId = created.id;

      const ensured = await ensureRequestConversation({ serviceRequestId: created.id });
      chatEnsured = true;

      if (message) {
        await postConversationMessage({
          conversationId: ensured.conversationId,
          body: message,
          clientMessageId: created.id,
        });
      }

      completeServiceRequestCreation(input.serviceId, created.id);
      router.push(`/profile/requests/${created.id}`);
      router.refresh();
    } catch (e) {
      if (!createdRequestId && e instanceof ServiceRequestAuthRequiredError) {
        savePendingRequestDraft({
          kind: "SERVICE", serviceId: input.serviceId, subjectTitle: input.serviceTitle,
          customerName: null, customerEmail: null, customerPhone: null,
          message: normalizeQuestion(submitInput.questionText) || null,
          requestCityId: null, cadastralNumbers: submitInput.cadastralNumbers,
        });
        router.push(buildRequestAuthHref("signin", { kind: "SERVICE", serviceId: input.serviceId }, true));
      } else if (createdRequestId && !chatEnsured) {
        setError("Заявка создана, но открыть чат не удалось. Откройте заявку в профиле и попробуйте снова.");
      } else if (createdRequestId && chatEnsured) {
        setError("Заявка создана, но отправить сообщение не удалось. Откройте заявку и отправьте его в чате.");
      } else {
        setError(e instanceof Error ? e.message : "Не удалось создать заявку");
      }
    } finally {
      setBusy(false);
    }
  }, [input.serviceId, input.serviceTitle, router]);

  return { busy, error, setError, submit };
}

