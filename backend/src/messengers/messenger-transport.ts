import { Injectable } from '@nestjs/common';
import type { MessengerPlatform } from '@prisma/client';
import { MessengerConfig } from './messenger-config';
import { record } from './messenger-events';

export class MessengerApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter = 0,
  ) {
    // Ответы API и URL могут содержать секреты: не помещаем их в исключение.
    super(`Messenger API status ${status}`);
  }
}

// Адаптер скрывает разные протоколы ботов от сценариев привязки и доставки.
@Injectable()
export class MessengerTransport {
  constructor(private readonly config: MessengerConfig) {}

  async send(
    platform: MessengerPlatform,
    chatId: string,
    text: string,
    link?: string,
  ): Promise<string> {
    const bot = this.config.bot(platform);
    const telegram = platform === 'TELEGRAM';
    const url = telegram
      ? `https://api.telegram.org/bot${bot.token}/sendMessage`
      : `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`;
    const body = telegram
      ? {
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
          ...(link
            ? {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Открыть чат на сайте', url: link }],
                  ],
                },
              }
            : {}),
        }
      : {
          text,
          ...(link
            ? {
                attachments: [
                  {
                    type: 'inline_keyboard',
                    payload: {
                      buttons: [
                        [
                          {
                            type: 'link',
                            text: 'Открыть чат на сайте',
                            url: link,
                          },
                        ],
                      ],
                    },
                  },
                ],
              }
            : {}),
        };
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!telegram ? { Authorization: bot.token } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new MessengerApiError(0);
    }
    const payload = record(await response.json().catch(() => null));
    if (!response.ok || payload.ok === false || payload.success === false) {
      throw new MessengerApiError(
        response.ok ? 400 : response.status,
        Number(
          record(payload.parameters).retry_after ??
            response.headers.get('retry-after') ??
            0,
        ),
      );
    }
    const messageId = telegram
      ? record(payload.result).message_id
      : record(record(payload.message).body).mid;
    if (typeof messageId !== 'string' && typeof messageId !== 'number')
      throw new MessengerApiError(502);
    return String(messageId);
  }
}
