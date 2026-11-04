import 'dotenv/config';
import { MessengerConfig } from '../src/messengers/messenger-config';
import { record } from '../src/messengers/messenger-events';

async function main() {
  const config = new MessengerConfig();
  const apply = process.argv.includes('--apply');
  const baseUrl = process.env.MESSENGER_WEBHOOK_BASE_URL;
  if (!baseUrl || new URL(baseUrl).protocol !== 'https:') {
    throw new Error(
      'Задайте MESSENGER_WEBHOOK_BASE_URL: публичный HTTPS-адрес backend',
    );
  }
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
      const response = await fetch(`${api}/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(!telegram ? { Authorization: bot.token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const result = record(await response.json());
      if (!response.ok || result.ok === false || result.success === false)
        throw new Error(`${platform}: API status ${response.status}`);
      return result;
    };
    const target = `${baseUrl.replace(/\/$/, '')}/messengers/${platform}/webhook`;
    const me = await call(telegram ? 'getMe' : 'me');
    const identity = telegram ? record(me.result) : me;
    if (
      typeof identity.username !== 'string' ||
      identity.username.toLowerCase() !== bot.username.toLowerCase()
    ) {
      throw new Error(`${platform}: BOT_USERNAME не соответствует токену`);
    }
    const current = await call(telegram ? 'getWebhookInfo' : 'subscriptions');
    const urls = telegram
      ? [record(current.result).url]
      : Array.isArray(current.subscriptions)
        ? current.subscriptions.map((s: unknown) => record(s).url)
        : [];
    if (urls.some((url) => typeof url === 'string' && url && url !== target)) {
      throw new Error(
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
    console.log('Режим проверки. Для регистрации: повторите с --apply.');
}

void main().catch(() => {
  // Не выводим сетевое исключение: URL Telegram содержит токен.
  console.error(
    'Настройка не завершена. Проверьте env, доступность API, соответствие username токену и существующие webhooks.',
  );
  process.exitCode = 1;
});
