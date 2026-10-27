import { describe, expect, it } from "vitest";
import { buildFirstSteps } from "./first-steps";

describe("buildFirstSteps", () => {
  it("считает только обязательные шаги (1 из 2) и прячется, когда услуга опубликована и профиль подтверждён", () => {
    const fresh = buildFirstSteps({
      providerType: "SELF_EMPLOYED",
      hasPublishedService: false,
      verificationStatus: "NOT_VERIFIED",
    });
    expect(fresh.visible).toBe(true);
    expect(fresh.progressLabel).toBe("1 из 2");
    expect(fresh.steps[1]?.current).toBe(true);
    expect(fresh.steps[1]?.actionLabel).toBe("Добавить услугу");
    expect(fresh.steps[1]?.href).toBe("/pro/services/create");
    expect(fresh.steps[2]?.optional).toBe(true);

    const done = buildFirstSteps({
      providerType: "SELF_EMPLOYED",
      hasPublishedService: true,
      verificationStatus: "VERIFIED",
    });
    expect(done.visible).toBe(false);
    expect(done.progressLabel).toBe("2 из 2");
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

  it("показывает статус поданной заявки вместо приглашения пройти проверку", () => {
    const pending = buildFirstSteps({
      providerType: "SELF_EMPLOYED",
      hasPublishedService: true,
      verificationStatus: "PENDING",
    });
    expect(pending.steps[2]?.title).toBe("Данные на проверке");
    expect(pending.steps[2]?.href).toBeUndefined();
    expect(pending.steps[2]?.done).toBe(false);
  });

  it("при отказе выносит причину в пояснение и предлагает исправить данные", () => {
    const rejected = buildFirstSteps({
      providerType: "SOLE_PROPRIETOR",
      hasPublishedService: true,
      verificationStatus: "REJECTED",
      rejectReason: "ИНН не совпадает",
    });
    expect(rejected.visible).toBe(true);
    expect(rejected.steps[2]?.note).toBe("Причина: ИНН не совпадает. Исправьте данные и отправьте снова.");
    expect(rejected.steps[2]?.error).toBe(true);
    expect(rejected.steps[2]?.actionLabel).toBe("Исправить данные");
    expect(rejected.steps[2]?.optional).toBeUndefined();
  });
});
