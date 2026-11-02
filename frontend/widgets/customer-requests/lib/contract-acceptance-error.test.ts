import { describe, expect, it } from "vitest";
import { extractAcceptContractError } from "./contract-acceptance-error";

describe("contract acceptance conflicts", () => {
  it("uses the specific reason rather than Nest's Conflict label", () => {
    expect(extractAcceptContractError({statusCode:409,error:"Conflict",message:"All requested documents must be uploaded"})).toContain("Загрузите все запрошенные документы");
  });
  it("does not demand an optional signature", () => {
    expect(extractAcceptContractError({error:"Conflict",message:"At least one approved contract bundle is required"})).toBe("Нужен одобренный пакет договора. Файл подписи необязателен.");
  });
  it("explains a changed price and unknown conflicts in Russian", () => {
    expect(extractAcceptContractError({message:"Price must be agreed before contract acceptance"})).toContain("согласуйте цену");
    expect(extractAcceptContractError({error:"Conflict"})).toContain("Условия заявки изменились");
  });
});
