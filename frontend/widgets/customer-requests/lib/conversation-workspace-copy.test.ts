import { describe, expect, it } from "vitest";
import { getConversationWorkspaceCopy } from "./conversation-workspace-copy";

describe("getConversationWorkspaceCopy", () => {
  it("возвращает копирайт для одного чата с исполнителем", () => {
    expect(getConversationWorkspaceCopy(true)).toEqual({
      title: "Чат с исполнителем",
      description: "Обсуждайте детали работ и условия напрямую с исполнителем.",
      noSelectionHint: "Откройте чат слева, чтобы продолжить переписку.",
    });
  });

  it("возвращает копирайт для сравнения компаний", () => {
    expect(getConversationWorkspaceCopy(false)).toEqual({
      title: "Чаты с компаниями",
      description: "Выберите компанию, чтобы продолжить диалог.",
      noSelectionHint: "Выберите компанию слева, чтобы открыть переписку.",
    });
  });
});
