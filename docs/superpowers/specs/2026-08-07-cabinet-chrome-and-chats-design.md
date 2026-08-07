# Cabinet Chrome + Chats Inbox — дизайн

Дата: 2026-08-07

## Контекст

Сейчас в web-версии:
- в `app/(site)` всегда рендерится глобальный `Header` + `Footer`;
- в `/profile*` и `/pro*` дополнительно рендерится вертикальный sidebar в контенте.

Цель — привести UX кабинетов к паттерну «как в мобильном приложении»:
- desktop: горизонтальный верхний bar (вместо глобального header/sidebars);
- mobile: сверху компактный sticky header, снизу фиксированный tab bar.

Дополнительно: в mobile tab bar добавить «Чат» → новая зона `/chats*` с inbox и детальной страницей.

## Термины

- **cabinet-zone**: страницы `/profile*` и `/pro*` (личный и профессиональный кабинеты).
- **chats-zone**: страницы `/chats*` — inbox + чат по заявке.
- **cabinet chrome**: набор верхнего и/или нижнего навигационного UI, который заменяет глобальный `Header` в кабинетных зонах.

## UX требования (зафиксировано)

### 1) Замена header/sidebar

- В `cabinet-zone` и `chats-zone` глобальный site `Header` и `Footer` **не показываются**.
- Вертикальные сайдбары кабинетов **убираются** (на desktop и mobile).

### 2) Desktop (`md+`)

- Показываем **один** верхний горизонтальный bar в стиле текущего `Header`:
  - слева: logo (ведёт на `/`);
  - по центру: пункты навигации по зоне (client/pro);
  - справа: иконка профиля (`ProfileMenu`).
- Нижней панели нет.

### 3) Mobile (`xs`/`sm`)

- Сверху: sticky mobile header (отдельный компонент):
  - client: `logo | Заявки | profile`;
  - pro: `logo | Заявки | Рабочий день | profile`.
- Снизу: фиксированный tab bar с иконками + подписью (title):
  - client: `Домой | Заявки | Документы | Профиль | Чат`;
  - pro: `Домой | Обзор | Команда | Клиенты | Напоминания | Услуги | Чат`;
  - «Чат» всегда справа.
- `Домой` и `logo` всегда ведут на `/`.

### 4) Навигационные матрицы

**Client desktop:** `logo | Заявки | Документы | Профиль | ProfileMenu`  \n
**Client mobile top:** `logo | Заявки | ProfileMenu`  \n
**Client mobile bottom:** `Домой | Заявки | Документы | Профиль | Чат`

**Pro desktop:** `logo | Заявки | Рабочий день | Обзор | Команда | Клиенты | Напоминания | Услуги(list) | ProfileMenu`  \n
**Pro mobile top:** `logo | Заявки | Рабочий день | ProfileMenu`  \n
**Pro mobile bottom:** `Домой | Обзор | Команда | Клиенты | Напоминания | Услуги | Чат`

Маршруты:
- Client «Заявки/Документы/Профиль»: `/profile?section=requests|documents|profile`
- Pro: `/pro`, `/pro/workday`, `/pro/overview`, `/pro/team`, `/pro/clients`, `/pro/reminders`, `/pro/services/list`
- Чат: `/chats`, `/chats/{requestId}`

## Чат: новые страницы

### `/chats` (inbox)

Список строк:
- **title заявки**;
- **последнее сообщение** (snippet);
- (опционально) время последнего сообщения;
- (опционально) unread badge по заявке.

Доступ и данные:
- список скоупится контекстом: **client** (как customer) или **pro** (как активный provider);
- контекст для `/chats*` определяется последней посещённой cabinet-zone (`/profile*` или `/pro*`), сохраняется на клиенте.

### `/chats/{requestId}`

Отображение чата по заявке, переиспользуем существующий `ServiceRequestChatPanel`.

Особенности:
- для client заявок без `serviceId` (multi-thread): доступно переключение тредов (по провайдерам);
- для pro: один тред (ensure) в контексте активного provider.

## Контракты (backend + BFF)

Новый endpoint:
- `GET /chat/inbox` — role-scoped inbox.

Ответ (item):
- `serviceRequestId`
- `title`
- `lastSnippet`
- `lastMessageAt`
- `unreadCount?` (если доступно без тяжёлых запросов; иначе client использует socket hints)

BFF:
- `GET /api/chat/inbox` проксирует запрос к backend, добавляет auth, timeout, correlation id.

## Архитектура фронтенда (FSD)

Новый `widgets/cabinet-chrome/`:
- конфиги навигации client/pro (desktop/mobile surfaces);
- компоненты: `CabinetDesktopBar`, `CabinetMobileHeader`, `CabinetBottomNav`, `CabinetChrome`.

`app/(site)/layout.tsx` получает `SiteChrome`-обёртку, которая:
- на public routes оставляет `Header` + `Footer`;
- на cabinet/chats routes заменяет их на `CabinetChrome` и правильные spacers.

