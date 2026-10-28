import { describe, expect, it } from "vitest";
import { SHORT_DESCRIPTION_LENGTH, serviceAttention } from "./service-attention";

const longDescription = "а".repeat(SHORT_DESCRIPTION_LENGTH);

describe("serviceAttention", () => {
  it("ничего не требует от заполненной карточки", () => {
    expect(serviceAttention({ status: "PUBLISHED", image: "a.jpg", description: longDescription })).toBeNull();
  });

  it("сначала просит фото", () => {
    expect(serviceAttention({ status: "DRAFT", image: null, description: "" })).toBe("no-photo");
  });

  it("отличает пустое описание от короткого", () => {
    expect(serviceAttention({ status: "PUBLISHED", image: "a.jpg", description: "   " })).toBe("no-description");
    expect(serviceAttention({ status: "PUBLISHED", image: "a.jpg", description: "Делаю в сроки" })).toBe(
      "short-description",
    );
  });

  it("не дёргает за архивные услуги", () => {
    expect(serviceAttention({ status: "ARCHIVED", image: null, description: null })).toBeNull();
  });
});
