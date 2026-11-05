import { Injectable } from '@nestjs/common';
import type { MessengerPlatform } from '@prisma/client';
import { GrammyError } from 'grammy';
import { MessengerConfig } from './messenger-config';
import { record } from './messenger-events';
import { createTelegramApi } from './telegram-api';

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
    if (platform === 'TELEGRAM') {
      let message: unknown;
      try {
        message = await createTelegramApi(bot.token, 10).sendMessage(
          chatId,
          text,
          {
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
          },
        );
      } catch (error) {
        // SDK errors can include the request payload: expose only numeric codes.
        if (error instanceof GrammyError) {
          throw new MessengerApiError(
            typeof error.error_code === 'number' ? error.error_code : 502,
            typeof error.parameters.retry_after === 'number'
              ? error.parameters.retry_after
              : 0,
          );
        }
        throw new MessengerApiError(0);
      }
      const messageId = record(message).message_id;
      if (typeof messageId !== 'number' && typeof messageId !== 'string')
        throw new MessengerApiError(502);
      return String(messageId);
    }
    const url = `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`;
    const body = {
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
          Authorization: bot.token,
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
    const messageId = record(record(payload.message).body).mid;
    if (typeof messageId !== 'string' && typeof messageId !== 'number')
      throw new MessengerApiError(502);
    return String(messageId);
  }
}
