# Request Remarks Block — Design

Дата: 2026-08-06  
Статус: draft (ожидает review)

## Цель

Вынести блок «Замечания» из «Детали» в отдельный общий UI-блок на страницах заявки customer и pro.

## Контекст

Сейчас UI замечаний вложен в `widgets/request-details/ui/RequestDetails.tsx` (nested `Paper`). Логика показа и действий живёт в `request-details-behavior.ts`. Блок используется и на customer (`CustomerRequestConversationWorkspace`), и на pro (`ProRequestDetails`).

## Решения (согласовано)

| Вопрос | Решение |
|--------|---------|
| Компоновка | Отдельный sibling-блок, не внутри «Детали» |
| Порядок | Детали → Замечания → Документы |
| Кнопка «Отправить замечания» | В блоке «Замечания» |
| Архитектура | Новый widget-slice `request-remarks` |

## Архитектура

Новый slice:

```
frontend/widgets/request-remarks/
  ui/RequestRemarks.tsx
  model/request-remarks-behavior.ts
  model/request-remarks-behavior.test.ts
  index.ts
```

### Публичный API

- `RequestRemarks` — UI-компонент секции
- `createCustomerRequestRemarksBehavior`
- `createProviderRequestRemarksBehavior`
- типы view-model / behavior

### Изменения в `request-details`

- Удалить remarks UI из `RequestDetails`
- Убрать `remarksSection` и remark/sendRemarks actions из details behavior
- В customer acceptance actions «Детали» оставить только «Принять результат» (`sendRemarks` убрать из `request-details-model`)
- Из inputs behavior убрать `remarks` и remark-related callbacks

### Композиция экранов

Customer и pro:

1. `RequestDetails`
2. `RequestRemarks` (если `showRemarks === true`)
3. Документы / остальные секции

## UI

`RequestRemarks` — отдельный `Paper variant="outlined"` уровня секции (как «Детали»), не nested-карточка.

Содержимое:

- заголовок «Замечания»
- кнопка «Добавить» при `canAdd`
- форма добавления (текущее поведение: min 3 символа, busy)
- список замечаний или «Пока нет замечаний.»
- customer + `ACCEPTANCE_PENDING`: кнопка «Отправить замечания» внизу блока  
  (`disabled`, пока нет OPEN-замечаний автора `CUSTOMER`)

Визуал списка/checkbox/highlight входящих — без изменений смысла.

## Правила показа и прав (без изменения продукта)

Показывать секцию, если:

- статус `ACCEPTANCE_PENDING`, или
- есть хотя бы одно замечание

Права:

| | Customer | Provider |
|---|---|---|
| `canAdd` | `ACCEPTANCE_PENDING` | `ACCEPTANCE_PENDING` |
| `canComplete` OPEN чужой стороны | на `ACTIVE` для remarks от PROVIDER | на `ACTIVE` для remarks от CUSTOMER |
| `sendRemarks` | customer, `ACCEPTANCE_PENDING` | нет |

`highlightAsIncoming` — замечания противоположной стороны.

## Data flow

- Fetch/mutations остаются в screen-контейнерах через существующие BFF-роуты и `entities/request/api/request-remarks`
- Новый behavior только мапит DTO → view-model и диспатчит callback'и экрана
- Entity API и backend/BFF **не меняются**

Паттерн: Strategy/Behavior (как у `RequestDetails`) — разные правила сторон при общем UI.

## Ошибки и loading

- Экранные `busy` / `error` / `notice` / `remarksError` — без изменений места
- Локальный `remarksBusy` — внутри `RequestRemarks`

## Тесты

- Перенести remarks-кейсы из `request-details-behavior.test.ts` в `request-remarks-behavior.test.ts`
- В details-тестах: на `ACCEPTANCE_PENDING` у customer actions = `["acceptResult"]` (без `sendRemarks`)
- Покрыть: show/hide, `canAdd`/`canComplete`, disable `sendRemarks`, highlight

## Вне scope

- Изменения backend / Prisma / OpenAPI
- Новые API endpoints
- Редизайн замечаний сверх выноса в отдельный блок
- Перенос fetch remarks в React Query (можно позже)

## Definition of done

- [ ] Есть `widgets/request-remarks` с публичным API
- [ ] «Замечания» не рендерятся внутри «Детали»
- [ ] Порядок: Детали → Замечания → Документы на customer и pro
- [ ] «Отправить замечания» только в блоке «Замечания»
- [ ] Поведение show/add/complete/send без регрессий
- [ ] Юнит-тесты обновлены и проходят
