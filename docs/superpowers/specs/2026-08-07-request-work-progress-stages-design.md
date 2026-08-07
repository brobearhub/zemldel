# Ход выполнения работ (этапы заявки) — Design

Дата: 2026-08-07  
Статус: draft

## Цель

Показать заказчику и исполнителю ход выполнения работ по заявке после старта сделки (`ACTIVE`):

- исполнитель создаёт этапы (title, описание, статус), публикует их, меняет статус, прикладывает файлы и запрашивает документы у клиента через слоты;
- заказчик видит только опубликованные этапы и загружает файлы в запрошенные слоты.

Экраны: `/pro/requests/{id}`, `/profile/requests/{id}`. Блок размещается **сразу под блоком «Детали»**.

## Контекст

- В домене нет сущности этапов работ; ближайшие аналоги — `RequestDocumentRequest` (запрос документов до акцепта договора) и `RequestContractFile`.
- `ProviderUserSettings.proInboxFilters` хранит личные UI-фильтры инбокса по `(userId, providerId)` — не справочник статусов этапов.
- Бизнес-логика (`docs/business-logic.md`) должна быть дополнена разделом про этапы работ после утверждения этой спеки.

## Решения (согласовано)

| Вопрос | Решение |
|--------|---------|
| Модель статуса этапа | Фиксированный набор системных статусов + кастомные статусы исполнителя; отдельно свободные `title` и `description` |
| Кастомные статусы | Личные для активного пользователя в контексте provider (`ProviderUserSettings`); shared на весь provider — вне MVP |
| Хранение кастомных статусов | Новое поле `workStageStatuses Json?` в `ProviderUserSettings`; `proInboxFilters` не переименовываем |
| Когда доступен блок | Мутации при `Request.status = ACTIVE`; в `ACCEPTANCE_PENDING` — read-only |
| Запрос файлов у клиента | Слоты документов на этапе (как `RequestDocumentRequest`: название → upload клиентом) |
| Жизненный цикл этапа | `DRAFT` → `PUBLISHED`; после публикации `title`/`description` immutable |
| Смена статуса | Можно всегда (в т.ч. после публикации), без обязательного комментария и без истории |
| Слоты и файлы исполнителя | Можно добавлять и после публикации |
| Видимость draft для клиента | Клиент draft не видит (в API customer — только `PUBLISHED`) |
| Архитектура | Нормализованные таблицы + файлы по существующему storage-паттерну |
| UI placement | Под блоком «Детали» на pro и customer request detail |
| Настройки | Пункт «Настройки» в pro sidebar — CRUD кастомных статусов |

## Системные статусы

Константы в коде (ключ → label). В dropdown всегда первыми, не редактируются в настройках:

| key | label |
|-----|--------|
| `INITIAL_CONSULTATION` | Первичная консультация |
| `DOC_COLLECTION` | Сбор документов |
| `DOC_PREPARATION` | Подготовка документов |
| `SUBMITTED_TO_AUTHORITY` | Подано в орган |
| `AWAITING_RESPONSE` | Ожидание ответа |
| `REVISION` | Доработка |
| `ACCEPTANCE_CERTIFICATE_PREP` | Подготовка акта приёма-передачи |
| `SERVICE_ACT_PREP` | Подготовка акта об оказании услуг |
| `COMPLETED` | Завершено |
| `SUSPENDED` | Приостановлено |
| `LEASE_AGREEMENT_PREP` | Подготовка договора аренды |

Кастомные: массив в `workStageStatuses`: `{ key: string, label: string }[]`.  
`statusKey` на этапе — системный ключ **или** ключ из списка текущего user+provider.

**Резолв label:** при создании/смене статуса на этапе сохраняем денормализованный `statusLabel` (snapshot на момент выбора). Dropdown и настройки живут по `statusKey`; UI и customer API показывают `statusLabel`. Так этап читаем, даже если кастомный статус удалили из settings другого member или список личный.

## Доменная модель

### `RequestWorkStage`

- `id`, `requestId`, `providerId`
- `title`, `description`
- `statusKey` (string)
- `statusLabel` (string, snapshot label на момент установки статуса)
- `lifecycle`: `DRAFT | PUBLISHED`
- `publishedAt` (nullable)
- `sortOrder`
- `createdAt`, `updatedAt`

Правила:

- создать можно только когда заявка `ACTIVE` и actor — member активного provider = `request.providerId`;
- до `PUBLISHED`: можно менять `title`, `description`, `statusKey`, `sortOrder`;
- `publish`: только из `DRAFT`; выставляет `PUBLISHED` + `publishedAt`;
- после `PUBLISHED`: нельзя менять `title`/`description`; `statusKey` менять можно;
- удаление в MVP: только `DRAFT` без файлов исполнителя и без слотов с `UPLOADED` (иначе 400);
- published в MVP не удаляем.

### `RequestWorkStageFile`

Вложения исполнителя к этапу.

- метаданные файла + `storageRelPath` (паттерн как у document-requests / contract files);
- MIME: pdf, doc/docx, jpeg/png/webp;
- лимиты размера — как у существующих document-requests;
- добавлять можно в `ACTIVE` на draft и published этапах;
- customer может скачивать файлы опубликованных этапов.

### `RequestWorkStageDocSlot`

Слот «запросить документ у клиента».

- `stageId`, `title`
- `status`: `REQUESTED | UPLOADED`
- поля файла nullable до upload (`originalName`, `mimeType`, `sizeBytes`, `sha256`, `storageRelPath`, `uploadedByUserId`, `uploadedAt`)
- исполнитель создаёт/удаляет слот: delete только если `REQUESTED`;
- клиент upload только в `REQUESTED` при заявке `ACTIVE` и этапе `PUBLISHED`;
- после upload статус → `UPLOADED`; перезагрузка в MVP не требуется (можно добавить позже).

### Кастомные статусы

`ProviderUserSettings.workStageStatuses Json?`

- scope: `(userId, providerId)` — личный список в кабинете активного provider;
- UI: pro sidebar → «Настройки»;
- переименование/удаление в settings влияет только на dropdown будущего выбора;
- уже проставленные на этапах `statusKey`/`statusLabel` не переписываются и не каскадятся (этапы продолжают показывать snapshot `statusLabel`).

## API

Мутации provider/customer upload — только `Request.status = ACTIVE`.  
GET этапов: provider — в `ACTIVE` и `ACCEPTANCE_PENDING`; customer — published в тех же статусах заявки (и при необходимости в более поздних read-only фазах сделки, если страница заявки ещё открыта).  
`providerId` / ownership — только с сервера.

### Provider

База: `/pro/requests/{requestId}/work-stages`

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/` | Все этапы (draft + published) + файлы + слоты |
| POST | `/` | Создать draft (`title`, `description`, `statusKey`) |
| PATCH | `/{stageId}` | Правки draft: title/description/statusKey/sortOrder |
| POST | `/{stageId}/publish` | Draft → published |
| PATCH | `/{stageId}/status` | Смена `statusKey` (draft и published) |
| DELETE | `/{stageId}` | Удалить draft (с ограничениями выше) |
| POST | `/{stageId}/files` | Upload файла исполнителя |
| DELETE | `/{stageId}/files/{fileId}` | Удалить файл исполнителя |
| GET | `/{stageId}/files/{fileId}/download` | Скачать |
| POST | `/{stageId}/doc-slots` | Создать слот (`title`) |
| DELETE | `/{stageId}/doc-slots/{slotId}` | Удалить слот если `REQUESTED` |
| GET | `.../doc-slots/{slotId}/download` | Скачать файл слота |

Настройки статусов (отдельно):

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/pro/settings/work-stage-statuses` | Системные + кастомные |
| PUT | `/pro/settings/work-stage-statuses` | Заменить список кастомных |

### Customer

База: `/requests/{requestId}/work-stages`

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/` | Только `PUBLISHED` + файлы + слоты |
| POST | `/{stageId}/doc-slots/{slotId}/upload` | Загрузка в слот |
| GET | `/{stageId}/files/{fileId}/download` | Файл исполнителя |
| GET | `/{stageId}/doc-slots/{slotId}/download` | Файл слота |

### BFF

Клиент вызывает только `/api/...`; route handlers проксируют на backend с auth, timeout, correlation id.

## UI

### Исполнитель — `/pro/requests/{id}`

Блок «Ход выполнения работ» под «Детали»:

- список этапов; у draft — бейдж «Черновик»;
- «Добавить этап» → title, описание, статус (dropdown: системные + кастомные);
- карточка: смена статуса; до publish — edit title/description + «Опубликовать»; после — title/description read-only;
- «Прикрепить файл»; «Запросить документ» (слот);
- слоты: `REQUESTED` / `UPLOADED`.

### Клиент — `/profile/requests/{id}`

Тот же блок под «Детали», только published:

- статус, title, описание, файлы исполнителя (download);
- слоты: upload если `REQUESTED`, download если `UPLOADED`.

### Настройки

Pro sidebar → «Настройки»: управление кастомными статусами (add / rename / delete с проверкой использования).

### Пустые состояния

- Provider, нет этапов: короткий текст + CTA «Добавить этап».
- Customer, нет published: «Исполнитель пока не опубликовал этапы».

## Слои frontend (FSD)

- UI: виджет блока этапов (pro/customer варианты или общий + mode) под «Детали» в существующих request detail контейнерах.
- Data layer: hooks/API modules для work-stages и settings.
- Transport: `app/api/**` BFF only.
- Без прямых вызовов backend из client components.

## Тестирование

- Backend unit/integration: publish immutability title/description; status change after publish; customer list hides drafts; slot upload ACL; delete draft rules; `statusLabel` snapshot; mutations forbidden outside `ACTIVE`.
- Frontend: model/helpers для visibility и labels статусов; smoke UI по возможности в существующих test-паттернах.

## Вне MVP

- история смен статуса и обязательный комментарий;
- shared-статусы на весь provider;
- переименование `proInboxFilters` → общий `settings`;
- влияние этапов на переходы заявки (`ACCEPTANCE_PENDING` и т.п.);
- удаление published этапов;
- перезагрузка файла в слот после `UPLOADED`.

## Обновление source of truth

После утверждения спеки — добавить в `docs/business-logic.md` раздел «Ход выполнения работ (этапы)» с сущностями и правилами доступа из этого документа.
