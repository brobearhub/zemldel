# Роли и права доступа (RBAC/ABAC) — `new-gorisons`

Этот документ описывает **как у нас устроены роли и права** на Next.js + NextAuth + Prisma, и где именно их менять.

## Термины и ключевая идея

У нас 2 уровня доступа:

- **Системные роли (глобальные)** — то, что относится ко всей платформе
- **Роли внутри provider-профиля** — доступ к данным конкретного поставщика услуг

**Гость (неавторизованный)** — это отсутствие сессии. Его в БД не храним.

## Роли, которые поддерживаем

### 1) Системный уровень (`User.systemRole`)

- **`PLATFORM_ADMIN`**: администратор платформы, может всё
- **`CUSTOMER`**: обычный пользователь (покупатель/потребитель)

Источник истины: `prisma/schema.prisma` → enum `SystemRole`.

### 2) Уровень provider-профиля

Продавец/исполнитель — это **provider** (`Provider`), а пользователи получают права через **членство** (`ProviderMember`):

- **`OWNER`**: владелец provider-профиля
- **`MANAGER`**: менеджер provider-профиля

Источник истины: `prisma/schema.prisma` → `Provider`, `ProviderMember`, enum `ProviderMemberRole`.

## Модель данных (Prisma)

Файл: `prisma/schema.prisma`

Основные сущности:

- **`User`**
  - `systemRole`: `PLATFORM_ADMIN | CUSTOMER`
  - `activeProviderId`: выбранный активный provider (контекст кабинета)
  - связи:
    - `providerMemberships`: список memberships
- **`Provider`**
  - `type`: `SELF_EMPLOYED | COMPANY`
  - `slug`: уникальный идентификатор
  - `ownerUserId`: опционально (быстрый доступ к владельцу)
- **`ProviderMember`**
  - `role`: `OWNER | MANAGER`
  - `status`: `INVITED | ACTIVE | SUSPENDED`
  - уникальность: один user не может быть дважды в одном provider (`@@unique([providerId, userId])`)
- **`Service`**
  - `providerId`: владелец услуги (критично для ограничения доступа)
  - `status`: `DRAFT | PUBLISHED | ARCHIVED`
  - `createdByUserId` / `updatedByUserId`: аудит
- **`ServiceRequest`**
  - единая сущность для “заявок/объявлений/заказов”
  - `status`: `NEW | DISCUSSING | LOCKED | ACTIVE | COMPLETED | CANCELLED | CLOSED`
  - `providerId`: назначенный провайдер (заполняется при взятии в работу или сразу для заявки по услуге)
  - `serviceId` / `categoryId`: привязка к услуге или категории (опционально)
  - `requestCityId`: город заявки (если не задан — берём `User.customerCityId`), матчинг в ленте идёт по региону/области
  - `customerUserId`: заказчик (для чата обязателен)

- **`Conversation`** (чат)
  - единственная связь: `serviceRequestId`
  - уникальность треда: `@@unique([serviceRequestId, providerId])`

## Где живёт авторизация (права)

### Permission engine

Мы используем **CASL** (`@casl/ability`).

Файлы:

- `core/auth/authorization.ts`: правила abilities
- `core/auth/server-authorization.ts`: серверный guard-хелпер для API/страниц

### Как строятся правила

Функция: `defineAbilityFor(user)` в `core/auth/authorization.ts`.

Ключевой принцип:

- **гость**: только публичное чтение (`read Service`)
- **PLATFORM_ADMIN**: `manage all`
- **OWNER/MANAGER**: права ограничены **только** `providerId` активного membership

Правила для статусов услуг:

- в публичной выдаче видны только `PUBLISHED` услуги
- `OWNER` может публиковать, архивировать и удалять услуги своего provider
- `MANAGER` может создавать и редактировать услуги, а также переводить их в `DRAFT` или `PUBLISHED`
- `MANAGER` не должен архивировать или удалять услуги

Важно: права должны проверяться **на сервере** (route handlers / server components), не только в UI.

## Соглашение: UI `/admin/*` и кабинет провайдера `/pro/*`

**Продуктовое правило:**

- Маршруты приложения **`/admin/*`** (страницы под `app/admin/...`) относятся к **платформенному администрированию** и в целевой модели предназначены только для пользователей с **`User.systemRole = PLATFORM_ADMIN`**.
- Кабинет поставщика услуг (профессионала) — под **`/pro/*`** и через BFF **`app/api/pro/...`**, с проверкой membership и активного `providerId`.

Так мы не смешиваем операции платформы с повседневной работой провайдера.

**Проверка в коде:** `app/admin/layout.tsx` редиректит неавторизованных на `/signin`, для `systemRole !== PLATFORM_ADMIN` вызывает `forbidden()`. BFF `app/api/admin/services/...` проходит через `requirePlatformAdminApi()` в `core/auth/server-authorization.ts` (ответ **403** для провайдера/заказчика).

### Префикс `admin` на backend (Nest)

На бэкенде HTTP-пути вида **`/admin/services`** (см. `backend/src/services/services.controller.ts`) используются для **управления услугами в scope активного provider**, с проверками `getServiceManagementContext` / фильтрацией по `providerId`. Это **не** означает «доступен только PLATFORM_ADMIN»: обычный `OWNER`/`MANAGER` с активным membership тоже ходит сюда через BFF.

Иными словами, **строка пути на API не совпадает с продуктовой зоной UI `/admin/*`**. Совпадение слова `admin` в URL — историческое именование. Пока пути не переименованы, при чтении кода нужно смотреть на guard и scope, а не на префикс. Вынести provider-операции в нейтральные пути (например без сегмента `admin`) — возможный будущий рефакторинг API, если захотим убрать двусмысленность.

## Как роли попадают в session/JWT

Файлы:

- `lib/auth.ts`: NextAuth callbacks `jwt`/`session`
- `core/types/next-auth.d.ts`: расширение типов `Session` и `JWT`

Что кладём в session:

- `user.systemRole`
- `user.activeProviderId`
- `user.memberships[]` (только `ACTIVE`)

Это позволяет:

- показывать UI по ролям
- выполнять серверные проверки без дополнительных запросов (в простых случаях)

## Onboarding provider

Рекомендуемый flow сейчас такой:

1. пользователь регистрируется
2. пользователь логинится
3. frontend ведёт его на `/providers/new`
4. пользователь может:
   - создать `Provider`
   - или пропустить шаг и остаться обычным заказчиком
5. при создании provider:
   - создаётся `Provider`
   - создаётся `ProviderMember(role=OWNER, status=ACTIVE)`
   - в `User.activeProviderId` записывается новый provider

Если пользователь уже авторизован, но provider ещё не создал, в профиле показывается CTA на создание provider.

## Backend endpoints provider

Текущая backend-основа:

- `POST /providers`
  - создать provider
  - автоматически назначить автора `OWNER`
- `GET /providers/mine`
  - вернуть provider-профили текущего пользователя
- `POST /providers/:providerId/activate`
  - переключить `activeProviderId`
- `GET /providers/:providerId/members`
  - получить список участников provider
- `POST /providers/:providerId/members`
  - добавить существующего пользователя по email как `MANAGER`

Маршруты MVP для заказов:

- `GET /orders/mine`
  - вернуть заказы текущего пользователя как заказчика
- `GET /admin/orders`
  - вернуть заказы текущего provider-контекста

### Ограничения

- `SELF_EMPLOYED` не может иметь менеджеров
- менеджеров может добавлять только `OWNER`
- любой membership должен быть `ACTIVE`, чтобы участвовать в доступе

## Как защищены сервисы сейчас (пример)

BFF для услуг (оба проксируют на backend `.../admin/services/...`, см. выше про именование):

- платформа / старый CRUD UI: `app/api/admin/services/route.ts`, `app/api/admin/services/[id]/route.ts`
- кабинет провайдера: `app/api/pro/services/route.ts`, `app/api/pro/services/[id]/route.ts`

Они вызывают `getServiceManagementContext(...)` из `core/auth/server-authorization.ts`, затем:

- ограничивают `findMany` по `providerId` (если не платф.админ)
- добавляют `providerId` и audit поля при создании
- в публичной выдаче скрывают не `PUBLISHED` услуги
- при update/delete проверяют, что сервис принадлежит provider (scope на уровне репозитория)
- при смене `status` дополнительно проверяют, может ли текущая роль публиковать или архивировать услугу

Репозиторий:

- `entities/service/api/service.repository.ts`

Там есть scoped-логика, чтобы нельзя было обновлять/удалять чужую запись по одному `id`.

## Как защищены заявки и “заказы” (как фаза заявки)

Маршруты заявок и заказов должны следовать тем же принципам:

- provider читает только записи своего активного `providerId` (и только те `ServiceRequest`, к которым у него есть доступ по `kind`)
- customer читает только свои записи по `customerUserId`
- при “переводе в заказ” сервер сам проверяет, что текущий provider имеет право (взял заявку / владелец `SERVICE`) и выставляет `status = ACTIVE`
- UI-кнопка не считается достаточной защитой без серверной проверки

## Инструкция для разработчика

### Частые операции

- **Сделать пользователя админом платформы**
  - обновить `User.systemRole = PLATFORM_ADMIN` (через Prisma Studio/SQL/скрипт)
- **Сделать пользователя поставщиком услуг**
  - создать `Provider`
  - выбрать `type = SELF_EMPLOYED` или `type = COMPANY`
  - создать `ProviderMember` для `User` с `role = OWNER`, `status = ACTIVE`
  - выставить `User.activeProviderId = Provider.id` (для удобства)
- **Добавить менеджера поставщику**
  - создать `ProviderMember` с `role = MANAGER`, `status = ACTIVE` для нужной `providerId`
- **Переключить активный provider**
  - обновить `User.activeProviderId`
  - либо вызвать backend endpoint `POST /providers/:providerId/activate`

### Как добавлять новый защищённый ресурс

Чеклист:

- добавить `providerId` в таблицу ресурса и связь на `Provider` (если это данные поставщика)
- в `defineAbilityFor(...)` добавить правила `can(...)`
- на сервере добавить guard (аналог `getServiceManagementContext`)
- в репозитории/запросах Prisma:
  - **обязательно** фильтровать по `providerId`
  - на update/delete — не доверять одному `id`, проверять scope

Если ресурс публичный, как `Service`:
- продумать публичный `status`
- публичная выдача должна фильтровать только публикуемые записи
- рабочие статусы не должны утекать в клиентскую витрину

### Где НЕ делать проверку

- не полагаться только на скрытие кнопок в UI
- не доверять данным, присланным клиентом (`providerId` должен приходить из контекста пользователя)

## Инструкция для Cursor (AI)

Если ты меняешь роли/права/доступ:

- **Схема**: править только `prisma/schema.prisma`, затем `npm run db:generate`
- **Session/JWT**: если добавляется новая роль/контекст — обновить:
  - `lib/auth.ts`
  - `core/types/next-auth.d.ts`
  - (опционально) клиентское состояние `core/auth/SessionSync.tsx` / `core/store/authSlice.ts`
- **Права**: правила менять в `core/auth/authorization.ts`
- **Серверные проверки**:
  - для API и server components использовать guard-хелпер (как `core/auth/server-authorization.ts`)
  - не допускать доступа “по id без scope”
- **Данные поставщика**:
  - любой ресурс поставщика должен иметь `providerId`
  - любые `findMany`/`update`/`delete` должны учитывать `providerId`
- **Тесты**:
  - если добавился guard — обновить моки в route/page тестах
- **Сборка Prisma + Next**:
  - `lib/prisma.ts` импортирует Prisma client как `../app/generated/prisma/client.js`
  - если Turbopack “теряет корень” — проверять `next.config.mjs` → `turbopack.root`

## Примечание про миграции

- миграции лежат в `prisma/migrations`
- после `prisma migrate dev` всегда запускать `npm run db:generate`

