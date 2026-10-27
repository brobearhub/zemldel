import { describe, expect, it } from "vitest";
import { formatProviderIdentity, formatSurnameInitials } from "./provider-identity";

const person = { lastName: "Усов", firstName: "Павел", middleName: "Николаевич" };

describe("formatProviderIdentity", () => {
  it("организация: наименование с формой собственности заглавными и подпись «Организация»", () => {
    expect(
      formatProviderIdentity({ providerType: "COMPANY", providerName: "ооо Бурый Медведь", providerPerson: null }),
    ).toEqual({ kindLabel: "Организация", title: "ООО Бурый Медведь", initials: "БМ" });
  });

  it("организация: не трогает название без формы собственности и снимает кавычки в инициалах", () => {
    expect(
      formatProviderIdentity({ providerType: "COMPANY", providerName: "Агро «Поле»", providerPerson: null }),
    ).toEqual({ kindLabel: "Организация", title: "Агро «Поле»", initials: "АП" });
  });

  it("ИП: «ИП Фамилия И. О.» без отдельной подписи", () => {
    expect(
      formatProviderIdentity({ providerType: "SOLE_PROPRIETOR", providerName: "ИП Усов П. Н.", providerPerson: person }),
    ).toEqual({ kindLabel: null, title: "ИП Усов П. Н.", initials: "ПУ" });
  });

  it("ИП без ФИО в сессии берёт готовое имя профиля", () => {
    expect(
      formatProviderIdentity({ providerType: "SOLE_PROPRIETOR", providerName: "ИП Усов В. Н." }),
    ).toMatchObject({ kindLabel: null, title: "ИП Усов В. Н." });
  });

  it("самозанятый: «Фамилия И. О.» и подпись «Самозанятый»", () => {
    expect(
      formatProviderIdentity({ providerType: "SELF_EMPLOYED", providerName: "Павел Усов", providerPerson: person }),
    ).toEqual({ kindLabel: "Самозанятый", title: "Усов П. Н.", initials: "ПУ" });
  });

  it("самозанятый без отчества", () => {
    expect(
      formatProviderIdentity({
        providerType: "SELF_EMPLOYED",
        providerName: "Павел Усов",
        providerPerson: { ...person, middleName: null },
      }).title,
    ).toBe("Усов П.");
  });

  it("физлицо: «Фамилия И. О.» и подпись «Физическое лицо»", () => {
    expect(
      formatProviderIdentity({ providerType: "INDIVIDUAL", providerName: "Павел Усов", providerPerson: person }),
    ).toEqual({ kindLabel: "Физическое лицо", title: "Усов П. Н.", initials: "ПУ" });
  });

  it("физлицо без ФИО в сессии собирает «Фамилия И.» из «Имя Фамилия»", () => {
    expect(
      formatProviderIdentity({ providerType: "INDIVIDUAL", providerName: "Павел Усов" }),
    ).toEqual({ kindLabel: "Физическое лицо", title: "Усов П.", initials: "ПУ" });
  });

  it("пустое имя не оставляет пустую строку", () => {
    expect(formatProviderIdentity({ providerType: "COMPANY", providerName: "  " }).title).toBe("Исполнитель");
  });
});

describe("formatSurnameInitials", () => {
  it("собирает «Фамилия И. О.» из ФИО", () => {
    expect(formatSurnameInitials(person)).toBe("Усов П. Н.");
    expect(formatSurnameInitials({ ...person, middleName: null })).toBe("Усов П.");
  });

  it("без ФИО разбирает «Имя Фамилия»", () => {
    expect(formatSurnameInitials(null, "Павел Усов")).toBe("Усов П.");
    expect(formatSurnameInitials(undefined, "Павел")).toBe("Павел");
    expect(formatSurnameInitials(null, null)).toBe("");
  });
});
