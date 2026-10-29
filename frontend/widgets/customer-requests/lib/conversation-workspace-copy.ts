import type { RequestSubjectType } from "@/entities/request";

type ConversationWorkspaceCopy = {
  title: string;
  description: string;
  noSelectionHint: string;
};

export function getConversationWorkspaceCopy(subjectType: RequestSubjectType): ConversationWorkspaceCopy {
  if (subjectType === "SERVICE") {
    return {
      title: "Чат с исполнителем",
      description: "Обсуждайте детали работ и условия напрямую с исполнителем.",
      noSelectionHint: "Откройте чат слева, чтобы продолжить переписку.",
    };
  }

  return {
    title: "Чаты с компаниями",
    description: "Выберите компанию, чтобы продолжить диалог.",
    noSelectionHint: "Выберите компанию слева, чтобы открыть переписку.",
  };
}
