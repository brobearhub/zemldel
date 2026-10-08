import { isOwnStory } from "./own-story";

const viewer = {
  userId: "user-1",
  memberships: [{ providerId: "provider-1", role: "OWNER", status: "ACTIVE" }],
};

describe("isOwnStory", () => {
  it("считает своей пользовательскую сторис текущего автора", () => {
    expect(isOwnStory({ authorType: "USER", authorUserId: "user-1", providerId: null }, viewer)).toBe(true);
    expect(isOwnStory({ authorType: "USER", authorUserId: "user-2", providerId: null }, viewer)).toBe(false);
  });

  it("считает своей сторис провайдера, которым зритель управляет", () => {
    expect(isOwnStory({ authorType: "PROVIDER", authorUserId: "user-2", providerId: "provider-1" }, viewer)).toBe(true);
    expect(
      isOwnStory({ authorType: "PROVIDER", authorUserId: "user-1", providerId: "provider-1" }, {
        ...viewer,
        memberships: [{ providerId: "provider-1", role: "OWNER", status: "SUSPENDED" }],
      }),
    ).toBe(false);
    expect(isOwnStory({ authorType: "PROVIDER", authorUserId: "user-1", providerId: "provider-2" }, viewer)).toBe(false);
  });

  it("для гостя ни одна сторис не своя", () => {
    expect(isOwnStory({ authorType: "USER", authorUserId: "user-1", providerId: null }, null)).toBe(false);
  });
});
