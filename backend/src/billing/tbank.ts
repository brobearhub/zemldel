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
    'Не настроены HTTPS-адреса тестовой оплаты',
  );
}

export function billingConfig() {
  const terminalKey = process.env.TBANK_TERMINAL_KEY ?? '';
  const password = process.env.TBANK_PASSWORD ?? '';
  if (
    process.env.TBANK_TEST_ENABLED !== '1' ||
    !terminalKey.endsWith('DEMO') ||
    !password
  ) {
    throw new ServiceUnavailableException('Тестовая оплата пока не настроена');
  }
  return {
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
      // DEMO terminals use the production API host, but cannot charge real money.
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
