import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const secretMarker = 'PRIVATE_TEST_SECRET_DO_NOT_LOG';
const preload = `
const { createRequire } = await import('node:module');
const require = createRequire(process.cwd() + '/package.json');
const grammyPath = require.resolve('grammy');
const grammy = require(grammyPath);
// Keep the real SDK but replace its HTTP transport inside this child process.
require.cache[grammyPath].exports = {
  ...grammy,
  Api: class extends grammy.Api {
    constructor(token, options) {
      super(token, { ...options, fetch: (...args) => globalThis.fetch(...args) });
    }
  }
};
globalThis.fetch = async (url, init) => {
  const scenario = process.env.MESSENGER_TEST_SCENARIO;
  const telegram = url.includes('api.telegram.org');
  const path = url.split('/').pop();
  const networkCodes = {
    reset: 'ECONNRESET',
    refused: 'ECONNREFUSED',
    timeout: 'ETIMEDOUT',
    'connect-timeout': 'UND_ERR_CONNECT_TIMEOUT',
    unreachable: 'ENETUNREACH',
    unknown: process.env.TELEGRAM_BOT_TOKEN,
  };
  if (Object.hasOwn(networkCodes, scenario)) {
    throw new Error('Request failed: ' + url, { cause: { code: networkCodes[scenario] } });
  }
  if (scenario === 'dns' || scenario === 'tls') {
    throw new Error('Request failed: ' + url, {
      cause: { code: scenario === 'dns' ? 'ENOTFOUND' : 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }
    });
  }
  if (scenario === 'unauthorized') return Response.json({ ok: false, error_code: 401, description: process.env.TELEGRAM_BOT_TOKEN }, { status: 401 });
  if (scenario === 'invalid-json') return new Response(process.env.TELEGRAM_BOT_TOKEN, { status: 200 });
  if (path === 'getMe') return Response.json({ ok: true, result: { username: scenario === 'username' ? 'other_bot' : 'telegram_bot' } });
  if (path === 'me') return Response.json({ username: 'max_bot' });
  if (path === 'getWebhookInfo') return Response.json({ ok: true, result: { url: scenario === 'conflict' ? 'https://other.example/' + process.env.TELEGRAM_BOT_TOKEN : scenario.startsWith('polling') ? 'https://api.example.com/messengers/TELEGRAM/webhook' : '' } });
  if (path === 'subscriptions' && init.method === 'GET') return Response.json({ subscriptions: [] });
  if (scenario === 'polling-apply' && path === 'deleteWebhook') {
    if (JSON.parse(init.body).drop_pending_updates !== false) throw new Error('Updates must be preserved');
    return Response.json({ ok: true, result: true });
  }
  if ((scenario === 'apply' || scenario === 'polling-apply') && init.method === 'POST') {
    const body = JSON.parse(init.body);
    const platform = telegram ? 'TELEGRAM' : 'MAX';
    if (body.url !== 'https://api.example.com/messengers/' + platform + '/webhook') throw new Error('Invalid webhook URL');
    if (telegram) {
      if (path !== 'setWebhook' || body.secret_token !== process.env.TELEGRAM_WEBHOOK_SECRET || body.drop_pending_updates !== false || JSON.stringify(body.allowed_updates) !== JSON.stringify(['message', 'my_chat_member', 'callback_query'])) throw new Error('Invalid Telegram subscription');
      return Response.json({ ok: true, result: true });
    }
    if (path !== 'subscriptions' || body.secret !== process.env.MAX_WEBHOOK_SECRET || !body.update_types.includes('bot_started') || !body.update_types.includes('message_callback')) throw new Error('Invalid MAX subscription');
    return Response.json({ success: true });
  }
  throw new Error('Unexpected mutation or request: ' + url);
};
`;

function run(
  scenario = 'ok',
  baseUrl = 'https://api.example.com',
  apply = false,
  mode = 'webhook',
) {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--import',
      `data:text/javascript,${encodeURIComponent(preload)}`,
      'scripts/configure-messengers.ts',
      ...(apply ? ['--apply'] : []),
    ],
    {
      encoding: 'utf8',
      timeout: 15_000,
      env: {
        ...process.env,
        MESSENGER_TEST_SCENARIO: scenario,
        MESSENGER_SITE_URL: 'https://example.com',
        MESSENGER_WEBHOOK_BASE_URL: baseUrl,
        TELEGRAM_BOT_USERNAME: 'telegram_bot',
        TELEGRAM_BOT_TOKEN: secretMarker,
        TELEGRAM_WEBHOOK_SECRET: secretMarker,
        TELEGRAM_UPDATES_MODE: mode,
        MAX_BOT_USERNAME: 'max_bot',
        MAX_BOT_TOKEN: secretMarker,
        MAX_WEBHOOK_SECRET: secretMarker,
      },
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.stdout + result.stderr).not.toContain(secretMarker);
  return result;
}

describe('messenger setup diagnostics', () => {
  it('checks both bots without registering webhooks in dry-run mode', () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'TELEGRAM: бот проверен; webhook готов к настройке',
    );
    expect(result.stdout).toContain(
      'MAX: бот проверен; webhook готов к настройке',
    );
    expect(result.stdout).toContain('Режим проверки');
  });

  it.each(['', '"https://api.example.com"', 'http://api.example.com'])(
    'identifies a missing or invalid webhook base URL: %s',
    (baseUrl) => {
      const result = run('ok', baseUrl);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('MESSENGER_WEBHOOK_BASE_URL');
      expect(result.stdout).not.toContain('запрос');
    },
  );

  it.each([
    ['unauthorized', 'TELEGRAM getMe: API status 401'],
    ['invalid-json', 'TELEGRAM getMe: API вернул некорректный JSON'],
    ['dns', 'TELEGRAM getMe: ошибка DNS'],
    ['tls', 'TELEGRAM getMe: ошибка проверки TLS-сертификата'],
    ['reset', 'ошибка подключения к API (ECONNRESET)'],
    ['refused', 'ошибка подключения к API (ECONNREFUSED)'],
    ['timeout', 'ошибка подключения к API (ETIMEDOUT)'],
    ['connect-timeout', 'ошибка подключения к API (UND_ERR_CONNECT_TIMEOUT)'],
    ['unreachable', 'ошибка подключения к API (ENETUNREACH)'],
    ['unknown', 'сетевая ошибка при обращении к API'],
    ['username', 'TELEGRAM_BOT_USERNAME не соответствует токену'],
    ['conflict', 'уже подключён к другому сервису'],
  ])(
    'reports %s safely without leaking tokens or webhook URLs',
    (scenario, message) => {
      const result = run(scenario);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
      expect(result.stdout).not.toContain('webhook зарегистрирован');
    },
  );

  it('registers both webhooks with their secrets and preserves pending Telegram updates', () => {
    const result = run('apply', 'https://api.example.com', true);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('TELEGRAM: webhook зарегистрирован');
    expect(result.stdout).toContain('MAX: webhook зарегистрирован');
  });

  it('refuses to replace another webhook in apply mode', () => {
    const result = run('conflict', 'https://api.example.com', true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('уже подключён к другому сервису');
    expect(result.stdout).not.toContain('запрос setWebhook');
  });

  it('checks polling without deleting the webhook', () => {
    const result = run('polling', undefined, false, 'polling');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('режим polling; webhook нужно отключить');
    expect(result.stdout).not.toContain('запрос deleteWebhook');
    expect(result.stdout).not.toContain('запрос setWebhook');
  });

  it('switches Telegram to polling, preserving events and keeping MAX on webhook', () => {
    const result = run('polling-apply', undefined, true, 'polling');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('запрос deleteWebhook');
    expect(result.stdout).toContain('накопленные события сохранены');
    expect(result.stdout).toContain('MAX: webhook зарегистрирован');
    expect(result.stdout).not.toContain('запрос setWebhook');
  });

  it('does not delete an unrelated webhook in polling mode', () => {
    const result = run('conflict', undefined, true, 'polling');
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('запрос deleteWebhook');
  });

  it('can apply polling again when Telegram already has no webhook', () => {
    const result = run('apply', undefined, true, 'polling');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('режим polling; webhook отключён');
    expect(result.stdout).not.toContain('запрос deleteWebhook');
    expect(result.stdout).toContain('MAX: webhook зарегистрирован');
  });
});
