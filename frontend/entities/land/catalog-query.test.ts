import { describe, expect, it } from "vitest";
import { catalogRequest, landView, mapFilterScope } from "./catalog-query";

describe("land catalog views", () => {
  const filters = new URLSearchParams({
    cityId: "city",
    cadastralNumbers: "66:41:123456:7,66:41:1234567:89",
    purpose: "HOME,DACHA",
    sort: "PRICE_ASC",
    favorites: "1",
    bbox: "60,56,61,57",
    page: "2",
  });

  it("uses identical paginated results for list and tiles, preserving independent filters", () => {
    const tiles = new URLSearchParams(filters);
    tiles.set("view", "tiles");
    expect(landView(tiles)).toBe("tiles");
    expect(catalogRequest(tiles)).toBe(catalogRequest(filters));
    expect(
      Object.fromEntries(new URLSearchParams(catalogRequest(tiles))),
    ).toEqual(Object.fromEntries(filters));
  });

  it("accepts bookmarked maps and requests all markers for the same filters", () => {
    const map = new URLSearchParams(filters);
    map.set("map", "1");
    expect(landView(map)).toBe("map");
    const request = catalogRequest(map);
    map.delete("map");
    map.set("view", "map");
    expect(catalogRequest(map)).toBe(request);
    const expected = new URLSearchParams(filters);
    expected.delete("page");
    expected.set("map", "1");
    expect(Object.fromEntries(new URLSearchParams(request))).toEqual(
      Object.fromEntries(expected),
    );
    map.delete("bbox");
    expect(mapFilterScope(catalogRequest(map))).toBe(mapFilterScope(request));
  });

  it("keeps selection services off the offer map", () => {
    const params = new URLSearchParams("kind=SELECTION&map=1");
    expect(landView(params)).toBe("tiles");
    expect(catalogRequest(params)).toBe("?kind=SELECTION");
  });
});
