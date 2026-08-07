# «Детали» = только линия прогресса — Design

Дата: 2026-08-07  
Статус: approved

## Цель

Упростить блок «Детали» на страницах заявки (customer и provider): оставить только линию прогресса (stepper/list). Lifecycle-кнопки и сопутствующую мету перенести под описание заявки.

## Контекст

Сейчас `RequestDetails` внутри `RequestDetailHeaderCard` рендерит:

- заголовок «Детали» + toggle list/stepper;
- stepper / list;
- `lockedAlert`, `note`, `infoRows` (локация, «Диалогов»), `autoAcceptAtLabel`;
- lifecycle-кнопки (`Услуга выполнена`, `Заключить договор`, `Принять результат`, `Завершить`, `Отказаться от заявки` и т.п.);
- опциональный `bottomSlot`.

Кнопки меняются по статусу заявки и стороне (customer/provider). На скрине в состоянии «В работе» под stepper видны «Диалогов: N» и «Услуга выполнена» — это визуальный шум относительно линии прогресса.

Порядок секций ниже шапки не меняем: Прогресс → Замечания → Документы → …

## Решения (согласовано)

| Вопрос | Решение |
|--------|---------|
| Что остаётся в «Детали» | Только progress UI: заголовок, toggle, stepper/list, `muted` |
| Куда уходят кнопки | Отдельный блок после описания заявки (`body`) |
| Куда уходят meta/note/alert/autoAccept | Вместе с кнопками в тот же блок |
| Нет описания (`body == null`) | Lifecycle-блок сразу после stepper |
| Пустой lifecycle (нет actions/meta/alert) | Блок не рендерим |
| Заголовок у lifecycle-блока | Нет отдельного заголовка |
| Стороны | Customer и provider одинаковый layout |
| Backend / домен / action ids | Без изменений |
| Архитектура | Approach A: два виджета + слот `afterBody` в header card |

## Layout

Порядок внутри `RequestDetailHeaderCard`:

1. Заголовок заявки + подпись + chip статуса  
2. **Детали** — только линия прогресса  
3. Описание заявки (`body`), если есть  
4. **Lifecycle-блок** — alert / note / infoRows / autoAccept / кнопки  
5. Вне шапки — без изменений: Прогресс → Замечания → Документы → …

Fallback без `body`: пункты 2 → 4 подряд (stepper, затем lifecycle).

## Компоненты

### `RequestDetails` (упрощение)

Ответственность: только progress UI.

- Рендерит: заголовок «Детали», `StatusProgressViewToggle`, stepper или list, учёт `muted`.
- Не рендерит: actions, infoRows, note, lockedAlert, autoAcceptAtLabel, bottomSlot.

### `RequestLifecycleActions` (новый widget-slice)

Путь: `frontend/widgets/request-lifecycle-actions/`.

Ответственность: lifecycle CTA и сопутствующая мета.

Содержимое (сверху вниз, как сейчас в Details):

1. `lockedAlert` (если есть)  
2. `note` (если есть)  
3. `autoAcceptAtLabel` (если есть)  
4. `infoRows` (локация, «Диалогов» и т.п.)  
5. `actions` — кнопки в ряд (`flexWrap`)

Без отдельного заголовка секции. Если нечего показывать — `null`.

Паттерн: Strategy/Behavior (как у `RequestDetails` / `RequestRemarks`):

- `createCustomerRequestLifecycleBehavior`
- `createProviderRequestLifecycleBehavior`
- `getViewModel()` + `run({ id })`

### `RequestDetailHeaderCard`

Новый слот:

```ts
afterBody?: ReactNode;
```

Порядок слотов:

```
header → details → body? → afterBody?
```

Screen-контейнеры передают:

- `details={<RequestDetails ... />}`
- `afterBody={<RequestLifecycleActions ... />}`

## Data flow

- Screen-контейнеры (`ProRequestDetails`, `CustomerRequestConversationWorkspace`) владеют fetch/mutations/confirm и передают callbacks — как сейчас.
- Split view-model:
  - Details behavior → `{ steps, activeStepId, muted }`
  - Lifecycle behavior → `{ lockedAlert, note, infoRows, autoAcceptAtLabel, actions }` + `run`
- Набор `RequestDetailsActionId` **не меняем** (`markRendered`, `acceptResult`, `openOfferDialog`, `complete`, `declineOffer`, `startWork`, `requestAcceptance`).
- `isMarkRenderedDisabled` (открытые замечания) остаётся на lifecycle-блоке и disable'ит `markRendered`.
- Логику «какие кнопки/мета для статуса» переносим из текущего `buildRequestDetailsViewModel` в lifecycle model (или разделяем билдер на два чистых билдера без дублирования правил статуса). Предпочтительно: общий `resolveStateId` + два билдера (`buildProgressVm`, `buildLifecycleVm`).

## Вне scope

- Изменение бизнес-правил статусов и доступности кнопок.
- Backend API, DTO, Prisma.
- Редизайн самого stepper / list.
- Переименование или удаление infoRows («Диалогов», локация) — остаются, только переезжают.
- Sticky/fixed CTA bar.

## Тесты

- Существующие тесты на actions/meta/alert/`autoAcceptAtLabel` переносятся на lifecycle model.
- Для `RequestDetails` / progress VM остаются проверки `steps` / `activeStepId` / `muted`.
- Behavior-тесты: customer/provider `run` для тех же action ids, но через lifecycle factories.
- UI smoke не обязателен в MVP; достаточно model + behavior unit-тестов.

## Критерии готовности

- [ ] «Детали» визуально = только линия прогресса (+ заголовок и toggle).
- [ ] Lifecycle-кнопки и мета под описанием; без описания — сразу под stepper.
- [ ] Пустой lifecycle не занимает место.
- [ ] Customer и pro страницы ведут себя одинаково по layout.
- [ ] Action ids и confirm-флоу не сломаны.
- [ ] Unit-тесты зелёные.
