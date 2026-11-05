import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const secretMarker = 'PRIVATE_TEST_SECRET_DO_NOT_LOG';
const preload = `
globalThis.fetch = async (url, init) => {
  const scenario = process.env.MESSENGER_TEST_SCENARIO;
  const telegram = url.includes('api.telegram.org');
  const path = url.split('/').pop();
  if (scenario === 'dns' || scenario === 'tls') {
    throw new Error('Request failed: ' + url, {
      cause: { code: scenario === 'dns' ? 'ENOTFOUND' : 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }
    });
  }
  if (scenario === 'unauthorized') return new Response(process.env.TELEGRAM_BOT_TOKEN, { status: 401 });
  if (scenario === 'invalid-json') return new Response(process.env.TELEGRAM_BOT_TOKEN, { status: 200 });
  if (path === 'getMe') return Response.json({ ok: true, result: { username: scenario === 'username' ? 'other_bot' : 'telegram_bot' } });
  if (path === 'me') return Response.json({ username: 'max_bot' });
  if (path === 'getWebhookInfo') return Response.json({ ok: true, result: { url: scenario === 'conflict' ? 'https://other.example/' + process.env.TELEGRAM_BOT_TOKEN : '' } });
  if (path === 'subscriptions' && init.method === 'GET') return Response.json({ subscriptions: [] });
  throw new Error('Unexpected mutation or request: ' + url);
};
`;

function run(scenario = 'ok', baseUrl = 'https://api.example.com') {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--import',
      `data:text/javascript,${encodeURIComponent(preload)}`,
      'scripts/configure-messengers.ts',
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
    ['unauthorized', 'TELEGRAM getMe: HTTP 401'],
    ['invalid-json', 'TELEGRAM getMe: API вернул некорректный JSON'],
    ['dns', 'TELEGRAM getMe: ошибка DNS'],
    ['tls', 'TELEGRAM getMe: ошибка проверки TLS-сертификата'],
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
});
