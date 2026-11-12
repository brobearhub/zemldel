import { describe, expect, it } from "vitest";
import { formatRequestNumber, formatRequestReference } from "./request-reference";

describe("request references", () => {
  it("uses the assigned system number instead of the UUID", () => {
    const request = { id: "a1b2c3d4-1111-4111-8111-111111111111", number: 12 };
    expect(formatRequestNumber(request)).toBe("№ 12");
    expect(formatRequestReference(request)).toBe("Заявка № 12");
  });

  it("identifies an unnumbered request by ID until its number is assigned", () => {
    const request = { id: "a1b2c3d4-1111-4111-8111-111111111111", number: null };
    expect(formatRequestReference(request)).toBe("Заявка ID A1B2C3D4");
    expect(formatRequestReference({ ...request, number: 1 })).toBe("Заявка № 1");
  });
});
