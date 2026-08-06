# Remove PROVIDER_SELECTED Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать статус/шаг `PROVIDER_SELECTED` и legacy-статусы (`CONTRACT_ACCEPTED`, `SERVICE_RENDERED`, `LOCKED`); фаза договора и эксклюзивность определяются через `lockedAt` + `providerId`.

**Architecture:** Выбор исполнителя (`select-provider`) фиксирует `providerId`/`lockedAt` и не меняет `status` (`DISCUSSING`/`TERMS_AGREED`). Все бывшие проверки `isExclusiveProviderStatus(status)` переводятся на `lockedAt != null`. UI-степпер: Новая → Обсуждение → Договор → …. Legacy-статусы мигрируются и удаляются из Prisma enum.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Vitest, Next.js, TypeScript, FSD.

## Global Constraints

- Спека: `docs/superpowers/specs/2026-08-06-remove-provider-selected-step-design.md`
- Source of truth домена: `docs/business-logic.md` (обновить в Task 7)
- Эксклюзивность/чат/«исполнитель выбран» для чужих провайдеров — сохранить поведение, сменить критерий на `lockedAt`
- Audit event types `PROVIDER_SELECTED` / `CONTRACT_ACCEPTED` / `SERVICE_RENDERED` **оставляем** (это не статусы заявки)
- Из enum/API/кода статусов заявки **полностью** убрать: `PROVIDER_SELECTED`, `CONTRACT_ACCEPTED`, `SERVICE_RENDERED`, `LOCKED` — без deprecated-шимов
- Lock **не** по голому `providerId` (SERVICE-заявки имеют `providerId` с создания)
- Коммиты — только если пользователь явно попросил; иначе пропускать commit-шаги
- Язык коммитов/комментариев — русский; идентификаторы — английский
- Без `any` без обоснования

## File map

| Path | Responsibility |
|------|----------------|
| Modify `backend/prisma/schema.prisma` | Enum `RequestStatus` без legacy |
| Create `backend/prisma/migrations/<ts>_remove_legacy_request_statuses/migration.sql` | Data backfill + recreate enum |
| Modify `backend/src/requests/dto/request.dto.ts` | Типы статусов, helpers lock/order |
| Modify `backend/src/requests/requests.service.ts` | select/accept/decline; убрать promote legacy |
| Modify `backend/src/chat/chat.service.ts` | Lock по `lockedAt` |
| Modify `backend/src/contract-files/contract-files.service.ts` | Exclusive manage по `lockedAt` |
| Modify `backend/src/request-document-requests/request-document-requests.service.ts` | Exclusive manage по `lockedAt` |
| Modify backend `*.spec.ts` / smoke | Актуальные статусы/fixtures |
| Modify `docs/business-logic.md` | Жизненный цикл / заказ = `lockedAt` |
| Modify `frontend/docs/roles-and-permissions.md` | Список статусов |
| Modify `frontend/entities/request/dto/request.dto.ts` | Типы + helpers |
| Modify `frontend/entities/request/ui/request-status-flow.ts` | Степпер без шага «Исполнитель выбран» |
| Modify `frontend/widgets/request-details/model/*` | CONTRACT по `lockedAt` |
| Modify `frontend/widgets/customer-requests/**` | canAccept / workspace / documents |
| Modify `frontend/widgets/pro-requests/**`, dashboard | Убрать legacy статусы |
| Regenerate `frontend/shared/api/generated/backend/Api.ts` | OpenAPI client |

---

### Task 1: Backend helpers — lock по `lockedAt` (TDD)

**Files:**
- Modify: `backend/src/requests/dto/request.dto.ts`
- Create: `backend/src/requests/dto/request-lock.spec.ts`

**Interfaces:**
- Consumes: Prisma/`RequestStatus` string values
- Produces (exact signatures):
  ```ts
  export type RequestStatus =
    | 'NEW'
    | 'DISCUSSING'
    | 'TERMS_AGREED'
    | 'ACTIVE'
    | 'ACCEPTANCE_PENDING'
    | 'ACCEPTED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'CLOSED';

  export const ORDER_EXECUTION_STATUSES = [
    'ACTIVE',
    'ACCEPTANCE_PENDING',
    'ACCEPTED',
    'COMPLETED',
    'CANCELLED',
  ] as const satisfies readonly RequestStatus[];

  export function isOrderExecutionStatus(
    value: RequestStatus | string,
  ): value is (typeof ORDER_EXECUTION_STATUSES)[number];

  /** Заявка зафиксирована за исполнителем (фаза заказа/договора и далее). */
  export function hasRequestLock(row: {
    lockedAt: Date | string | null | undefined;
  }): boolean;

  export function isLockedToOtherProvider(
    row: {
      lockedAt: Date | string | null | undefined;
      providerId: string | null | undefined;
    },
    actorProviderId: string,
  ): boolean;

  export function isExclusiveForActorProvider(
    row: {
      lockedAt: Date | string | null | undefined;
      providerId: string | null | undefined;
    },
    actorProviderId: string,
  ): boolean;
  ```
- Удалить: `EXCLUSIVE_PROVIDER_STATUSES`, `isExclusiveProviderStatus`, ветки legacy в `normalizeStatus`, `ORDER_STATUSES` entries for removed statuses, ApiProperty enums listing removed values.

- [ ] **Step 1: Write failing tests**

Создать `backend/src/requests/dto/request-lock.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  hasRequestLock,
  isExclusiveForActorProvider,
  isLockedToOtherProvider,
  isOrderExecutionStatus,
} from './request.dto';

describe('request lock helpers', () => {
  it('hasRequestLock is true only when lockedAt set', () => {
    expect(hasRequestLock({ lockedAt: null })).toBe(false);
    expect(hasRequestLock({ lockedAt: new Date() })).toBe(true);
    expect(hasRequestLock({ lockedAt: '2026-08-06T00:00:00.000Z' })).toBe(true);
  });

  it('does not treat providerId alone as lock (SERVICE pre-lock)', () => {
    expect(
      isLockedToOtherProvider(
        { lockedAt: null, providerId: 'p1' },
        'p2',
      ),
    ).toBe(false);
  });

  it('locks other providers when lockedAt + other providerId', () => {
    expect(
      isLockedToOtherProvider(
        { lockedAt: new Date(), providerId: 'p1' },
        'p2',
      ),
    ).toBe(true);
    expect(
      isExclusiveForActorProvider(
        { lockedAt: new Date(), providerId: 'p1' },
        'p1',
      ),
    ).toBe(true);
  });

  it('ORDER_EXECUTION_STATUSES no longer includes legacy values', () => {
    expect(isOrderExecutionStatus('ACTIVE')).toBe(true);
    expect(isOrderExecutionStatus('PROVIDER_SELECTED')).toBe(false);
    expect(isOrderExecutionStatus('CONTRACT_ACCEPTED')).toBe(false);
    expect(isOrderExecutionStatus('SERVICE_RENDERED')).toBe(false);
    expect(isOrderExecutionStatus('LOCKED')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd backend && npx vitest run src/requests/dto/request-lock.spec.ts`

Expected: FAIL (helpers missing / old exports)

- [ ] **Step 3: Implement helpers + slim status type**

В `request.dto.ts`:

```ts
export type RequestStatus =
  | 'NEW'
  | 'DISCUSSING'
  | 'TERMS_AGREED'
  | 'ACTIVE'
  | 'ACCEPTANCE_PENDING'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export const ORDER_EXECUTION_STATUSES = [
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly RequestStatus[];

export function hasRequestLock(row: {
  lockedAt: Date | string | null | undefined;
}): boolean {
  return row.lockedAt != null;
}

export function isLockedToOtherProvider(
  row: {
    lockedAt: Date | string | null | undefined;
    providerId: string | null | undefined;
  },
  actorProviderId: string,
): boolean {
  return (
    hasRequestLock(row) &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId
  );
}

export function isExclusiveForActorProvider(
  row: {
    lockedAt: Date | string | null | undefined;
    providerId: string | null | undefined;
  },
  actorProviderId: string,
): boolean {
  return hasRequestLock(row) && row.providerId === actorProviderId;
}
```

Обновить `normalizeStatus` — убрать legacy ветки.  
В `requestRowToProDtoPlain` заменить:

```ts
const locked = isLockedToOtherProvider(row, actorProviderId);
```

(нужно чтобы `row` содержал `lockedAt` в типе `RequestDbRow` — уже есть.)

Обновить все `@ApiProperty({ enum: [...] })` для status — без legacy.

Удалить экспорты `EXCLUSIVE_PROVIDER_STATUSES` / `isExclusiveProviderStatus`. Временно, если компиляция падает в других файлах — чинить импорты в Task 3–5 в том же PR-потоке (не оставлять re-export-shim).

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd backend && npx vitest run src/requests/dto/request-lock.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit** (только по явной просьбе пользователя)

```bash
git add backend/src/requests/dto/request.dto.ts backend/src/requests/dto/request-lock.spec.ts
git commit -m "refactor(requests): lock helpers на lockedAt, убрать legacy статусы из DTO"
```

---

### Task 2: Prisma migration — data + enum

**Files:**
- Modify: `backend/prisma/schema.prisma` (`enum RequestStatus`)
- Create: `backend/prisma/migrations/YYYYMMDDHHMMSS_remove_legacy_request_statuses/migration.sql`

**Interfaces:**
- Consumes: текущие строки `Request.status`
- Produces: enum без четырёх legacy values; данные согласованы с `lockedAt`

- [ ] **Step 1: Update schema enum**

В `backend/prisma/schema.prisma`:

```prisma
enum RequestStatus {
  NEW
  DISCUSSING
  TERMS_AGREED
  ACTIVE
  ACCEPTANCE_PENDING
  ACCEPTED
  COMPLETED
  CANCELLED
  CLOSED
}
```

- [ ] **Step 2: Write migration SQL** (паттерн как `20260614092000_remove_payments`)

```sql
-- 1) Data backfill before enum shrink
UPDATE "Request"
SET
  "lockedAt" = COALESCE("lockedAt", "updatedAt"),
  "status" = 'DISCUSSING'
WHERE "status" = 'PROVIDER_SELECTED';

UPDATE "Request"
SET "status" = 'ACTIVE'
WHERE "status" = 'CONTRACT_ACCEPTED';

UPDATE "Request"
SET
  "status" = 'ACCEPTANCE_PENDING',
  "acceptanceRequestedAt" = COALESCE("acceptanceRequestedAt", "updatedAt"),
  "autoAcceptAt" = COALESCE(
    "autoAcceptAt",
    COALESCE("acceptanceRequestedAt", "updatedAt") + INTERVAL '7 days'
  )
WHERE "status" = 'SERVICE_RENDERED';

UPDATE "Request"
SET "status" = CASE
  WHEN "providerId" IS NOT NULL THEN 'ACTIVE'
  ELSE 'DISCUSSING'
END
WHERE "status" = 'LOCKED';

-- 2) Recreate enum
ALTER TABLE "Request" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";

CREATE TYPE "RequestStatus" AS ENUM (
  'NEW',
  'DISCUSSING',
  'TERMS_AGREED',
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED'
);

ALTER TABLE "Request"
ALTER COLUMN "status" TYPE "RequestStatus"
USING ("status"::text::"RequestStatus");

ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'NEW'::"RequestStatus";

DROP TYPE "RequestStatus_old";
```

Создать папку миграции через:

```bash
cd backend && npx prisma migrate dev --name remove_legacy_request_statuses --create-only
```

Затем заменить содержимое `migration.sql` на SQL выше (если prisma сгенерировал иначе).

- [ ] **Step 3: Apply locally**

```bash
cd backend && npx prisma migrate dev
cd backend && npx prisma generate
```

Expected: migrate OK, client regenerated without legacy enum members.

- [ ] **Step 4: Commit** (по просьбе)

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "chore(db): удалить legacy статусы заявки, backfill lockedAt"
```

---

### Task 3: RequestsService — select / accept / decline / убрать promote

**Files:**
- Modify: `backend/src/requests/requests.service.ts`
- Modify: `backend/src/requests/requests.accept-contract.spec.ts`
- Create or extend: `backend/src/requests/requests.select-provider.spec.ts` (если удобнее — добавить кейсы в существующий spec)

**Interfaces:**
- Consumes: `hasRequestLock`, `isLockedToOtherProvider`, `isExclusiveForActorProvider`, `isOrderExecutionStatus`
- Produces:
  - `selectProviderByCustomer` → status unchanged; sets `providerId`, `lockedAt`, offers, event `PROVIDER_SELECTED`
  - `acceptContractByCustomer` → requires `hasRequestLock(req) && req.providerId`; rejects if missing
  - `declineOfferByProvider` when locked exclusive: unlock → `providerId/lockedAt = null`, status stays or `DISCUSSING`
  - удалить `promoteServiceRenderedIfNeeded` и ветки `CONTRACT_ACCEPTED`/`SERVICE_RENDERED` в mark-rendered/startWork

- [ ] **Step 1: Update accept-contract fixtures + add select-provider test (failing first if behavior not yet changed)**

В `requests.accept-contract.spec.ts` заменить fixtures:

```ts
status: 'DISCUSSING',
providerId: 'p1',
lockedAt: new Date('2026-08-06T00:00:00.000Z'),
```

Добавить тест (новый файл или в этот же):

```ts
it('acceptContract rejects when provider not locked', async () => {
  // status DISCUSSING, providerId set, lockedAt null → BadRequest
});
```

- [ ] **Step 2: Run — expect FAIL on new reject case / compile errors**

Run: `cd backend && npx vitest run src/requests/requests.accept-contract.spec.ts`

- [ ] **Step 3: Implement service changes**

`selectProviderByCustomer` update data:

```ts
data: {
  // status: не трогаем
  providerId: input.providerId,
  lockedAt: req.lockedAt ?? now,
},
```

Gate перед select: вместо `isExclusiveProviderStatus` → `hasRequestLock(req)` (уже заказ) / `CLOSED`.

`acceptContractByCustomer`:

```ts
if (!req.providerId || !hasRequestLock(req)) {
  throw new BadRequestException(
    'Provider must be selected before contract acceptance',
  );
}
```

Убрать `if (req.status !== 'PROVIDER_SELECTED')`.

`declineOfferByProvider`: заменить `req.status === 'PROVIDER_SELECTED'` на:

```ts
if (hasRequestLock(req) && req.providerId === actorProviderId) {
  await tx.request.update({
    where: { id: req.id },
    data: {
      status: req.status === 'TERMS_AGREED' ? 'TERMS_AGREED' : 'DISCUSSING',
      providerId: null,
      lockedAt: null,
      // ... остальные сбросы как сейчас
    },
  });
}
```

Все `isExclusiveProviderStatus(req.status)` → `hasRequestLock(req)` или `isLockedToOtherProvider(req, actorProviderId)` по смыслу.

`normalizeLifecycleIfNeeded`: только `autoAcceptIfNeeded` (без promote SERVICE_RENDERED).

Удалить deprecated `startWork` ветки, принимающие `CONTRACT_ACCEPTED`/`SERVICE_RENDERED`, если они ещё есть — оставить только актуальные переходы.

- [ ] **Step 4: Run tests**

```bash
cd backend && npx vitest run src/requests/requests.accept-contract.spec.ts src/requests/dto/request-lock.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit** (по просьбе)

---

### Task 4: Chat lock по `lockedAt`

**Files:**
- Modify: `backend/src/chat/chat.service.ts`
- Create/Modify: `backend/src/chat/chat.service.spec.ts` (если есть; иначе добавить минимальный unit на helper-логику через доступный test seam, либо покрыть через существующие chat tests)

**Interfaces:**
- Consumes: `hasRequestLock` / `isLockedToOtherProvider` from request.dto
- Produces: `lockedToOtherProvider` без `isLockedStatus(status)`

- [ ] **Step 1: Replace `isLockedStatus`**

Удалить `private isLockedStatus`. В `getRequestForChat` select добавить `lockedAt: true`.

Заменить все:

```ts
this.isLockedStatus(String(req.status)) &&
Boolean(req.providerId) &&
req.providerId !== subject.conversationProviderId
```

на:

```ts
isLockedToOtherProvider(req, subject.conversationProviderId)
```

(импорт из `../requests/dto/request.dto`).

Аналогично для других call-sites в файле (ensure/list), где сравнивают с `actorProviderId`.

- [ ] **Step 2: Compile/test**

```bash
cd backend && npx vitest run src/chat
```

Expected: PASS (или пустой suite + `npx tsc -p tsconfig.build.json --noEmit` без ошибок по chat)

- [ ] **Step 3: Commit** (по просьбе)

---

### Task 5: Contract files + document requests — exclusive по `lockedAt`

**Files:**
- Modify: `backend/src/contract-files/contract-files.service.ts`
- Modify: `backend/src/contract-files/contract-files.service.spec.ts`
- Modify: `backend/src/request-document-requests/request-document-requests.service.ts`
- Modify: `backend/src/request-document-requests/request-document-requests.service.spec.ts`

**Interfaces:**
- Consumes: `isExclusiveForActorProvider`, `hasRequestLock`, `isOrderExecutionStatus`
- Produces: manage allowed when `isExclusiveForActorProvider(request, providerId)`; pre-selection path when `!hasRequestLock(request) && request.providerId === null && status in NEW|DISCUSSING|TERMS_AGREED && offer SELECTED`

- [ ] **Step 1: Update specs fixtures**

```ts
// instead of status: 'PROVIDER_SELECTED' / 'CONTRACT_ACCEPTED'
status: 'DISCUSSING',
lockedAt: new Date(),
providerId: 'p1',
// for post-accept delete forbid:
status: 'ACTIVE',
lockedAt: new Date(),
```

- [ ] **Step 2: Implement**

`contract-files.service.ts` — select `lockedAt`; 

```ts
const isExclusiveForProvider = isExclusiveForActorProvider(request, input.providerId);

const isPreSelectionAllowed =
  !hasRequestLock(request) &&
  request.providerId === null &&
  (request.status === 'NEW' ||
    request.status === 'DISCUSSING' ||
    request.status === 'TERMS_AGREED') &&
  Boolean(await this.prisma.requestProviderOffer.findFirst({ ... }));
```

`request-document-requests.service.ts` — заменить проверки `EXCLUSIVE_PROVIDER_STATUSES.includes(status)` на `isExclusiveForActorProvider` / `hasRequestLock` (select `lockedAt` везде, где читается request для этих гейтов).

Гейты «после акцепта нельзя удалять» — по `isOrderExecutionStatus(status)` или `status === 'ACTIVE'` (как продуктово уже задумано), не по `CONTRACT_ACCEPTED`.

- [ ] **Step 3: Run**

```bash
cd backend && npx vitest run src/contract-files src/request-document-requests
```

Expected: PASS

- [ ] **Step 4: Commit** (по просьбе)

---

### Task 6: Backend sweep + smoke

**Files:**
- Grep-fix любые оставшиеся `PROVIDER_SELECTED|CONTRACT_ACCEPTED|SERVICE_RENDERED|'LOCKED'` в `backend/src` и `backend/scripts` (кроме audit event **type** strings)
- Modify: `backend/scripts/smoke-docs-auth-contracts.ts` — ожидания после select: status всё ещё discussing-фаза, есть provider; accept → ACTIVE

- [ ] **Step 1: Grep**

```bash
cd backend && rg "PROVIDER_SELECTED|CONTRACT_ACCEPTED|SERVICE_RENDERED|\\bLOCKED\\b" src scripts prisma -g '!**/migrations/**'
```

Допустимы только: audit `type: 'PROVIDER_SELECTED' | 'CONTRACT_ACCEPTED' | 'SERVICE_RENDERED'` и комментарии про события. Статусы заявки — нет.

- [ ] **Step 2: Fix leftovers + run unit suite**

```bash
cd backend && npm run test:unit
```

Expected: PASS

- [ ] **Step 3: Commit** (по просьбе)

---

### Task 7: Docs — business-logic + roles

**Files:**
- Modify: `docs/business-logic.md`
- Modify: `frontend/docs/roles-and-permissions.md`

- [ ] **Step 1: Update lifecycle list**

Заменить блок статусов:

```markdown
- `NEW` — новая заявка;
- `DISCUSSING` — уже есть хотя бы один диалог;
- `TERMS_AGREED` — согласование условий (опционально);
- `ACTIVE` — в работе (сразу после заключения договора заказчиком);
- `ACCEPTANCE_PENDING` — ожидает принятия результата заказчиком;
- `ACCEPTED` — результат принят;
- `COMPLETED` — завершен;
- `CANCELLED` — заказ отменён;
- `CLOSED` — заявка закрыта без сделки.
```

Заказ / эксклюзивность:

```markdown
- Заказ — фаза заявки начиная с фиксации исполнителя: `lockedAt != null` (+ `providerId`).
- Финальный выбор исполнителя (`select-provider`): ставит `providerId` и `lockedAt`, статус не меняет (`DISCUSSING`/`TERMS_AGREED`); audit event `PROVIDER_SELECTED`.
- После `lockedAt` остальные диалоги — read-only архив.
```

Удалить упоминания статусов `PROVIDER_SELECTED` / `CONTRACT_ACCEPTED` / `SERVICE_RENDERED` / `LOCKED` как текущих статусов заявки. Event names в аудите можно оставить с пояснением.

В `roles-and-permissions.md` обновить список `status`.

- [ ] **Step 2: Commit** (по просьбе)

---

### Task 8: Frontend DTO helpers (TDD)

**Files:**
- Modify: `frontend/entities/request/dto/request.dto.ts`
- Create: `frontend/entities/request/dto/request-lock.test.ts`

**Interfaces:**
- Produces: тот же набор статусов; helpers:

```ts
export function hasRequestLock(row: { lockedAt: string | null | undefined }): boolean;
export function isContractPhase(req: {
  status: RequestStatus;
  lockedAt: string | null | undefined;
}): boolean {
  return hasRequestLock(req) && !isOrderExecutionStatus(req.status);
}
```

Удалить `EXCLUSIVE_PROVIDER_PHASE_STATUSES` / `isExclusiveProviderPhaseStatus` и labels для legacy статусов.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { hasRequestLock, isContractPhase, isOrderExecutionStatus } from "./request.dto";

describe("request lock (frontend)", () => {
  it("contract phase when locked and not execution", () => {
    expect(isContractPhase({ status: "DISCUSSING", lockedAt: "2026-08-06T00:00:00.000Z" })).toBe(true);
    expect(isContractPhase({ status: "DISCUSSING", lockedAt: null })).toBe(false);
    expect(isContractPhase({ status: "ACTIVE", lockedAt: "2026-08-06T00:00:00.000Z" })).toBe(false);
  });

  it("no legacy order statuses", () => {
    expect(isOrderExecutionStatus("CONTRACT_ACCEPTED" as never)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement + run**

```bash
cd frontend && npx vitest run entities/request/dto/request-lock.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit** (по просьбе)

---

### Task 9: Status flow stepper (TDD)

**Files:**
- Modify: `frontend/entities/request/ui/request-status-flow.ts`
- Create or Modify: `frontend/entities/request/ui/request-status-flow.test.ts`

**Interfaces:**
- Consumes: `hasRequestLock`, `isContractPhase`, `isOrderExecutionStatus`, `getRequestStatusLabel`
- Produces:
  - `CustomerRequestStepperInput = Pick<RequestCustomerDto, "status" | "dealTerms" | "lockedAt">`
  - `buildRequestFlowSteps(req: { status; lockedAt })` / обновить сигнатуры: provider side тоже нужен `lockedAt` — изменить на объектный input:
    ```ts
    export type RequestFlowStepperInput = {
      status: RequestStatus;
      lockedAt: string | null;
    };
    export function buildRequestFlowSteps(input: RequestFlowStepperInput): StatusProgressStep[];
    export function getRequestFlowActiveStepId(input: RequestFlowStepperInput): string;
    export function buildCustomerRequestFlowSteps(req: CustomerRequestStepperInput): StatusProgressStep[];
    export function getCustomerRequestFlowActiveStepId(req: CustomerRequestStepperInput): string;
    ```
  - Pre-order ids: `["NEW", "DISCUSSING"]` only; затем order phase `CONTRACT|WORK|ACCEPTANCE|COMPLETED`
  - Active `CONTRACT` when `isContractPhase(input)`

- [ ] **Step 1: Failing tests**

```ts
it("stepper has no PROVIDER_SELECTED step", () => {
  const steps = buildRequestFlowSteps({
    status: "DISCUSSING",
    lockedAt: "2026-08-06T00:00:00.000Z",
  });
  expect(steps.map((s) => s.id)).toEqual([
    "NEW",
    "DISCUSSING",
    "CONTRACT",
    "WORK",
    "ACCEPTANCE",
    "COMPLETED",
  ]);
  expect(getRequestFlowActiveStepId({
    status: "DISCUSSING",
    lockedAt: "2026-08-06T00:00:00.000Z",
  })).toBe("CONTRACT");
});

it("discussing without lock stays on DISCUSSING", () => {
  expect(
    getRequestFlowActiveStepId({ status: "DISCUSSING", lockedAt: null }),
  ).toBe("DISCUSSING");
});
```

- [ ] **Step 2: Implement stepper**

`buildRequestFlowSteps`:

```ts
const preOrderIds = ["NEW", "DISCUSSING"] as const;
const preOrderIndex = isOrderExecutionStatus(status) || isContractPhase(input)
  ? preOrderIds.length
  : status === "TERMS_AGREED" || status === "DISCUSSING"
    ? preOrderIds.indexOf("DISCUSSING")
    : preOrderIds.indexOf("NEW");
// ... map preOrder + orderPhase with CONTRACT completed when past contract phase
```

Обновить call-sites в `request-details-model.ts` (Task 10) под новый объектный input.

- [ ] **Step 3: Run**

```bash
cd frontend && npx vitest run entities/request/ui/request-status-flow.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit** (по просьбе)

---

### Task 10: Request details + customer/pro UI

**Files:**
- Modify: `frontend/widgets/request-details/model/request-details-model.ts`
- Modify: `frontend/widgets/request-details/model/request-details-model.test.ts`
- Modify: `frontend/widgets/request-details/model/request-details-behavior.test.ts`
- Modify: `frontend/widgets/customer-requests/lib/can-accept-contract.ts`
- Modify: `frontend/widgets/customer-requests/lib/can-accept-contract.test.ts`
- Modify: `frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx`
- Modify: `frontend/widgets/customer-requests/ui/CustomerRequestDocumentsSection.tsx`
- Modify: `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx`
- Modify: `frontend/widgets/pro-dashboard/ui/ProOverviewDashboard.tsx` (метрика `LOCKED` → например locked/discussing orders; не читать `status===LOCKED`)
- Modify: `frontend/entities/request/ui/request-ui.tsx` при необходимости
- Modify любые test fixtures с legacy статусами (`request-remarks-behavior.test.ts` и т.п.)

**Interfaces:**
- `resolveStateId`: `CLOSED|CANCELLED|COMPLETED|ACCEPTANCE|WORK` as today; `CONTRACT` when `isContractPhase(req)`; else DISCUSSING/NEW
- `canCustomerAcceptContract`: `hasRequestLock` / `Boolean(lockedAt)` instead of status `PROVIDER_SELECTED`
- Workspace: `isChosenProvider = Boolean(req.lockedAt) && req.providerId === c.providerId`; ветки `req.status === "PROVIDER_SELECTED"` → `Boolean(req.lockedAt)`
- Provider note остаётся на `offerStatus === "SELECTED" && !isOrderExecutionStatus`

- [ ] **Step 1: Update failing tests first**

`can-accept-contract.test.ts`:

```ts
requestStatus: "DISCUSSING",
lockedAt: "2026-08-06T00:00:00.000Z",
// extend canCustomerAcceptContract input:
```

```ts
export function canCustomerAcceptContract(input: {
  requestStatus: RequestCustomerDto["status"];
  lockedAt: RequestCustomerDto["lockedAt"];
  contractBundles: ...;
  documentRequests: ...;
}) {
  const allContractBundlesApproved = ...;
  const allRequestedDocumentsUploaded = ...;
  return (
    Boolean(input.lockedAt) &&
    !isOrderExecutionStatus(input.requestStatus) &&
    allContractBundlesApproved &&
    allRequestedDocumentsUploaded
  );
}
```

`request-details-model.test.ts`: заменить `PROVIDER_SELECTED` / `CONTRACT_ACCEPTED` / `SERVICE_RENDERED` fixtures на `DISCUSSING+lockedAt` / `ACTIVE` / `ACCEPTANCE_PENDING`.

- [ ] **Step 2: Implement UI/model changes; fix call sites of `canCustomerAcceptContract`**

- [ ] **Step 3: Run frontend tests**

```bash
cd frontend && npx vitest run widgets/request-details widgets/customer-requests/lib entities/request
```

Expected: PASS

- [ ] **Step 4: Commit** (по просьбе)

---

### Task 11: Regenerate OpenAPI client + final grep

**Files:**
- Regenerate: `frontend/shared/api/generated/backend/Api.ts`
- Fix any remaining frontend references

- [ ] **Step 1: Ensure backend running with new Swagger, then**

```bash
cd frontend && npm run generate-api
```

Expected: generated enums without removed statuses.

Если backend недоступен — вручную вычистить enum members в `Api.ts` (временный допустимый путь только если generate невозможен; предпочтителен generate).

- [ ] **Step 2: Repo-wide grep**

```bash
rg "PROVIDER_SELECTED|CONTRACT_ACCEPTED|SERVICE_RENDERED" --glob '!**/migrations/**' --glob '!**/Api.ts' -g '!docs/superpowers/**'
```

Допустимы: audit event type strings, design/plan docs, комментарии про audit. Статус заявки / stepper label «Исполнитель выбран» — нет.

- [ ] **Step 3: Full verification**

```bash
cd backend && npm run test:unit
cd frontend && npx vitest run
```

Expected: PASS (или зафиксировать и починить падения, связанные с этим изменением)

- [ ] **Step 4: Commit** (по просьбе)

```bash
git commit -m "feat(requests): фаза договора через lockedAt, без PROVIDER_SELECTED и legacy-статусов"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| select не ставит PROVIDER_SELECTED; `providerId`+`lockedAt` | 3 |
| exclusivity/chat by `lockedAt` | 1, 3, 4, 5 |
| stepper Discussion → Contract | 9, 10 |
| accept contract via lock | 3, 10 |
| remove PROVIDER_SELECTED, CONTRACT_ACCEPTED, SERVICE_RENDERED, LOCKED from enum/API/code | 1, 2, 6, 8, 11 |
| keep audit event types | 3 (explicit) |
| docs/business-logic | 7 |
| SERVICE `providerId` without lock | 1 tests + helpers |
| migration data | 2 |

No TBD/placeholder steps. Helper names consistent: `hasRequestLock`, `isLockedToOtherProvider`, `isExclusiveForActorProvider`, `isContractPhase`.
