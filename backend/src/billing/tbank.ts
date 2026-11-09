import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export function bankRedirectDueDate(date: Date): string {
  // Init requires seconds and an explicit UTC offset; milliseconds with Z cause 9999.
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

export function bankToken(payload: Record<string, unknown>, password: string) {
  const values = { ...payload, Password: password };
  const source = Object.keys(values)
    .filter(
      (key) =>
        key !== 'Token' &&
        ['string', 'number', 'boolean'].includes(typeof values[key]),
    )
    .sort()
    .map((key) => String(values[key]))
    .join('');
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

export function verifyBankToken(
  payload: Record<string, unknown>,
  password: string,
) {
  if (
    typeof payload.Token !== 'string' ||
    !/^[a-f\d]{64}$/i.test(payload.Token)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(payload.Token, 'hex'),
    Buffer.from(bankToken(payload, password), 'hex'),
  );
}

function httpsUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? '');
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !url.search
    )
      return url;
  } catch {
    /* invalid configuration */
  }
  throw new ServiceUnavailableException(
    'Не настроены HTTPS-адреса оплаты: TBANK_SITE_URL и TBANK_NOTIFICATION_URL',
  );
}

export function billingConfig() {
  const mode = process.env.TBANK_MODE ?? 'test';
  const enabled = process.env.TBANK_ENABLED ?? process.env.TBANK_TEST_ENABLED;
  if (enabled !== '1')
    throw new ServiceUnavailableException(
      'Оплата выключена: установите TBANK_ENABLED=1',
    );
  if (mode !== 'test' && mode !== 'live')
    throw new ServiceUnavailableException(
      'TBANK_MODE должен быть test или live',
    );
  if (mode === 'live' && process.env.TBANK_ENABLED !== '1')
    throw new ServiceUnavailableException(
      'Для боевой оплаты требуется TBANK_ENABLED=1',
    );
  const terminalKey = (process.env.TBANK_TERMINAL_KEY ?? '').trim();
  const password = process.env.TBANK_PASSWORD ?? '';
  if (!terminalKey || !password)
    throw new ServiceUnavailableException(
      'Не заданы TBANK_TERMINAL_KEY и TBANK_PASSWORD',
    );
  if (mode === 'test' && !terminalKey.endsWith('DEMO'))
    throw new ServiceUnavailableException(
      'Для тестового режима нужен DEMO-терминал',
    );
  if (mode === 'live' && terminalKey.endsWith('DEMO'))
    throw new ServiceUnavailableException(
      'Для боевой оплаты нужен рабочий терминал без DEMO',
    );
  return {
    mode,
    terminalKey,
    password,
    siteUrl: httpsUrl(process.env.TBANK_SITE_URL).origin,
    notificationUrl: httpsUrl(process.env.TBANK_NOTIFICATION_URL).toString(),
  };
}

export function safePaymentUrl(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const url = new URL(value);
      if (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        [
          'pay.tbank.ru',
          'pay.tbank-online.com',
          'securepay.tinkoff.ru',
          'securepay.tbank.ru',
        ].includes(url.hostname)
      )
        return value;
    } catch {
      /* reject unexpected bank response */
    }
  }
  throw new ServiceUnavailableException(
    'Банк не вернул безопасную ссылку для оплаты',
  );
}

@Injectable()
export class TbankClient {
  async call(
    method: 'Init' | 'GetState' | 'CheckOrder' | 'Charge',
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const config = billingConfig();
    const payload = { ...data, TerminalKey: config.terminalKey };
    try {
      // Live terminals and DEMO terminal test cases use this API host.
      const response = await fetch(
        `https://securepay.tinkoff.ru/v2/${method}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            Token: bankToken(payload, config.password),
          }),
          signal: AbortSignal.timeout(8000),
          redirect: 'error',
        },
      );
      if (!response.ok) throw new Error('Bank HTTP error');
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || Array.isArray(result))
        throw new Error('Invalid response');
      return result as Record<string, unknown>;
    } catch {
      // Never log payloads, tokens, passwords or card details. Never retry Init blindly.
      throw new ServiceUnavailableException(
        'Ответ банка не получен. Проверьте статус платежа в истории перед новой попыткой.',
      );
    }
  }
}
