import {
  canShowCustomerCounterpartyButton,
  canShowProviderCounterpartyButton,
  getCounterpartyInitials,
  getCustomerContactFields,
  getProviderContactFields,
  hasAnyCounterpartyValue,
} from "./counterparty-card";

describe("counterparty card", () => {
  it("hides provider button before lock and when locked to another provider", () => {
    expect(canShowProviderCounterpartyButton({ lockedAt: null, isLocked: false })).toBe(false);
    expect(
      canShowProviderCounterpartyButton({
        lockedAt: "2026-08-13T00:00:00.000Z",
        isLocked: true,
      }),
    ).toBe(false);
  });

  it("shows provider button after lock for the chosen provider", () => {
    expect(
      canShowProviderCounterpartyButton({
        lockedAt: "2026-08-13T00:00:00.000Z",
        isLocked: false,
      }),
    ).toBe(true);
  });

  it("shows customer button only after lock", () => {
    expect(canShowCustomerCounterpartyButton({ lockedAt: null })).toBe(false);
    expect(canShowCustomerCounterpartyButton({ lockedAt: "2026-08-13T00:00:00.000Z" })).toBe(true);
  });

  it("builds contact fields and detects empty values", () => {
    const empty = getCustomerContactFields({
      customerName: null,
      customerPhone: null,
      customerEmail: "  ",
    });
    expect(hasAnyCounterpartyValue(empty)).toBe(false);

    const filled = getProviderContactFields({
      providerName: "Геодезия Плюс",
      providerPhone: null,
      providerEmail: null,
    });
    expect(filled[0]?.value).toBe("Геодезия Плюс");
    expect(hasAnyCounterpartyValue(filled)).toBe(true);
  });

  it("builds initials from given name then surname", () => {
    expect(getCounterpartyInitials("Усова Валерия Арсеновна")).toBe("ВУ");
    expect(getCounterpartyInitials("Усова Валерия")).toBe("ВУ");
    expect(getCounterpartyInitials("Геодезия")).toBe("Г");
    expect(getCounterpartyInitials(null)).toBe("?");
  });
});
