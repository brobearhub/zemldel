import { describe, expect, it } from "vitest";
import { orderReplyPreview, visibleReplyPreview } from "./reply-preview";

describe("orderReplyPreview", () => {
  it("ставит вопрос заказчика над ответом, если позже написал исполнитель", () => {
    expect(
      orderReplyPreview({
        customerMessage: "За 1000 сделаешь?",
        providerMessage: "Могу за 1500",
        providerSpokeLast: true,
      }),
    ).toEqual([
      { author: "customer", body: "За 1000 сделаешь?" },
      { author: "provider", body: "Могу за 1500" },
    ]);
  });

  it("ставит прошлый ответ над новым вопросом, если позже написал заказчик", () => {
    expect(
      orderReplyPreview({
        customerMessage: "А завтра?",
        providerMessage: "Могу за 1500",
        providerSpokeLast: false,
      }),
    ).toEqual([
      { author: "provider", body: "Могу за 1500" },
      { author: "customer", body: "А завтра?" },
    ]);
  });

  it("оставляет одну сторону, если второй реплики нет", () => {
    expect(
      orderReplyPreview({
        customerMessage: "Когда сможете?",
        providerMessage: "   ",
        providerSpokeLast: false,
      }),
    ).toEqual([{ author: "customer", body: "Когда сможете?" }]);

    expect(
      orderReplyPreview({
        customerMessage: null,
        providerMessage: "Завтра в десять",
        providerSpokeLast: true,
      }),
    ).toEqual([{ author: "provider", body: "Завтра в десять" }]);
  });

  it("схлопывает пробелы и отбрасывает пустые строки", () => {
    expect(
      orderReplyPreview({
        customerMessage: "  Первая\nстрока  ",
        providerMessage: null,
        providerSpokeLast: true,
      }),
    ).toEqual([{ author: "customer", body: "Первая строка" }]);

    expect(
      orderReplyPreview({
        customerMessage: null,
        providerMessage: null,
        providerSpokeLast: false,
      }),
    ).toEqual([]);
  });
});

describe("visibleReplyPreview", () => {
  const pair = orderReplyPreview({
    customerMessage: "А сколько будет стоить ваша услуга?",
    providerMessage: "Посмотрите в разделе оплата",
    providerSpokeLast: true,
  });

  it("в «Ждем ответ» оставляет сообщение, на которое ответили, и свою последнюю реплику", () => {
    expect(visibleReplyPreview({ lines: pair, waitingForReply: true, ownAuthor: "provider" })).toEqual(pair);
  });

  it("в «Ответить» оставляет только последнее сообщение собеседника", () => {
    const incoming = orderReplyPreview({
      customerMessage: "Заказчик выбрал вас исполнителем",
      providerMessage: "привет",
      providerSpokeLast: false,
    });

    expect(visibleReplyPreview({ lines: incoming, waitingForReply: false, ownAuthor: "provider" })).toEqual([
      { author: "customer", body: "Заказчик выбрал вас исполнителем" },
    ]);
    expect(visibleReplyPreview({ lines: incoming, waitingForReply: false, ownAuthor: "customer" })).toEqual([
      { author: "provider", body: "привет" },
    ]);
  });
});
