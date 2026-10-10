import { describe, expect, it } from "vitest";
import {
  formatRequestOpenedAt,
  getRequestOpenAge,
  replySentMarkDelay,
  requestCustomerInitials,
  formatRequestOpenedStamp,
  serviceRequestRowBody,
  serviceRequestRowTitle,
} from "./format-service-request";

describe("getRequestOpenAge", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");

  it.each([
    ["2026-10-08T12:00:00.000Z", 1, "минута"],
    ["2026-10-08T11:59:00.000Z", 1, "минута"],
    ["2026-10-08T11:58:00.000Z", 2, "минуты"],
    ["2026-10-08T11:05:00.000Z", 55, "минут"],
    ["2026-10-08T11:00:00.000Z", 1, "час"],
    ["2026-10-08T09:30:00.000Z", 2, "часа"],
    ["2026-10-08T07:00:00.000Z", 5, "часов"],
    ["2026-10-07T12:00:00.000Z", 1, "день"],
    ["2026-10-06T12:00:00.000Z", 2, "дня"],
    ["2026-10-03T12:00:00.000Z", 5, "дней"],
  ])("считает возраст %s", (createdAt, count, label) => {
    expect(getRequestOpenAge(createdAt, now)).toEqual({ count, label });
  });
});

describe("replySentMarkDelay", () => {
  const now = new Date("2026-10-09T15:00:00.000Z");

  it.each([
    [null, null],
    ["", null],
    ["не дата", null],
    ["2026-10-09T15:00:01.000Z", null],
    ["2026-10-09T15:00:00.000Z", 5_000],
    ["2026-10-09T14:59:56.000Z", 1_000],
    ["2026-10-09T14:59:55.000Z", null],
    ["2026-10-09T14:00:00.000Z", null],
  ])("для %s остаётся %s мс", (sentAt, delay) => {
    expect(replySentMarkDelay(sentAt, now)).toBe(delay);
  });
});

describe("requestCustomerInitials", () => {
  it.each([
    [null, "?"],
    ["", "?"],
    ["  ", "?"],
    ["Павел", "П"],
    ["Усов Павел", "ПУ"],
    ["Усов Павел Иванович", "ПУ"],
  ])("для %j даёт %s", (name, initials) => {
    expect(requestCustomerInitials(name)).toBe(initials);
  });
});

describe("serviceRequestRowTitle", () => {
  it.each([
    ["Иван Иванов", "Подключение", "Иван Иванов"],
    ["  Анна Петрова  ", "Подключение", "Анна Петрова"],
    [null, "Подключение", "Подключение"],
    ["", "Подключение", "Подключение"],
    ["   ", "  Подключение  ", "Подключение"],
    [null, null, "Заявка"],
    ["", "  ", "Заявка"],
  ])("для имени %j и услуги %j даёт %s", (customerName, serviceTitle, title) => {
    expect(serviceRequestRowTitle(customerName, serviceTitle)).toBe(title);
  });
});

describe("serviceRequestRowBody", () => {
  it("под именем показывает текст заявки", () => {
    expect(
      serviceRequestRowBody({
        title: "Иван Иванов",
        customerName: "Иван Иванов",
        message: "Нужно подключить щиток",
      }),
    ).toBe("Нужно подключить щиток");
  });

  it("без текста ничего не добавляет", () => {
    expect(
      serviceRequestRowBody({
        title: "Иван Иванов",
        customerName: "Иван Иванов",
        message: "  ",
      }),
    ).toBe("");
  });

  it("не повторяет текст, если он уже заголовок, и оставляет имя", () => {
    expect(
      serviceRequestRowBody({
        title: "Нужен электрик",
        customerName: "  Иван Иванов ",
        message: "Нужен электрик",
      }),
    ).toBe("Иван Иванов");
  });
});

describe("formatRequestOpenedStamp", () => {
  it("собирает число, короткий месяц и время", () => {
    const openedAt = new Date(2026, 9, 8, 15, 58).toISOString();
    expect(formatRequestOpenedStamp(openedAt)).toEqual({ day: "08", month: "окт", time: "15:58" });
  });

  it("для пустой даты возвращает null", () => {
    expect(formatRequestOpenedStamp("не дата")).toBeNull();
  });
});

describe("formatRequestOpenedAt", () => {
  it("собирает дату как «06 октября в 13:39»", () => {
    const openedAt = new Date(2026, 9, 6, 13, 39).toISOString();
    expect(formatRequestOpenedAt(openedAt)).toBe("06 октября в 13:39");
  });
});
