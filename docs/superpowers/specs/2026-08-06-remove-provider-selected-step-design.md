# Remove PROVIDER_SELECTED step & legacy request statuses — Design

Дата: 2026-08-06  
Статус: draft (ожидает review)

## Цель

Убрать шаг «Исполнитель выбран» из жизненного цикла заявки. Степпер: **Новая → Обсуждение → Договор → …**.  
Эксклюзивность сделки и UX для «чужих» провайдеров («исполнитель выбран» / архив чата) **не ломаются**.

Параллельно: **полностью удалить** legacy/deprecated статусы заявки — без шимов и без «оставить в enum как deprecated».

## Контекст

Сейчас `PROVIDER_SELECTED` одновременно:

1. доменный статус после финального выбора исполнителя;
2. отдельный шаг в UI-степпере («Исполнитель выбран»);
3. условие эксклюзивности (`isExclusiveProviderStatus` / `isLockedStatus`).

При этом фаза «Договор» в степпере уже активна на `PROVIDER_SELECTED` — получается дубль: шаг 3 completed + шаг 4 current.

Legacy-статусы (пишутся только миграциями/чтением старых строк, новые переходы их не создают):

| Статус | Сейчас |
|--------|--------|
| `PROVIDER_SELECTED` | активный статус фазы договора |
| `CONTRACT_ACCEPTED` | legacy; новые акцепты → сразу `ACTIVE` |
| `SERVICE_RENDERED` | legacy; при чтении продвигается в `ACCEPTANCE_PENDING` |
| `LOCKED` | исторический, в workflow не используется |

## Решения (согласовано)

| Вопрос | Решение |
|--------|---------|
| Убрать только UI или из домена? | Из домена полностью |
| Что после выбора исполнителя? | Статус **не меняем** (`DISCUSSING` / `TERMS_AGREED`); ставим `providerId` + `lockedAt` |
| Сигнал эксклюзивности | `lockedAt != null` (+ `providerId` для сравнения с актором) |
| Legacy-статусы | Удалить из enum/API/кода; данные мигрировать |
| Audit event `PROVIDER_SELECTED` | Оставить как тип события аудита (история выбора) |
| Audit events `CONTRACT_ACCEPTED` / `SERVICE_RENDERED` | Оставить как типы событий (не статусы заявки) |

## Целевой жизненный цикл статусов

```
NEW → DISCUSSING → TERMS_AGREED? → (lockedAt) → ACTIVE → ACCEPTANCE_PENDING → ACCEPTED → COMPLETED
                                                                                         ↘ CANCELLED
CLOSED (без сделки)
```

`TERMS_AGREED` остаётся опциональным статусом согласования условий (как сейчас).

После `select-provider`:

- `providerId` = выбранный исполнитель;
- `lockedAt` = now (если ещё не был);
- offers: выбранный `SELECTED`, остальные `DECLINED`;
- `status` без изменения (`DISCUSSING` или `TERMS_AGREED`);
- audit: `PROVIDER_SELECTED`.

Фаза «заказ / договор» = `lockedAt != null` и статус ещё не execution (`ACTIVE` и далее).

Акцепт договора: требует `providerId` + `lockedAt` (не статус). Результат — сразу `ACTIVE`.

## Эксклюзивность и чат (инварианты)

Не меняем продуктовое поведение, меняем критерий:

**Было:** `isExclusiveProviderStatus(status) && providerId && providerId !== actor`  
**Стало:** `lockedAt != null && providerId && providerId !== actor`

Это покрывает:

- write в чужие треды запрещён; read-only архив для провайдеров с существующим диалогом;
- customer не ходит в чужие треды после lock;
- `RequestProDto.isLocked` и алерт «Заказ уже оформлен другим провайдером»;
- declined/невыбранные провайдеры видят, что исполнитель выбран (через `isLocked` / `offerStatus=DECLINED`).

Выбранному исполнителю до `ACTIVE`: note «Клиент выбрал вас исполнителем. Подготовьте и отправьте договор.»  
Условие: `offerStatus === SELECTED && lockedAt != null && !isOrderExecutionStatus(status)`.

## UI-степпер

Единый поток шагов:

1. `NEW` — Новая  
2. `DISCUSSING` — Обсуждение (`TERMS_AGREED` визуально на этом шаге)  
3. `CONTRACT` — Договор (`lockedAt != null`, ещё не `ACTIVE`+)  
4. `WORK` — В работе  
5. `ACCEPTANCE` — Принятие  
6. `COMPLETED` — Завершен  

Шага `PROVIDER_SELECTED` / «Исполнитель выбран» **нет** ни у customer, ни у provider.

Active step:

- нет `lockedAt`, статус NEW → `NEW`;
- нет `lockedAt`, DISCUSSING/TERMS_AGREED → `DISCUSSING`;
- есть `lockedAt`, не execution → `CONTRACT`;
- иначе — как сейчас для WORK / ACCEPTANCE / COMPLETED / CANCELLED / CLOSED.

## Миграция данных

Одна Prisma-миграция (data + enum):

1. `PROVIDER_SELECTED` → `DISCUSSING` (если `lockedAt` null — проставить `lockedAt = coalesce(lockedAt, updatedAt)` и убедиться что `providerId` есть).
2. `CONTRACT_ACCEPTED` → `ACTIVE`.
3. `SERVICE_RENDERED` → `ACCEPTANCE_PENDING` (как текущий promote: выставить `acceptanceRequestedAt` / `autoAcceptAt` при необходимости по тем же правилам, что `promoteServiceRenderedIfNeeded`).
4. `LOCKED` → если есть строки: `ACTIVE` при `providerId` иначе `DISCUSSING` (или `CLOSED` — зафиксировать по факту данных в миграции; ожидаемо 0 строк).
5. Удалить значения из Postgres enum `RequestStatus` / Prisma enum.

Код promote/`startWork` legacy-веток удалить — они больше не нужны.

## Контракты и код (scope)

### Backend

- Prisma `RequestStatus`: только актуальные значения.
- `selectProviderByCustomer`: не пишет статус `PROVIDER_SELECTED`.
- `acceptContractByCustomer`: gate по `providerId` + `lockedAt`.
- `isExclusiveProviderStatus` → заменить на helper вроде `isRequestLockedToProvider(row)` / `hasLockedProvider(row)` на базе `lockedAt`.
- Chat `isLockedStatus` → lock по `lockedAt`.
- DTO/OpenAPI: убрать статусы из union/enum.
- Удалить ветки чтения/промоута `CONTRACT_ACCEPTED` / `SERVICE_RENDERED` / `PROVIDER_SELECTED`.
- Тесты и smoke обновить.

### Frontend

- `entities/request` DTO + labels: убрать статусы.
- `request-status-flow.ts`: степпер без `PROVIDER_SELECTED`; CONTRACT по `lockedAt` (customer steps уже принимают `dealTerms` — расширить input на `lockedAt` / `providerId` где нужно).
- `request-details-model`: state `CONTRACT` по `lockedAt`.
- `can-accept-contract`, documents sections, conversation workspace: условия от `lockedAt`, не от статуса.
- Сгенерированный API-клиент — перегенерировать после бэкенда.
- Тесты обновить.

### Docs

- `docs/business-logic.md` — source of truth: жизненный цикл, заказ = фаза с `lockedAt`, без legacy-статусов.
- `frontend/docs/roles-and-permissions.md` — список статусов.

## Вне scope

- Удаление legacy-поля `offerVersion` на заявке (отдельная задача, если понадобится).
- Переименование audit event types.
- Изменение момента lock (остаётся на `select-provider`, не на акцепте договора).

## Риски

| Риск | Митигация |
|------|-----------|
| SERVICE-заявки имеют `providerId` с создания, но без `lockedAt` | Lock только по `lockedAt`, не по голому `providerId` |
| Postgres ALTER ENUM | Сначала data UPDATE, потом recreate enum / `ALTER TYPE ... DROP VALUE` по принятому в репо способу |
| Фронт завязан на статус в многих местах | Единый helper «фаза договора / locked»; прогнать unit-тесты flow/details |

## Definition of done

- [ ] Степпер: Обсуждение → Договор, без «Исполнитель выбран»
- [ ] Выбор исполнителя не меняет status на удалённый enum; ставит `lockedAt`/`providerId`
- [ ] Чужие провайдеры: read-only чат + UI что исполнитель/заказ у другого
- [ ] Акцепт договора работает от `lockedAt`
- [ ] В enum/API/коде нет `PROVIDER_SELECTED`, `CONTRACT_ACCEPTED`, `SERVICE_RENDERED`, `LOCKED` как статусов заявки
- [ ] `docs/business-logic.md` обновлён
- [ ] Тесты backend/frontend зелёные
