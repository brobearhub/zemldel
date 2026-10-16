import { describe, expect, it } from "vitest";
import { placeChipLabel, splitServicesByCity, type ServicePlace } from "./service-places";

const kazan: ServicePlace = {
  kind: "city",
  cityId: "kazan",
  name: "Казань",
  regionCode: "16",
  regionName: "респ. Татарстан",
};

const tatarstan: ServicePlace = {
  kind: "region",
  name: "респ. Татарстан",
  regionCode: "16",
  regionName: "респ. Татарстан",
};

describe("splitServicesByCity", () => {
  it("находит услугу по городу и по области без дублей, явный город выше", () => {
    const items = [
      { id: "region", places: [tatarstan] },
      { id: "city", places: [kazan] },
      { id: "both", places: [kazan, tatarstan] },
      { id: "other", places: [{ ...kazan, cityId: "msk", name: "Москва", regionCode: "77" }] },
    ];

    const split = splitServicesByCity(items, { id: "kazan", regionCode: "16" });
    expect(split.mine.map((item) => item.id)).toEqual(["city", "both", "region"]);
    expect(split.other.map((item) => item.id)).toEqual(["other"]);
  });
});

describe("placeChipLabel", () => {
  it("показывает имя города и короткую область", () => {
    expect(placeChipLabel(kazan)).toBe("Казань");
    expect(placeChipLabel(tatarstan)).toBe("Республика Татарстан");
    expect(placeChipLabel({ ...tatarstan, regionName: "обл. Московская", name: "обл. Московская" })).toBe(
      "Московская обл.",
    );
  });
});
