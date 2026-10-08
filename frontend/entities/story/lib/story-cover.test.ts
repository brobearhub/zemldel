import { describe, expect, it } from "vitest";
import { resolveStoryCover, storyAuthorInitials } from "./story-cover";

describe("resolveStoryCover", () => {
  it("предпочитает фото сторис", () => {
    expect(
      resolveStoryCover({
        imageUrl: "https://cdn/story.jpg",
        authorImageUrl: "https://cdn/avatar.jpg",
      }),
    ).toEqual({ kind: "image", src: "https://cdn/story.jpg" });
  });

  it("без фото сторис берёт аватар автора", () => {
    expect(
      resolveStoryCover({
        imageUrl: null,
        authorImageUrl: "https://cdn/avatar.jpg",
      }),
    ).toEqual({ kind: "image", src: "https://cdn/avatar.jpg" });
  });

  it("без фото показывает инициалы", () => {
    expect(resolveStoryCover({ imageUrl: null, authorImageUrl: null })).toEqual({
      kind: "initials",
    });
  });
});

describe("storyAuthorInitials", () => {
  it("берёт первую и последнюю буквы", () => {
    expect(storyAuthorInitials("Анна Кузнецова")).toBe("АК");
  });

  it("для одного слова берёт первую букву", () => {
    expect(storyAuthorInitials("Межа")).toBe("М");
  });
});
