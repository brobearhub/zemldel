import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePendingRequestDraft } from "@/entities/request";
import { useServiceLeadCapture } from "./useServiceLeadCapture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("editing a saved SERVICE request", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("restores the question, contact email and cadastral number after returning from auth", async () => {
    savePendingRequestDraft({
      kind: "SERVICE", serviceId: "service-1", subjectTitle: "Межевание",
      customerName: null, customerEmail: "client@example.com", customerPhone: null,
      message: "Уточнить границы участка", requestCityId: null, cadastralNumbers: ["66:41:0000000:002"],
    });
    const { result } = renderHook(() => useServiceLeadCapture({ serviceId: "service-1", initialCustomerEmail: null }));
    await waitFor(() => expect(result.current.question).toBe("Уточнить границы участка"));
    expect(result.current.customerEmail).toBe("client@example.com");
    expect(result.current.cadastralNumbers).toEqual([["66", "41", "0000000", "002"]]);
  });
});
