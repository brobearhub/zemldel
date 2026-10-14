import { describe, expect, it } from "vitest";
import { buildFirstSteps } from "./first-steps";

describe("buildFirstSteps", () => {
  it("после создания профиля показывает 1 из 3 и прячется, когда услуга опубликована и профиль подтверждён", () => {
    const fresh = buildFirstSteps({
      providerType: "SELF_EMPLOYED",
      hasPublishedService: false,
      verificationStatus: "NOT_VERIFIED",
    });
    expect(fresh.visible).toBe(true);
    expect(fresh.progressLabel).toBe("1 из 3");
    expect(fresh.steps[1]?.href).toBe("/pro/services/create");
    expect(fresh.steps[2]?.optional).toBe(true);

    const done = buildFirstSteps({
      providerType: "SELF_EMPLOYED",
      hasPublishedService: true,
      verificationStatus: "VERIFIED",
    });
    expect(done.visible).toBe(false);
    expect(done.progressLabel).toBe("3 из 3");
  });

  it("у физлица скрывает блок после первой услуги, проверка недоступна", () => {
    const steps = buildFirstSteps({
      providerType: "INDIVIDUAL",
      hasPublishedService: true,
      verificationStatus: "NOT_VERIFIED",
    });
    expect(steps.visible).toBe(false);
    expect(steps.steps[2]?.note).toBe("Проверка для физлиц появится позже");
  });
});
