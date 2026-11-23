import 'dotenv/config';
import { InternalAuthService } from '../src/auth/internal-auth.service';

type Json = Record<string, any>;

const BASE = `http://localhost:${process.env.PORT ?? 3003}`;

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function req<T>(input: {
  method: string;
  path: string;
  token?: string;
  body?: unknown;
}): Promise<{ status: number; json: T }> {
  const headers: Record<string, string> = {};
  if (input.token) headers['x-internal-auth'] = input.token;
  if (input.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${BASE}${input.path}`, {
    method: input.method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });

  const json = (await res.json().catch(() => null)) as T;
  return { status: res.status, json };
}

function assertOk(status: number, json: any, label: string) {
  if (status < 200 || status >= 300) {
    throw new Error(`${label} failed: status=${status} body=${JSON.stringify(json)}`);
  }
}

async function main() {
  const secret = mustEnv('INTERNAL_API_SECRET');

  const stamp = Date.now();
  const customerEmail = `smoke.customer.${stamp}@example.test`;
  const providerEmail = `smoke.provider.${stamp}@example.test`;
  const password = '123456';

  const acceptedLegal = Object.fromEntries(await Promise.all(
    ['terms', 'privacy', 'consent'].map(async (docId) => {
      const doc = await req<{ version: string }>({ method: 'GET', path: `/legal-docs/${docId}/current` });
      assertOk(doc.status, doc.json, docId);
      return [docId, doc.json.version];
    }),
  ));
  const cities = await req<Array<{ id: string }>>({ method: 'GET', path: '/cities/suggest?q=Москва&limit=1' });
  const customerCityId = cities.json[0]?.id;
  if (!customerCityId) throw new Error('Seed the city directory before running this smoke test');

  for (const [email, accountKind] of [[customerEmail, 'CUSTOMER'], [providerEmail, 'PROVIDER']]) {
    const start = await req({ method: 'POST', path: '/auth/signup/start', body: { email, accountKind } });
    assertOk(start.status, start.json, 'start signup');
    const inbox = process.env.MAILCATCHER_URL ?? 'http://127.0.0.1:1081';
    const messages = await (await fetch(`${inbox}/messages`)).json() as Array<{ id: number; recipients: string[] }>;
    const message = messages.find((item) => item.recipients.some((address) => address.replace(/[<>]/g, '') === email));
    if (!message) throw new Error(`No verification email for ${email} in local MailCatcher`);
    const mail = await (await fetch(`${inbox}/messages/${message.id}.plain`)).text();
    const code = mail.match(/\b\d{4}\b/)?.[0];
    if (!code) throw new Error('No verification code in message');
    const proof = await req<{ registrationToken: string }>({
      method: 'POST', path: '/auth/signup/verify', body: { email, code },
    });
    assertOk(proof.status, proof.json, 'verify email');
    const result = await req({
      method: 'POST', path: '/auth/signup',
      body: {
        email, accountKind, password, registrationToken: proof.json.registrationToken, acceptedLegal,
        ...(accountKind === 'CUSTOMER' ? { name: 'Smoke Customer', customerCityId } : {}),
      },
    });
    assertOk(result.status, result.json, 'complete signup');
  }

  const customerLogin = await req<Json>({
    method: 'POST',
    path: '/auth/login',
    body: { email: customerEmail, password },
  });
  assertOk(customerLogin.status, customerLogin.json, 'customer login');
  const providerLogin = await req<Json>({
    method: 'POST',
    path: '/auth/login',
    body: { email: providerEmail, password },
  });
  assertOk(providerLogin.status, providerLogin.json, 'provider login');

  const customerId = customerLogin.json.id as string;
  const providerUserId = providerLogin.json.id as string;

  const customerToken = InternalAuthService.createTokenForUserId(customerId, secret);
  const providerToken = InternalAuthService.createTokenForUserId(providerUserId, secret);

  // Get a category id
  const categories = await req<Array<{ id: string }>>({
    method: 'GET',
    path: '/service-categories',
  });
  assertOk(categories.status, categories.json, 'list categories');
  const categoryId = categories.json[0]?.id;
  if (!categoryId) throw new Error('No categories found, seed DB first');

  // Create provider profile
  const slug = `smoke-${stamp}`;
  const createdProvider = await req<any>({
    method: 'POST',
    path: '/providers',
    token: providerToken,
    body: {
      name: 'Smoke Provider Co',
      slug,
      type: 'COMPANY',
      offerVersion: '2026-08-04',
    },
  });
  assertOk(createdProvider.status, createdProvider.json, 'create provider');
  const providerId =
    (createdProvider.json as any)?.provider?.id ??
    (createdProvider.json as any)?.id ??
    (createdProvider.json as any)?.providerId ??
    null;
  if (!providerId || typeof providerId !== 'string') {
    throw new Error(
      `create provider: missing id in response: ${JSON.stringify(createdProvider.json)}`,
    );
  }

  // Create a service (published)
  const createdService = await req<{ id: string }>({
    method: 'POST',
    path: '/pro/services',
    token: providerToken,
    body: {
      categoryId,
      status: 'PUBLISHED',
      title: 'Smoke Service',
      price: '1000 ₽',
      description: 'smoke',
      image: null,
      stockBadge: null,
      rating: null,
      reviewCount: null,
      paletteColor: 'primary',
    },
  });
  assertOk(createdService.status, createdService.json, 'create service');
  const serviceId = createdService.json.id;

  // Create request from service as customer
  const createdRequest = await req<Json>({
    method: 'POST',
    path: `/services/${serviceId}/requests`,
    token: customerToken,
    body: { customerEmail, message: 'Хочу заказать услугу' },
  });
  assertOk(createdRequest.status, createdRequest.json, 'create service request');
  const requestId = createdRequest.json.id as string;

  // Provider sets terms
  const setTerms = await req<Json>({
    method: 'POST',
    path: `/pro/requests/${requestId}/set-terms`,
    token: providerToken,
    body: { dealTerms: { price: '1000', scope: 'smoke' } },
  });
  assertOk(setTerms.status, setTerms.json, 'set terms');

  // Customer accepts terms
  const acceptTerms = await req<Json>({
    method: 'POST',
    path: `/requests/mine/${requestId}/accept-terms`,
    token: customerToken,
  });
  assertOk(acceptTerms.status, acceptTerms.json, 'accept terms');

  // Customer selects provider
  const selectProvider = await req<Json>({
    method: 'POST',
    path: `/requests/mine/${requestId}/select-provider`,
    token: customerToken,
    body: { providerId },
  });
  assertOk(selectProvider.status, selectProvider.json, 'select provider');

  // Customer accepts contract
  const acceptContract = await req<Json>({
    method: 'POST',
    path: `/requests/mine/${requestId}/accept-contract`,
    token: customerToken,
    body: { termsVersion: '2026-08-04' },
  });
  assertOk(acceptContract.status, acceptContract.json, 'accept contract');

  // Customer saves passport
  const savePassport = await req<Json>({
    method: 'PUT',
    path: '/documents/passport/mine',
    token: customerToken,
    body: {
      series: '1234',
      number: '123456',
      issuedBy: 'ОВД Тест',
      issuedAt: '2020-01-02',
      departmentCode: '000-000',
      registrationAddress: 'г. Тест, ул. Тестовая, д. 1',
      fullName: 'Иванов Иван Иванович',
      birthDate: '1990-01-01',
    },
  });
  assertOk(savePassport.status, savePassport.json, 'save passport');

  // Provider reads passport by request
  const providerPassport = await req<Json>({
    method: 'GET',
    path: `/pro/requests/${requestId}/passport`,
    token: providerToken,
  });
  assertOk(providerPassport.status, providerPassport.json, 'provider reads passport');
  if (providerPassport.json.series !== '1234') {
    throw new Error(`passport mismatch: ${JSON.stringify(providerPassport.json)}`);
  }

  // Contracts: create template -> fork -> instance -> sign both sides
  const tpl = await req<{ id: string }>({
    method: 'POST',
    path: '/pro/contracts/templates',
    token: providerToken,
    body: { title: 'Шаблон (smoke)', markdown: '# Договор\n\nТестовый договор.' },
  });
  assertOk(tpl.status, tpl.json, 'create contract template');

  const fork = await req<{ id: string }>({
    method: 'POST',
    path: `/pro/contracts/templates/${tpl.json.id}/fork`,
    token: providerToken,
    body: {},
  });
  assertOk(fork.status, fork.json, 'fork contract template');

  const inst = await req<{ id: string }>({
    method: 'POST',
    path: '/pro/contracts/instances',
    token: providerToken,
    body: { templateId: fork.json.id, serviceRequestId: requestId },
  });
  assertOk(inst.status, inst.json, 'create contract instance');

  const signCustomer = await req<Json>({
    method: 'POST',
    path: `/contracts/instances/${inst.json.id}/sign`,
    token: customerToken,
  });
  assertOk(signCustomer.status, signCustomer.json, 'customer signs contract');

  const signProvider = await req<Json>({
    method: 'POST',
    path: `/pro/contracts/instances/${inst.json.id}/sign`,
    token: providerToken,
  });
  assertOk(signProvider.status, signProvider.json, 'provider signs contract');

  const instAfter = await req<Json>({
    method: 'GET',
    path: `/pro/contracts/instances/${inst.json.id}`,
    token: providerToken,
  });
  assertOk(instAfter.status, instAfter.json, 'get signed contract');
  if (instAfter.json.status !== 'SIGNED') {
    throw new Error(`expected SIGNED, got: ${JSON.stringify(instAfter.json)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        created: {
          customerEmail,
          providerEmail,
          providerId,
          serviceId,
          requestId,
          contractTemplateId: tpl.json.id,
          contractInstanceId: inst.json.id,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

