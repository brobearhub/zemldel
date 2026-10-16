import { describe, expect, it } from "vitest";
import { fnsSiteUrl, registrationNumberLabel } from "./model";

describe("registrationNumberLabel", () => {
  it("у ИП номер называется ОГРНИП", () => {
    expect(registrationNumberLabel("SOLE_PROPRIETOR")).toBe("ОГРНИП");
  });

  it("у организации номер называется ОГРН", () => {
    expect(registrationNumberLabel("COMPANY")).toBe("ОГРН");
  });

  it("у самозанятого и физлица регистрационного номера нет", () => {
    expect(registrationNumberLabel("SELF_EMPLOYED")).toBeNull();
    expect(registrationNumberLabel("INDIVIDUAL")).toBeNull();
  });
});

describe("fnsSiteUrl", () => {
  it("ведёт ИП и организацию на ЕГРЮЛ, самозанятого на проверку НПД", () => {
    expect(fnsSiteUrl("SOLE_PROPRIETOR")).toBe("https://egrul.nalog.ru/index.html");
    expect(fnsSiteUrl("COMPANY")).toBe("https://egrul.nalog.ru/index.html");
    expect(fnsSiteUrl("SELF_EMPLOYED")).toBe("https://npd.nalog.ru/check-status/");
  });
});
