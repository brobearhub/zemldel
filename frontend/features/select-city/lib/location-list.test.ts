import { describe, expect, it } from "vitest";
import {
  capitalLetters,
  cityLetter,
  filterByLetter,
  filterByPrefix,
  formatRegionShort,
  groupCitiesByLetter,
  includeSelectedCity,
  selectFeaturedCities,
} from "./location-list";

const cities = [
  { name: "Ярославль", featured: false },
  { name: "Уфа", featured: false },
  { name: "Казань", featured: true },
  { name: "Екатеринбург", featured: true },
  { name: "Ёлкино", featured: false },
];

describe("location list", () => {
  it("builds the alphabet from city names and folds ё into е", () => {
    expect(cityLetter("Ёлкино")).toBe("Е");
    expect(capitalLetters(cities)).toEqual(["Е", "К", "У", "Я"]);
  });

  it("filters capitals by letter without changing the source order", () => {
    expect(filterByLetter(cities, "Е").map((city) => city.name)).toEqual(["Екатеринбург", "Ёлкино"]);
    expect(filterByLetter(cities, null)).toEqual(cities);
  });

  it("filters capitals by name prefix", () => {
    expect(filterByPrefix(cities, " ка").map((city) => city.name)).toEqual(["Казань"]);
    expect(filterByPrefix(cities, "е").map((city) => city.name)).toEqual(["Екатеринбург", "Ёлкино"]);
  });

  it("groups cities under a letter in Russian alphabetical order", () => {
    expect(groupCitiesByLetter(cities)).toEqual([
      { letter: "Е", cities: [cities[3], cities[4]] },
      { letter: "К", cities: [cities[2]] },
      { letter: "У", cities: [cities[1]] },
      { letter: "Я", cities: [cities[0]] },
    ]);
  });

  it("keeps featured cities in the given order", () => {
    expect(selectFeaturedCities(cities).map((city) => city.name)).toEqual(["Казань", "Екатеринбург"]);
  });

  it("adds the selected city to featured chips only when it is missing", () => {
    const featured = [
      { id: "kazan", name: "Казань" },
      { id: "ekb", name: "Екатеринбург" },
    ];
    expect(includeSelectedCity(featured, { id: "anadyr", name: "Анадырь" }).map((city) => city.name)).toEqual([
      "Анадырь",
      "Казань",
      "Екатеринбург",
    ]);
    expect(includeSelectedCity(featured, featured[0])).toEqual(featured);
    expect(includeSelectedCity(featured, null)).toEqual(featured);
  });

  it("shortens the region shown beside a city", () => {
    expect(formatRegionShort("обл. Челябинская", "Челябинск")).toBe("Челябинская обл.");
    expect(formatRegionShort("Хабаровский край", "Хабаровск")).toBe("Хабаровский край");
    expect(formatRegionShort("респ. Башкортостан", "Уфа")).toBe("Башкортостан");
    expect(formatRegionShort("Республика Татарстан", "Казань")).toBe("Татарстан");
    expect(formatRegionShort("а.окр. Ненецкий", "Нарьян-Мар")).toBe("Ненецкий АО");
    expect(formatRegionShort("а.обл. Еврейская", "Биробиджан")).toBe("Еврейская авт. обл.");
    expect(formatRegionShort("обл. Кемеровская область - Кузбасс", "Кемерово")).toBe(
      "Кемеровская обл. - Кузбасс",
    );
    expect(formatRegionShort("г Москва", "Москва")).toBe("");
    expect(formatRegionShort("АО Ханты-Мансийский Автономный округ - Югра", "Ханты-Мансийск")).toBe(
      "Ханты-Мансийский АО - Югра",
    );
  });
});
