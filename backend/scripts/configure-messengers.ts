import 'dotenv/config';
import { MessengerConfig } from '../src/messengers/messenger-config';
import { record } from '../src/messengers/messenger-events';

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
      return 'ошибка DNS';
    case 'ECONNREFUSED':
    case 'ECONNRESET':
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
      return 'ошибка подключения к API';
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'CERT_HAS_EXPIRED':
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
      return 'ошибка проверки TLS-сертификата; проверьте доверенные CA';
    default:
      return 'сетевая ошибка при обращении к API';
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
    const telegram = platform === 'TELEGRAM';
    const api = telegram
      ? `https://api.telegram.org/bot${bot.token}`
      : 'https://platform-api2.max.ru';
    const call = async (path: string, body?: object) => {
      console.log(`${platform}: запрос ${path}`);
      let response: Response;
      try {
        response = await fetch(`${api}/${path}`, {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(!telegram ? { Authorization: bot.token } : {}),
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
    const me = await call(telegram ? 'getMe' : 'me');
    const identity = telegram ? record(me.result) : me;
    if (
      typeof identity.username !== 'string' ||
      identity.username.toLowerCase() !== bot.username.toLowerCase()
    ) {
      throw new ConfigurationError(
        `${platform}: ${platform}_BOT_USERNAME не соответствует токену; укажите имя бота без @ и ссылки`,
      );
    }
    const current = await call(telegram ? 'getWebhookInfo' : 'subscriptions');
    const urls = telegram
      ? [record(current.result).url]
      : Array.isArray(current.subscriptions)
        ? current.subscriptions.map((s: unknown) => record(s).url)
        : [];
    if (urls.some((url) => typeof url === 'string' && url && url !== target)) {
      throw new ConfigurationError(
        `${platform}: уже подключён к другому сервису. Автоматическая замена отключена.`,
      );
    }
    console.log(
      `${platform}: бот проверен; webhook ${urls.includes(target) ? 'уже настроен' : 'готов к настройке'}`,
    );
    if (!apply) continue;
    await call(
      telegram ? 'setWebhook' : 'subscriptions',
      telegram
        ? {
            url: target,
            secret_token: bot.secret,
            allowed_updates: ['message', 'my_chat_member'],
            drop_pending_updates: false,
          }
        : {
            url: target,
            secret: bot.secret,
            update_types: ['message_created', 'bot_started', 'bot_stopped'],
          },
    );
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
