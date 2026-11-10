import 'dotenv/config';
import { GrammyError, HttpError } from 'grammy';
import { MessengerConfig } from '../src/messengers/messenger-config';
import { record } from '../src/messengers/messenger-events';
import { createTelegramApi } from '../src/messengers/telegram-api';

// Only locally constructed messages are safe to print. Provider responses and
// network exceptions can contain the Telegram token in a URL.
class ConfigurationError extends Error {}

function networkFailure(error: unknown): string {
  const failure = record(error);
  if (failure.name === 'TimeoutError' || failure.name === 'AbortError')
    return 'тайм-аут запроса';
  const code = record(failure.cause).code ?? failure.code;
  switch (code) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `ошибка DNS (${code})`;
    case 'ECONNREFUSED':
    case 'ECONNRESET':
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
    case 'ENETUNREACH':
    case 'EHOSTUNREACH':
      return `ошибка подключения к API (${code})`;
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'CERT_HAS_EXPIRED':
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
      return `ошибка проверки TLS-сертификата (${code}); проверьте доверенные CA`;
    default:
      return 'сетевая ошибка при обращении к API';
  }
}

async function callTelegram<T>(
  method: string,
  execute: () => Promise<T>,
): Promise<T> {
  console.log(`TELEGRAM: запрос ${method}`);
  try {
    return await execute();
  } catch (error) {
    if (error instanceof GrammyError) {
      const status =
        typeof error.error_code === 'number' ? error.error_code : 502;
      const hint = [401, 403].includes(status)
        ? '; проверьте TELEGRAM_BOT_TOKEN и доступ бота к API'
        : '';
      throw new ConfigurationError(
        `TELEGRAM ${method}: API status ${status}${hint}`,
      );
    }
    const underlying: unknown =
      error instanceof HttpError ? error.error : error;
    const failure = record(underlying);
    if (failure.name === 'SyntaxError' || failure.type === 'invalid-json') {
      throw new ConfigurationError(
        `TELEGRAM ${method}: API вернул некорректный JSON`,
      );
    }
    throw new ConfigurationError(
      `TELEGRAM ${method}: ${networkFailure(underlying)}`,
    );
  }
}

async function main() {
  const config = new MessengerConfig();
  const apply = process.argv.includes('--apply');
  const baseUrl = process.env.MESSENGER_WEBHOOK_BASE_URL;
  if (!baseUrl) {
    throw new ConfigurationError(
      'Задайте MESSENGER_WEBHOOK_BASE_URL: публичный HTTPS-адрес backend',
    );
  }
  try {
    if (new URL(baseUrl).protocol !== 'https:') throw new Error();
  } catch {
    throw new ConfigurationError(
      'MESSENGER_WEBHOOK_BASE_URL должен быть корректным HTTPS-адресом без кавычек',
    );
  }
  console.log('MESSENGER_WEBHOOK_BASE_URL: формат проверен');
  for (const platform of ['TELEGRAM', 'MAX'] as const) {
    if (!config.configured(platform)) {
      console.log(`${platform}: пропущен, настройки не заполнены`);
      continue;
    }
    const bot = config.bot(platform);
    const telegramApi =
      platform === 'TELEGRAM' ? createTelegramApi(bot.token, 15) : null;
    const callMax = async (path: string, body?: object) => {
      console.log(`${platform}: запрос ${path}`);
      let response: Response;
      try {
        response = await fetch(`https://platform-api2.max.ru/${path}`, {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: bot.token,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(15000),
        });
      } catch (error) {
        throw new ConfigurationError(
          `${platform} ${path}: ${networkFailure(error)}`,
        );
      }
      if (!response.ok) {
        const hint = [401, 403].includes(response.status)
          ? `; проверьте ${platform}_BOT_TOKEN и доступ бота к API`
          : '';
        throw new ConfigurationError(
          `${platform} ${path}: HTTP ${response.status}${hint}`,
        );
      }
      let result: Record<string, unknown>;
      try {
        result = record(await response.json());
      } catch {
        throw new ConfigurationError(
          `${platform} ${path}: API вернул некорректный JSON (HTTP ${response.status})`,
        );
      }
      if (result.ok === false || result.success === false)
        throw new ConfigurationError(
          `${platform} ${path}: API отклонил запрос (HTTP ${response.status})`,
        );
      return result;
    };
    const target = `${baseUrl.replace(/\/$/, '')}/messengers/${platform}/webhook`;
    const identity = telegramApi
      ? record(await callTelegram('getMe', () => telegramApi.getMe()))
      : await callMax('me');
    if (
      typeof identity.username !== 'string' ||
      identity.username.toLowerCase() !== bot.username.toLowerCase()
    ) {
      throw new ConfigurationError(
        `${platform}: ${platform}_BOT_USERNAME не соответствует токену; укажите имя бота без @ и ссылки`,
      );
    }
    let urls: unknown[];
    if (telegramApi) {
      const current = await callTelegram('getWebhookInfo', () =>
        telegramApi.getWebhookInfo(),
      );
      urls = [current.url];
    } else {
      const current = await callMax('subscriptions');
      urls = Array.isArray(current.subscriptions)
        ? current.subscriptions.map((s: unknown) => record(s).url)
        : [];
    }
    if (urls.some((url) => typeof url === 'string' && url && url !== target)) {
      throw new ConfigurationError(
        `${platform}: уже подключён к другому сервису. Автоматическая замена отключена.`,
      );
    }
    if (telegramApi && config.telegramUpdatesMode === 'polling') {
      console.log(
        `TELEGRAM: режим polling; webhook ${urls.some(Boolean) ? 'нужно отключить' : 'отключён'}`,
      );
      if (apply && urls.some(Boolean)) {
        await callTelegram('deleteWebhook', () =>
          telegramApi.deleteWebhook({ drop_pending_updates: false }),
        );
        console.log(
          'TELEGRAM: webhook отключён, накопленные события сохранены',
        );
      }
      if (apply)
        console.log(
          'TELEGRAM: polling подготовлен; backend запустит получение событий при MESSENGER_WORKER_ENABLED=true',
        );
      continue;
    }
    console.log(
      `${platform}: бот проверен; webhook ${urls.includes(target) ? 'уже настроен' : 'готов к настройке'}`,
    );
    if (!apply) continue;
    if (telegramApi) {
      await callTelegram('setWebhook', () =>
        telegramApi.setWebhook(target, {
          secret_token: bot.secret,
          allowed_updates: ['message', 'my_chat_member'],
          drop_pending_updates: false,
        }),
      );
    } else {
      await callMax('subscriptions', {
        url: target,
        secret: bot.secret,
        update_types: ['message_created', 'bot_started', 'bot_stopped'],
      });
    }
    console.log(`${platform}: webhook зарегистрирован`);
  }
  if (!apply)
    console.log('Режим проверки. Для регистрации: npm run messengers:setup.');
}

void main().catch((error: unknown) => {
  // Не выводим сетевое исключение: URL Telegram содержит токен.
  console.error(
    error instanceof ConfigurationError
      ? `Настройка не завершена: ${error.message}`
      : 'Настройка не завершена: неожиданная ошибка. Последняя строка выше указывает этап проверки.',
  );
  process.exitCode = 1;
});
