type ConversationWorkspaceCopy = {
  title: string;
  description: string;
  noSelectionHint: string;
};

export function getConversationWorkspaceCopy(directConversation: boolean): ConversationWorkspaceCopy {
  if (directConversation) {
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
