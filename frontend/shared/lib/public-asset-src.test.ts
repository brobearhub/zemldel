import { afterEach, describe, expect, it, vi } from "vitest";
import { storageFallbackSrc } from "./public-asset-src";

describe("storageFallbackSrc", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("подменяет CDN на path-style Object Storage", () => {
    vi.stubEnv("NEXT_PUBLIC_YA_S3_ENDPOINT", "https://storage.yandexcloud.net");
    vi.stubEnv("NEXT_PUBLIC_YA_S3_PUBLIC_BUCKET", "zemledel-public-test");
    vi.stubEnv("NEXT_PUBLIC_YA_S3_FORCE_PATH_STYLE", "true");

    expect(
      storageFallbackSrc(
        "https://cdn.zemledel.pro/public/stories/80876fbc-864b-4dd7-a02f-095736741903/photo.webp",
      ),
    ).toBe(
      "https://storage.yandexcloud.net/zemledel-public-test/public/stories/80876fbc-864b-4dd7-a02f-095736741903/photo.webp",
    );
  });

  it("сохраняет query", () => {
    vi.stubEnv("NEXT_PUBLIC_YA_S3_ENDPOINT", "https://storage.yandexcloud.net");
    vi.stubEnv("NEXT_PUBLIC_YA_S3_PUBLIC_BUCKET", "zemledel-public-test");
    vi.stubEnv("NEXT_PUBLIC_YA_S3_FORCE_PATH_STYLE", "true");

    expect(storageFallbackSrc("https://cdn.zemledelpro.ru/public/a.jpg?v=2")).toBe(
      "https://storage.yandexcloud.net/zemledel-public-test/public/a.jpg?v=2",
    );
  });

  it("не трогает чужие хосты и локальные превью", () => {
    vi.stubEnv("NEXT_PUBLIC_YA_S3_ENDPOINT", "https://storage.yandexcloud.net");
    vi.stubEnv("NEXT_PUBLIC_YA_S3_PUBLIC_BUCKET", "zemledel-public-test");
    vi.stubEnv("NEXT_PUBLIC_YA_S3_FORCE_PATH_STYLE", "true");

    expect(storageFallbackSrc("https://cdn.example/story.jpg")).toBeNull();
    expect(storageFallbackSrc("blob:http://localhost:4000/preview")).toBeNull();
  });

  it("без env фолбека нет", () => {
    expect(storageFallbackSrc("https://cdn.zemledel.pro/public/a.webp")).toBeNull();
  });
});
