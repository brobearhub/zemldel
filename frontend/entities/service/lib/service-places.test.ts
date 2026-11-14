import { describe, expect, it } from "vitest";
import { placeChipLabel, placeSelectionKey, uniqueServicePlaces, splitServicesByCity, type ServicePlace } from "./service-places";

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

describe("city selection identity", () => {
  it("matches the same name and region across IDs, case and whitespace", () => {
    const alias = { ...kazan, cityId: "another-id", name: "  КАЗАНЬ  " };
    expect(placeSelectionKey(alias)).toBe(placeSelectionKey(kazan));
    expect(uniqueServicePlaces([kazan, alias])).toEqual([kazan]);
  });

  it("keeps the same name in a different region and different names in the same region", () => {
    const otherRegion = { ...kazan, cityId: "other-region", regionCode: "43", regionName: "Кировская область" };
    const otherCity = { ...kazan, cityId: "other-city", name: "Елабуга" };
    expect(uniqueServicePlaces([kazan, otherRegion, otherCity])).toEqual([kazan, otherRegion, otherCity]);
    expect(uniqueServicePlaces([kazan, otherRegion, otherCity, tatarstan])).toEqual([otherRegion, tatarstan]);
  });

  it("does not duplicate a renamed city ID and handles public hero-city names", () => {
    expect(uniqueServicePlaces([kazan, { ...kazan, name: "Другое имя" }])).toEqual([kazan]);
    const hero = { ...kazan, cityId: "hero", name: "город-герой Волгоград", regionCode: "34" };
    expect(placeSelectionKey(hero)).toBe(placeSelectionKey({ ...hero, cityId: "plain", name: "Волгоград" }));
  });
});

describe("service coverage", () => {
  it("replaces cities with their selected region regardless of selection order", () => {
    expect(uniqueServicePlaces([kazan, tatarstan])).toEqual([tatarstan]);
    expect(uniqueServicePlaces([tatarstan, kazan])).toEqual([tatarstan]);
  });

  it("keeps federal cities separate from the neighboring region", () => {
    const moscow = { ...kazan, cityId: "moscow", name: "Москва", regionCode: "77" };
    const region = { ...tatarstan, regionCode: "50", regionName: "Московская область" };
    expect(uniqueServicePlaces([moscow, region])).toEqual([moscow, region]);
  });

  it("replaces all selected places with nationwide coverage", () => {
    const national = { ...tatarstan, name: "Вся Россия", regionName: "Вся Россия", regionCode: "RU" };
    expect(uniqueServicePlaces([kazan, tatarstan, national, national])).toEqual([national]);
  });
});

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

 it("includes nationwide services in every city", () => {
  const national = { places: [{ kind: "region" as const, name: "Вся Россия", regionCode: "RU", regionName: "Вся Россия" }] };
  expect(splitServicesByCity([national], { id: "any", regionCode: "66" })).toEqual({ mine: [national], other: [] });
});
