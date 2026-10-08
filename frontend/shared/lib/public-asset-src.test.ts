import { afterEach, describe, expect, it, vi } from "vitest";
import { toPublicAssetSrc } from "./public-asset-src";

describe("toPublicAssetSrc", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("в dev проксирует публичный CDN через same-origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      toPublicAssetSrc(
        "https://cdn.zemledel.pro/public/stories/80876fbc-864b-4dd7-a02f-095736741903/photo.webp",
      ),
    ).toBe(
      "/api/dev-cdn/cdn.zemledel.pro/public/stories/80876fbc-864b-4dd7-a02f-095736741903/photo.webp",
    );
  });

  it("сохраняет query у CDN-адреса", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toPublicAssetSrc("https://cdn.zemledelpro.ru/public/a.jpg?v=2")).toBe(
      "/api/dev-cdn/cdn.zemledelpro.ru/public/a.jpg?v=2",
    );
  });

  it("не трогает чужие хосты и локальные превью", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toPublicAssetSrc("https://cdn.example/story.jpg")).toBe("https://cdn.example/story.jpg");
    expect(toPublicAssetSrc("blob:http://localhost:4000/preview")).toBe(
      "blob:http://localhost:4000/preview",
    );
  });

  it("в production оставляет CDN-адрес как есть", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(toPublicAssetSrc("https://cdn.zemledel.pro/public/a.webp")).toBe(
      "https://cdn.zemledel.pro/public/a.webp",
    );
  });
});
