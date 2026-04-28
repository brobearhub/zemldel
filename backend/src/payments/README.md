# Payments Module

Pluggable payment service that handles both **customer payments** (escrow) and **provider payouts** with a full audit trail via `Payment` records.

## Architecture

```
PaymentsController  ──▶  PaymentsService  ──▶  PaymentProviderRegistry
                                │                       │
                                ▼                       ▼
                          Prisma (Payment)       PaymentProvider (abstract)
                                                        │
                                              TestPaymentProvider (key="test")
                                              YookassaProvider (key="yookassa") ← future
```

The `PaymentProvider` abstract class is the extension point. The registry selects a provider by `key`; the active default is set via `PAYMENTS_DEFAULT_PROVIDER` env.

## Data Model

```prisma
enum PaymentType   { PAYMENT PAYOUT }
enum PaymentStatus { PENDING SUCCEEDED FAILED CANCELLED }

model Payment {
  id                  String        @id @default(uuid())
  serviceRequestId    String
  type                PaymentType
  status              PaymentStatus @default(PENDING)
  providerKey         String        // "test" | "yookassa" | …
  amountMinor         Int           // amount in kopecks (RUB minor units)
  currency            String        @default("RUB")
  externalId          String?       // provider-side transaction id
  payload             Json?         // provider-specific metadata snapshot
  initiatedByUserId   String?
  initiatedByProviderId String?
  confirmedAt         DateTime?
  failedAt            DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}
```

Amount source: `serviceRequest.dealTerms.amountMinor` (integer kopecks). `BadRequestException` is thrown if the field is absent — this is expected once `dealTerms` is fully normalised.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/service-requests/mine/:id/pay` | user | Initiate customer payment for a service request |
| `POST` | `/pro/orders/:id/payout` | provider | Initiate payout to the provider for a completed order |
| `GET`  | `/payments/:id` | user | Fetch payment status by payment id |
| `POST` | `/payments/webhook/:providerKey` | shared secret | Receive payment outcome from provider |

### `POST /service-requests/mine/:id/pay`

- Validates service request is in `CONTRACT_ACCEPTED` or `PAYMENT_PENDING` and the caller is its customer.
- Idempotent: if a `PENDING` payment already exists, returns its `redirectUrl` instead of creating a second one.
- Transitions request to `PAYMENT_PENDING` (if still `CONTRACT_ACCEPTED`) and emits `PAYMENT_INITIATED` event.
- Returns `PaymentDto` including `redirectUrl` (provider's payment page).

### `POST /pro/orders/:id/payout`

- Validates service request is in `ACCEPTED` and the caller is its provider.
- For the test provider: payout is **synchronous** — Payment is created and immediately confirmed in the same DB transaction. Returns `PaymentDto { status: "SUCCEEDED" }`.
- For a real async provider: returns `PaymentDto { status: "PENDING" }` and waits for a webhook.

### `POST /payments/webhook/:providerKey`

Not authenticated by a user session. Each provider implementation validates its own shared secret from the request headers before processing.

Body (test provider):
```json
{ "externalId": "<uuid>", "outcome": "SUCCEEDED | FAILED | CANCELLED" }
```
Header: `x-test-webhook-secret: <TEST_PAYMENT_WEBHOOK_SECRET>`

Outcome application:
- `SUCCEEDED` + `PAYMENT` → `Payment.status = SUCCEEDED`, `ServiceRequest.status = PAYMENT_PROCESSING`, event `ESCROW_RESERVED`
- `FAILED | CANCELLED` + `PAYMENT` → `Payment.status = FAILED | CANCELLED`, `ServiceRequest.status = PAYMENT_PENDING`, event `PAYMENT_FAILED`
- `SUCCEEDED` + `PAYOUT` → `Payment.status = SUCCEEDED`, `ServiceRequest.status = PAID`, event `PAYOUT`

Duplicate webhooks on an already-terminal Payment are a no-op (idempotent).

## Test Provider Mock Flow

```
Customer clicks "Оплатить"
      │
      ▼
POST /service-requests/mine/:id/pay
      │   creates Payment(PENDING), transitions SR → PAYMENT_PENDING
      │   returns { redirectUrl: "http://localhost:3000/payments/mock/<paymentId>" }
      ▼
Browser navigates to /payments/mock/<paymentId>   (Next.js page)
      │   shows amount + "Оплатить" / "Отменить" buttons
      ▼
User clicks button
      │
      ▼
POST /api/payments/mock/<paymentId>/confirm        (Next.js server route — secret stays server-side)
      │   reads Payment to get externalId
      │   calls backend POST /payments/webhook/test
      │     with x-test-webhook-secret header
      ▼
Backend applies outcome → updates Payment + ServiceRequest
      │
      ▼
Browser redirected back to /orders/<serviceRequestId>
```

## Adding a Real Payment Provider

1. Create `src/payments/providers/<name>-payment.provider.ts` implementing `PaymentProvider`:

```ts
@Injectable()
export class YookassaProvider extends PaymentProvider {
  readonly key = 'yookassa';

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    // Call Yookassa API, return { externalId, redirectUrl, payload }
  }

  async parseWebhook(headers, body): Promise<PaymentWebhookResult> {
    // Validate Yookassa HMAC signature, map status to PaymentOutcome
  }
}
```

2. Register it in `payments.module.ts`:

```ts
providers: [
  PaymentsService,
  TestPaymentProvider,
  YookassaProvider,
  {
    provide: PAYMENT_PROVIDERS_TOKEN,
    useFactory: (test: TestPaymentProvider, yookassa: YookassaProvider) => [test, yookassa],
    inject: [TestPaymentProvider, YookassaProvider],
  },
  PaymentProviderRegistry,
],
```

3. Set `PAYMENTS_DEFAULT_PROVIDER=yookassa` in the environment.

No changes to `PaymentsService` or `PaymentsController` are required.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYMENTS_DEFAULT_PROVIDER` | yes | Active provider key. Default: `test` |
| `TEST_PAYMENT_WEBHOOK_SECRET` | yes (test) | Shared secret for test webhook. Must match `frontend/.env TEST_PAYMENT_WEBHOOK_SECRET` |
| `FRONTEND_URL` | yes | Base URL of the Next.js app. Used to build mock payment redirect URLs |

## ServiceRequest Status Transitions

```
CONTRACT_ACCEPTED ──[customerPay]──▶ PAYMENT_PENDING ──[webhookSucceeded]──▶ PAYMENT_PROCESSING
                                           │
                                     [webhookFailed]
                                           │
                                     PAYMENT_PENDING  (retryable)

ACCEPTED ──[providerPayout]──▶ PAID   (synchronous for test provider)
```

## Audit Events

Each transition records a `ServiceRequestEvent`:

| Event type | Trigger |
|------------|---------|
| `PAYMENT_INITIATED` | Customer initiates payment |
| `ESCROW_RESERVED` | Webhook: PAYMENT succeeded |
| `PAYMENT_FAILED` | Webhook: PAYMENT failed/cancelled |
| `PAYOUT` | Payout confirmed (webhook or synchronous) |
