import { describe, expect, it } from "vitest";
import { displayCityName, formatCityLabel, formatRegionLabel, shortRegionLabel } from "./format-city-label";

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

describe("shortRegionLabel", () => {
  it("сокращает область так же, как на пилюле географии", () => {
    expect(shortRegionLabel("обл. Московская")).toBe("Московская обл.");
    expect(shortRegionLabel("обл. Ленинградская")).toBe("Ленинградская обл.");
    expect(shortRegionLabel("респ. Татарстан")).toBe("Республика Татарстан");
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

  it("drops the hero-city prefix", () => {
    expect(displayCityName("город-герой Волгоград")).toBe("Волгоград");
    expect(formatCityLabel("город-герой Волгоград", "обл. Волгоградская")).toBe("Волгоград");
  });
});
