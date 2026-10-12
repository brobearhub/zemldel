import { describe, expect, it } from "vitest";
import { formatCityLabel, formatRegionLabel } from "./format-city-label";

describe("formatRegionLabel", () => {
  it("puts the full oblast word after the region name", () => {
    expect(formatRegionLabel("обл. Ивановская")).toBe("Ивановская область");
    expect(formatRegionLabel("Свердловская область")).toBe("Свердловская область");
    expect(formatRegionLabel("обл. Кемеровская область - Кузбасс")).toBe("Кемеровская область - Кузбасс");
  });

  it("expands the other short GAR region types", () => {
    expect(formatRegionLabel("респ. Адыгея")).toBe("Республика Адыгея");
    expect(formatRegionLabel("а.окр. Ненецкий")).toBe("Ненецкий автономный округ");
    expect(formatRegionLabel("а.обл. Еврейская")).toBe("Еврейская автономная область");
    expect(formatRegionLabel("г Москва")).toBe("Москва");
  });
});

describe("formatCityLabel", () => {
  it("omits the city type and keeps a full region name", () => {
    expect(formatCityLabel("Екатеринбург", "Свердловская область")).toBe("Екатеринбург, Свердловская область");
    expect(formatCityLabel("Иваново", "обл. Ивановская")).toBe("Иваново, Ивановская область");
  });

  it("hides the region when it repeats the city", () => {
    expect(formatCityLabel("Москва", "г Москва")).toBe("Москва");
  });
});
