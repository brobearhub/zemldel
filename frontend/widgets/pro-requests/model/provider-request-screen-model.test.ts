import { describe, expect, it } from "vitest";
import { resolveProviderRequestScreenModel } from "./provider-request-screen-model";

describe("resolveProviderRequestScreenModel", () => {
  it("оставляет workflow выбранному исполнителю", () => {
    expect(
      resolveProviderRequestScreenModel({
        isLocked: false,
        status: "ACTIVE",
        lockedAt: "2026-08-06T00:00:00.000Z",
        totalAmountRubles: null,
      }),
    ).toEqual({
      mode: "deal",
      statusLabel: "В работе",
      showDealWorkflow: true,
      showCadastralPanel: true,
    });
  });

  it("shows contract when price is agreed while DB status is DISCUSSING", () => {
    expect(resolveProviderRequestScreenModel({
      isLocked: false,
      status: "DISCUSSING",
      lockedAt: "2026-08-06T00:00:00.000Z",
      totalAmountRubles: 12000,
    }).statusLabel).toBe("Договор");
  });

  it("скрывает workflow и кадастровую панель архивному исполнителю", () => {
    expect(
      resolveProviderRequestScreenModel({
        isLocked: true,
        status: "ACTIVE",
        lockedAt: "2026-08-06T00:00:00.000Z",
        totalAmountRubles: null,
      }),
    ).toEqual({
      mode: "archived",
      statusLabel: "Работу выполняет другой исполнитель",
      showDealWorkflow: false,
      showCadastralPanel: false,
    });
  });

  it("показывает завершение другим исполнителем", () => {
    expect(
      resolveProviderRequestScreenModel({
        isLocked: true,
        status: "COMPLETED",
        lockedAt: "2026-08-06T00:00:00.000Z",
        totalAmountRubles: null,
      }).statusLabel,
    ).toBe("Завершена другим исполнителем");
  });
});
