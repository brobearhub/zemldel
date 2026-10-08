import { describe, expect, it } from "vitest";
import { resolveProviderTriggerLabel, resolveRequestDetailTitle } from "./request.dto";

describe("resolveRequestDetailTitle", () => {
  it("uses the service name for a request created from a service page", () => {
    expect(resolveRequestDetailTitle("SERVICE", "Подключение электричества")).toBe(
      "Подключение электричества",
    );
  });

  it("falls back to the generic title when the service name is empty", () => {
    expect(resolveRequestDetailTitle("SERVICE", "  ")).toBe("Заявка");
    expect(resolveRequestDetailTitle("SERVICE", null)).toBe("Заявка");
  });

  it("keeps the generic title for category and freeform requests", () => {
    expect(resolveRequestDetailTitle("CATEGORY", "Категория")).toBe("Заявка");
    expect(resolveRequestDetailTitle("FREEFORM", null)).toBe("Заявка");
  });
});

describe("resolveProviderTriggerLabel", () => {
  it("shows the provider name when it is set", () => {
    expect(resolveProviderTriggerLabel("Геодезия Плюс")).toBe("Геодезия Плюс");
  });

  it("keeps the word Исполнитель when the name is empty", () => {
    expect(resolveProviderTriggerLabel(null)).toBe("Исполнитель");
    expect(resolveProviderTriggerLabel("  ")).toBe("Исполнитель");
  });
});
