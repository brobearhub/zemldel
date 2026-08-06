# Decline Offer Reason + Revision Comment Visibility — Design

Дата: 2026-08-06  
Статус: draft (ожидает review)

## Цель

1. Сделать комментарий заказчика при статусе договора «На доработку» заметнее в списке файлов.
2. Переименовать отказ исполнителя и требовать причину; публиковать её в чат сообщением от исполнителя.

## Контекст

- Комментарий revision рендерится в `frontend/entities/request/ui/ContractFilesList.tsx` как серый `body2` (`text.secondary`) — слабо читается рядом с именем файла и badge «На доработку».
- Отказ исполнителя: кнопка «Отказать» в `request-details-model`, confirm без поля ввода в `ProRequestDetails`, API `POST /pro/requests/:id/decline-offer` без body, сообщение в чат не создаётся.

## Решения (согласовано)

| Вопрос | Решение |
|--------|---------|
| Заметность комментария | Крупнее/контрастнее текст (`body1`, `text.primary`, `fontWeight={600}`), без фона/рамки |
| Текст кнопки | «Отказаться от заявки» |
| Причина | Обязательна (пустой `trim` — нельзя подтвердить / `400` на бэке) |
| Где ввод причины | Confirm-модалка с TextField |
| Кнопка confirm в модалке | «Да, отказаться» |
| Создание сообщения в чат | Атомарно на бэкенде в том же decline-flow |
| Нет conversation | Decline проходит, сообщение не создаётся (conversation не создаём) |
| Шаблон сообщения | `Исполнитель отказался от выполнения заявки по причине: "Текст причины"` |

## UI

### Revision comment

В `ContractFilesList` для блока  
`REVISION_REQUESTED && revisionMessage`:

- было: `Typography variant="body2" color="text.secondary"`
- станет: `variant="body1"`, `color="text.primary"`, `fontWeight={600}`

Метка (`revisionLabel`, на pro — «Комментарий клиента») без изменений смысла.

### Decline modal / button

- Action label в details: «Отказаться от заявки».
- Title: «Отказаться от заявки?»
- Description: текущий текст последствий + обязательное поле «Причина».
- Confirm disabled, пока `reason.trim()` пуст.
- Confirm text: «Да, отказаться».

## API и данные

### Контракт

`POST /pro/requests/:id/decline-offer`

Body:

```json
{ "reason": "string" }
```

- `reason` обязателен; после `trim` не пустой → иначе `400`.
- DTO: `DeclineOfferDto` (`class-validator`).

### Серверная логика

В `declineOfferByProvider` (одна транзакция с текущим decline):

1. Валидировать `reason`.
2. Оффер → `DECLINED` (+ откат заявки из `PROVIDER_SELECTED` в `DISCUSSING` как сейчас).
3. Найти `conversation` по `(requestId, providerId)`.
4. Если есть — создать `message` от исполнителя (`senderUserId` = actor user провайдера) с телом по шаблону выше (кавычки вокруг текста причины сохраняются).
5. Обновить `conversation.lastMessageAt`.
6. В event `PROVIDER_DECLINED_AFTER_SELECTION` добавить `reason` в payload.
7. После commit — по возможности emit `message.created` / unread hints по существующим паттернам чата; минимум — запись в БД (чат подтянет при следующем fetch).

Сигнатура сервиса расширяется: нужны `reason` и `actorUserId` (из `requireProviderContext`).

### BFF

`frontend/app/api/pro/requests/[id]/decline-offer/route.ts` — прокинуть JSON body на бэкенд.

## Фронтенд-архитектура

### Confirm API

Расширить `useConfirm` / `ConfirmProvider` опциональным режимом с текстовым полем:

- обычный confirm: `Promise<boolean>` (без регрессий для текущих вызовов);
- confirm с причиной: возвращает `string | null` (текст или отмена), либо отдельный helper `confirmWithReason`.

Паттерн: минимальное расширение shared confirm, без отдельного одноразового модала в widget (подход «не дублировать Dialog»).

### Wiring

- `request-details-model.ts` — новый label.
- `ProRequestDetails.tsx` — collect reason → `POST` с body → refresh/notice.
- Стили revision — только `ContractFilesList` (используется customer/pro).

## Документация

Обновить `docs/business-logic.md`: кнопка «Отказаться от заявки», обязательная причина, сообщение в чат по шаблону.

## Тесты

| Слой | Что проверить |
|------|----------------|
| Backend | пустой reason → 400 |
| Backend | с reason → DECLINED + message с точным шаблоном |
| Backend | нет conversation → decline ok, message нет |
| Frontend model | label «Отказаться от заявки» |
| Confirm (по возможности) | confirm disabled / не резолвится с пустой причиной |

## Вне скоупа

- Создание conversation «на лету» при отсутствии диалога.
- Изменение других decline/cancel flows, не связанных с `decline-offer`.
- Визуальные alert/фон для revision comment.

## Критерии готовности

- [ ] Комментарий «На доработку» визуально контрастнее имени файла не теряется.
- [ ] Кнопка называется «Отказаться от заявки».
- [ ] Без причины отказ невозможен (UI + API).
- [ ] В чате появляется сообщение исполнителя по согласованному шаблону (если conversation существует).
- [ ] `business-logic.md` обновлён.
- [ ] Тесты выше зелёные.
