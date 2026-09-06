import { areSignInFieldsFilled } from "./are-sign-in-fields-filled";

describe("areSignInFieldsFilled", () => {
  it("is false when email or password is empty", () => {
    expect(areSignInFieldsFilled("", "")).toBe(false);
    expect(areSignInFieldsFilled("user@example.com", "")).toBe(false);
    expect(areSignInFieldsFilled("", "secret")).toBe(false);
    expect(areSignInFieldsFilled("   ", "secret")).toBe(false);
  });

  it("is true when both fields have values", () => {
    expect(areSignInFieldsFilled("user@example.com", "secret")).toBe(true);
  });
});
