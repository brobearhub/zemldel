# Request Work Progress Stages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Блок «Ход выполнения работ» на `/pro/requests/{id}` и `/profile/requests/{id}`: этапы с draft/publish, статусы (системные + кастомные), файлы исполнителя и слоты документов для клиента.

**Architecture:** Отдельный NestJS-модуль `request-work-stages` (как `request-document-requests`) + Prisma-модели. Кастомные статусы в `ProviderUserSettings.workStageStatuses`. Frontend: entity API через BFF + widget под `RequestDetails`. Порядок на странице: **Детали → Ход выполнения работ → Замечания → Документы**.

**Tech Stack:** NestJS, Prisma, S3 (`S3Service`), Next.js App Router BFF, MUI, Vitest, FSD

**Spec:** `docs/superpowers/specs/2026-08-07-request-work-progress-stages-design.md`

## Global Constraints

- Мутации этапов/слотов/файлов только при `Request.status === 'ACTIVE'`
- GET: `ACTIVE` и `ACCEPTANCE_PENDING` (read-only вне ACTIVE)
- Customer API отдаёт только `lifecycle === 'PUBLISHED'`
- После publish: `title`/`description` immutable; `statusKey`/`statusLabel` меняются свободно
- Нет истории смен статуса и обязательных комментариев
- `statusLabel` — snapshot при установке статуса
- Кастомный статус нельзя удалить из settings, если используется на этапах заявок в `{ACTIVE, ACCEPTANCE_PENDING}`; на `{ACCEPTED, COMPLETED, CANCELLED, CLOSED}` — можно; отображение через snapshot
- Файлы: `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png`, `.webp`
- Клиент → только `/api/...` (BFF); без direct-to-backend
- Комментарии/коммиты — на русском; идентификаторы — на английском
- Не менять публичные контракты существующих API без нужды

## File map

### Backend (create)

```
backend/src/request-work-stages/
  request-work-stages.module.ts
  request-work-stages.controller.ts
  request-work-stages.service.ts
  request-work-stages.service.spec.ts
  work-stage-statuses.ts          # системные статусы + helpers
  work-stage-statuses.spec.ts
  dto/work-stages.dto.ts
```

### Backend (modify)

- `backend/prisma/schema.prisma` — enums/models + `ProviderUserSettings.workStageStatuses`
- `backend/src/app.module.ts` — register module
- `docs/business-logic.md` — раздел «Ход выполнения работ»

### Frontend (create)

```
frontend/entities/request/api/request-work-stages.ts
frontend/entities/request/lib/work-stage-statuses.ts
frontend/entities/request/lib/work-stage-statuses.test.ts
frontend/widgets/request-work-progress/
  index.ts
  model/types.ts
  ui/RequestWorkProgress.tsx
  ui/WorkStageCard.tsx
  ui/WorkStageStatusSelect.tsx
frontend/app/api/pro/requests/[id]/work-stages/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/publish/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/status/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/files/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/files/[fileId]/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/files/[fileId]/download/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/doc-slots/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/doc-slots/[slotId]/route.ts
frontend/app/api/pro/requests/[id]/work-stages/[stageId]/doc-slots/[slotId]/download/route.ts
frontend/app/api/requests/[id]/work-stages/route.ts
frontend/app/api/requests/[id]/work-stages/[stageId]/files/[fileId]/download/route.ts
frontend/app/api/requests/[id]/work-stages/[stageId]/doc-slots/[slotId]/upload/route.ts
frontend/app/api/requests/[id]/work-stages/[stageId]/doc-slots/[slotId]/download/route.ts
frontend/app/api/pro/settings/work-stage-statuses/route.ts
frontend/app/(site)/pro/settings/page.tsx   # или section в существующем pro layout
```

### Frontend (modify)

- `frontend/entities/request/index.ts` — re-export types/helpers
- `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx` — вставить блок после `RequestDetails`
- `frontend/app/(site)/profile/requests/[id]/CustomerRequestDetailClient.tsx` и/или `CustomerRequestConversationWorkspace.tsx` — то же
- `frontend/widgets/cabinet-chrome/model/nav-config.tsx` — пункт «Настройки»
- после backend: `npm run generate-api` в `frontend/` (backend на `:3003`)

---

### Task 1: Prisma schema + system statuses constants

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/request-work-stages/work-stage-statuses.ts`
- Create: `backend/src/request-work-stages/work-stage-statuses.spec.ts`
- Modify: `docs/business-logic.md` (краткий раздел по спеке)

**Interfaces:**
- Produces: Prisma models `RequestWorkStage`, `RequestWorkStageFile`, `RequestWorkStageDocSlot`; enums `WorkStageLifecycle`, `WorkStageDocSlotStatus`; field `ProviderUserSettings.workStageStatuses Json?`
- Produces: `SYSTEM_WORK_STAGE_STATUSES`, `isSystemWorkStageStatusKey()`, `resolveStatusLabel()`

- [ ] **Step 1: Добавить в schema.prisma**

```prisma
enum WorkStageLifecycle {
  DRAFT
  PUBLISHED
}

enum WorkStageDocSlotStatus {
  REQUESTED
  UPLOADED
}

model RequestWorkStage {
  id           String             @id @default(uuid()) @db.Uuid
  requestId    String             @db.Uuid
  providerId   String             @db.Uuid
  title        String
  description  String             @default("")
  statusKey    String
  statusLabel  String
  lifecycle    WorkStageLifecycle @default(DRAFT)
  publishedAt  DateTime?
  sortOrder    Int                @default(0)

  request  Request                 @relation(fields: [requestId], references: [id], onDelete: Cascade)
  provider Provider                @relation(fields: [providerId], references: [id], onDelete: Cascade)
  files    RequestWorkStageFile[]
  docSlots RequestWorkStageDocSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([requestId, sortOrder])
  @@index([providerId, statusKey])
  @@index([requestId, lifecycle])
}

model RequestWorkStageFile {
  id               String  @id @default(uuid()) @db.Uuid
  stageId          String  @db.Uuid
  uploadedByUserId String? @db.Uuid
  originalName     String
  mimeType         String
  sizeBytes        Int
  sha256           String
  storageRelPath   String

  stage RequestWorkStage @relation(fields: [stageId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([stageId, createdAt])
}

model RequestWorkStageDocSlot {
  id               String                 @id @default(uuid()) @db.Uuid
  stageId          String                 @db.Uuid
  title            String
  status           WorkStageDocSlotStatus @default(REQUESTED)
  uploadedByUserId String?                @db.Uuid
  uploadedAt       DateTime?
  originalName     String?
  mimeType         String?
  sizeBytes        Int?
  sha256           String?
  storageRelPath   String?

  stage RequestWorkStage @relation(fields: [stageId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([stageId, createdAt])
  @@index([stageId, status])
}
```

Также: `workStageStatuses Json?` в `ProviderUserSettings`; relations на `Request` и `Provider`.

- [ ] **Step 2: Миграция**

Run: `cd backend && npx prisma migrate dev --name request_work_stages`

Expected: миграция применена, client сгенерирован.

- [ ] **Step 3: Константы системных статусов + тест**

```ts
// work-stage-statuses.ts
export const SYSTEM_WORK_STAGE_STATUSES = [
  { key: 'INITIAL_CONSULTATION', label: 'Первичная консультация' },
  { key: 'DOC_COLLECTION', label: 'Сбор документов' },
  { key: 'DOC_PREPARATION', label: 'Подготовка документов' },
  { key: 'SUBMITTED_TO_AUTHORITY', label: 'Подано в орган' },
  { key: 'AWAITING_RESPONSE', label: 'Ожидание ответа' },
  { key: 'REVISION', label: 'Доработка' },
  { key: 'ACCEPTANCE_CERTIFICATE_PREP', label: 'Подготовка акта приёма-передачи' },
  { key: 'SERVICE_ACT_PREP', label: 'Подготовка акта об оказании услуг' },
  { key: 'COMPLETED', label: 'Завершено' },
  { key: 'SUSPENDED', label: 'Приостановлено' },
  { key: 'LEASE_AGREEMENT_PREP', label: 'Подготовка договора аренды' },
] as const;

export type SystemWorkStageStatusKey =
  (typeof SYSTEM_WORK_STAGE_STATUSES)[number]['key'];
```

Test: каждый key уникален; `isSystemWorkStageStatusKey('AWAITING_RESPONSE') === true`.

Run: `cd backend && npx vitest run src/request-work-stages/work-stage-statuses.spec.ts`

- [ ] **Step 4: Секция в `docs/business-logic.md`**

Кратко: сущности, ACTIVE-only мутации, draft/publish, customer видит только published, правила удаления кастомных статусов, snapshot `statusLabel`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma backend/src/request-work-stages/work-stage-statuses.ts \
  backend/src/request-work-stages/work-stage-statuses.spec.ts docs/business-logic.md \
  docs/superpowers/specs/2026-08-07-request-work-progress-stages-design.md
git commit -m "feat(work-stages): схема этапов и системные статусы"
```

---

### Task 2: Backend CRUD этапов (без файлов)

**Files:**
- Create: `backend/src/request-work-stages/dto/work-stages.dto.ts`
- Create: `backend/src/request-work-stages/request-work-stages.service.ts`
- Create: `backend/src/request-work-stages/request-work-stages.controller.ts`
- Create: `backend/src/request-work-stages/request-work-stages.module.ts`
- Create: `backend/src/request-work-stages/request-work-stages.service.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: Prisma models из Task 1; `AuthService.getServiceManagementContext`; паттерн exclusive provider из `request-document-requests.service.ts`
- Produces DTO:

```ts
type WorkStageDto = {
  id: string;
  requestId: string;
  title: string;
  description: string;
  statusKey: string;
  statusLabel: string;
  lifecycle: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  sortOrder: number;
  files: WorkStageFileDto[];      // [] пока
  docSlots: WorkStageDocSlotDto[]; // [] пока
  createdAt: string;
  updatedAt: string;
};
```

Методы сервиса:
- `listForProvider({ actorUserId, requestId })`
- `listForCustomer({ actorUserId, requestId })` — только PUBLISHED
- `createDraft({ actorUserId, requestId, title, description, statusKey })`
- `updateDraft({ actorUserId, requestId, stageId, title?, description?, statusKey?, sortOrder? })`
- `publish({ actorUserId, requestId, stageId })`
- `updateStatus({ actorUserId, requestId, stageId, statusKey })` — draft и published
- `deleteDraft({ actorUserId, requestId, stageId })`

Резолв `statusLabel` при create/updateStatus: системный словарь ∪ `workStageStatuses` текущего user+provider; иначе `400 Invalid statusKey`.

- [ ] **Step 1: Failing tests** (mock Prisma как в `request-document-requests.service.spec.ts` / `requests.remarks.spec.ts`)

Покрыть минимум:
1. createDraft ok при ACTIVE
2. createDraft 400/403 если статус заявки не ACTIVE
3. publish → lifecycle PUBLISHED; повторный publish — ошибка
4. updateDraft title после publish — ошибка
5. updateStatus после publish — ok, обновляет statusLabel
6. listForCustomer не возвращает DRAFT
7. deleteDraft с файлами/UPLOADED слотом — 400 (можно заглушить до Task 3/4, но контракт метода уже такой)

Run: `cd backend && npx vitest run src/request-work-stages/request-work-stages.service.spec.ts`  
Expected: FAIL (модуля нет)

- [ ] **Step 2: Реализовать service + controller + module**

Controller paths (как в спеке):
- `GET/POST pro/requests/:requestId/work-stages`
- `PATCH/DELETE pro/requests/:requestId/work-stages/:stageId`
- `POST pro/requests/:requestId/work-stages/:stageId/publish`
- `PATCH pro/requests/:requestId/work-stages/:stageId/status`
- `GET requests/:requestId/work-stages`

Auth: `InternalAuthService.getUserIdFromRequest` — как document-requests.

- [ ] **Step 3: Tests PASS**

Run: `cd backend && npx vitest run src/request-work-stages/request-work-stages.service.spec.ts`

- [ ] **Step 4: Commit**

```bash
git add backend/src/request-work-stages backend/src/app.module.ts
git commit -m "feat(work-stages): CRUD этапов draft/publish/status"
```

---

### Task 3: Файлы исполнителя (upload/download/delete)

**Files:**
- Modify: `backend/src/request-work-stages/request-work-stages.service.ts`
- Modify: `backend/src/request-work-stages/request-work-stages.controller.ts`
- Modify: `backend/src/request-work-stages/request-work-stages.service.spec.ts`
- Modify: `backend/src/request-work-stages/dto/work-stages.dto.ts`

**Interfaces:**
- Consumes: `S3Service` (PutObject/GetObject/DeleteObject) — скопировать helpers из `request-document-requests.service.ts` (`sha256Buffer`, decode filename)
- Allowed ext: `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png`, `.webp`
- Storage path prefix: `request-work-stages/{requestId}/{stageId}/{fileId}{ext}`
- Produces: `uploadProviderFile`, `deleteProviderFile`, `downloadProviderFile` (+ customer download для published)

- [ ] **Step 1: Tests** — upload при ACTIVE; download customer только published; delete provider ok

- [ ] **Step 2: Implement** multer `FileInterceptor` + endpoints:
  - `POST pro/.../work-stages/:stageId/files`
  - `DELETE pro/.../files/:fileId`
  - `GET pro/.../files/:fileId/download`
  - `GET requests/.../files/:fileId/download`

- [ ] **Step 3: Tests PASS + commit**

```bash
git commit -m "feat(work-stages): файлы исполнителя на этапе"
```

---

### Task 4: Doc slots + customer upload

**Files:**
- Modify: service/controller/dto/spec (тот же модуль)

**Interfaces:**
- `createDocSlot({ title })` — ACTIVE, stage существует (draft или published)
- `deleteDocSlot` — только `REQUESTED`
- `uploadCustomerDocSlot` — customer owner, stage PUBLISHED, slot REQUESTED, request ACTIVE
- `downloadDocSlot` — provider и customer (customer — published stage)

- [ ] **Step 1: Failing tests** для create/upload/delete rules

- [ ] **Step 2: Implement endpoints**
  - `POST/DELETE pro/.../doc-slots[/:slotId]`
  - `GET .../doc-slots/:slotId/download` (pro + customer)
  - `POST requests/.../doc-slots/:slotId/upload`

- [ ] **Step 3: Tests PASS + commit**

```bash
git commit -m "feat(work-stages): слоты документов для клиента"
```

---

### Task 5: Settings — кастомные статусы

**Files:**
- Modify: `request-work-stages.service.ts` / `.controller.ts` / `.spec.ts` / dto

**Interfaces:**
- `GET /pro/settings/work-stage-statuses` → `{ system: [...], custom: { key, label }[] }`
- `PUT /pro/settings/work-stage-statuses` body `{ custom: { key, label }[] }` — полная замена списка кастомных

Правило delete (при PUT, если ключ исчез из списка):
- если существует `RequestWorkStage` с `statusKey` и `providerId` текущего контекста и `Request.status ∈ {ACTIVE, ACCEPTANCE_PENDING}` → `400` с сообщением вида «Статус используется в активной заявке»
- использование только в `{ACCEPTED, COMPLETED, CANCELLED, CLOSED}` — ок

Генерация `key` для нового кастомного: `custom_${nanoid/uuid-slice}` на клиенте или сервере при add; PUT принимает уже готовые ключи. Валидация: label trim не пустой; key не пересекается с системными.

- [ ] **Step 1–3: TDD + implement + commit**

```bash
git commit -m "feat(work-stages): настройки кастомных статусов"
```

---

### Task 6: BFF routes + generate-api

**Files:**
- Create все `frontend/app/api/**/work-stages/**` и `.../settings/work-stage-statuses/route.ts` по паттерну `frontend/app/api/pro/requests/[id]/document-requests/route.ts` (proxy, timeout, cookies, `x-request-id`)

- [ ] **Step 1: Скопировать proxy-helpers** из соседних BFF route (не дублировать ad-hoc fetch без timeout)

- [ ] **Step 2: Поднять backend и сгенерировать клиент**

```bash
cd frontend && npm run generate-api
```

Expected: в `frontend/shared/api/generated/backend/Api.ts` появляются work-stages типы/методы (если OpenAPI покрыт декораторами). Entity-слой может ходить в `/api/...` напрямую fetch-ом по паттерну `request-document-requests.ts` — generate-api желателен, но не блокирует, если entity использует ручной BFF fetch.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(work-stages): BFF прокси для этапов работ"
```

---

### Task 7: Frontend entity API + status helpers

**Files:**
- Create: `frontend/entities/request/api/request-work-stages.ts`
- Create: `frontend/entities/request/lib/work-stage-statuses.ts`
- Create: `frontend/entities/request/lib/work-stage-statuses.test.ts`
- Modify: `frontend/entities/request/index.ts` (+ dto types в `entities/request/dto` если принято в слайсе)

**Interfaces:**
- `fetchProWorkStages(requestId)`, `createProWorkStage(...)`, `updateProWorkStage(...)`, `publishProWorkStage(...)`, `updateProWorkStageStatus(...)`, `deleteProWorkStage(...)`
- file/slot helpers зеркально document-requests
- `fetchCustomerWorkStages(requestId)`, `uploadCustomerWorkStageDocSlot(...)`
- `fetchWorkStageStatuses()`, `saveCustomWorkStageStatuses(custom)`
- `SYSTEM_WORK_STAGE_STATUSES` (дублировать labels как на бэке — источник отображения dropdown до ответа settings; settings API — source of truth для custom)

- [ ] **Step 1: Unit-тест** merge system+custom для options dropdown

- [ ] **Step 2: Implement API module**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(work-stages): entity API и статусы на фронте"
```

---

### Task 8: Widget UI (provider + customer modes)

**Files:**
- Create: `frontend/widgets/request-work-progress/**`

**Interfaces:**
- Props:

```ts
type RequestWorkProgressProps = {
  mode: 'provider' | 'customer';
  requestId: string;
  requestStatus: string;
  stages: WorkStageDto[];
  statusOptions: { key: string; label: string }[];
  busy?: boolean;
  onRefresh: () => Promise<void>;
  // provider callbacks: create/publish/updateStatus/uploadFile/createSlot/delete...
  // customer callbacks: uploadSlot
};
```

UI:
- Paper «Ход выполнения работ» (стиль как соседние блоки)
- Empty: provider CTA «Добавить этап»; customer текст «Исполнитель пока не опубликовал этапы»
- Stage card: badge Черновик; StatusSelect; title/description (edit only draft); Publish; files list; doc slots
- Read-only UI если `requestStatus !== 'ACTIVE'` (кроме просмотра/download)

- [ ] **Step 1: Собрать UI по существующим MUI-паттернам `RequestRemarks` / documents section** (без новой дизайн-системы)

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(work-stages): UI виджет хода выполнения работ"
```

---

### Task 9: Wire в pro + customer request pages

**Files:**
- Modify: `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx` — сразу после `<RequestDetails ... />`, до `<RequestRemarks ... />`
- Modify: customer detail workspace (тот файл, где рендерится `RequestDetails` для `/profile/requests/[id]`) — тот же порядок

Load stages при mount / после мутаций; показывать блок когда `requestStatus` ∈ `{ACTIVE, ACCEPTANCE_PENDING}` (и опционально позже — если страница ещё открыта в ACCEPTED+; минимум ACTIVE + ACCEPTANCE_PENDING).

- [ ] **Step 1: Wiring + ручная проверка в браузере** (dev servers уже могут быть запущены)

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(work-stages): блок под Детали на страницах заявки"
```

---

### Task 10: Pro Settings page + nav

**Files:**
- Modify: `frontend/widgets/cabinet-chrome/model/nav-config.tsx` — пункт «Настройки» → `/pro/settings`
- Create: `frontend/app/(site)/pro/settings/page.tsx` (+ тонкий client widget для CRUD custom statuses)
- Modify: mobileBottom/desktop PROVIDER_NAV

UI страницы: список кастомных статусов, add (label → генерируем key), rename, delete (ошибку с бэка показать toast/Alert). Системные — read-only список сверху или отдельной секцией.

- [ ] **Step 1: Implement**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(work-stages): настройки кастомных статусов в pro sidebar"
```

---

### Task 11: Verification + spec status

- [ ] **Step 1: Прогнать тесты**

```bash
cd backend && npx vitest run src/request-work-stages
cd frontend && npx vitest run entities/request/lib/work-stage-statuses.test.ts
```

- [ ] **Step 2: Ручной чеклист**
  - [ ] Provider ACTIVE: создать draft → edit → publish → сменить статус
  - [ ] После publish title/description не редактируются
  - [ ] Добавить файл и слот после publish
  - [ ] Customer не видит draft; upload в слот; download файла исполнителя
  - [ ] Settings: add custom status → появляется в dropdown; delete при ACTIVE использовании — ошибка; после COMPLETED — можно удалить, label на архивной заявке на месте
  - [ ] Блок под «Детали»

- [ ] **Step 3: Финальный commit если остались правки**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| RequestWorkStage + files + doc slots | 1–4 |
| System statuses + custom in ProviderUserSettings | 1, 5, 10 |
| Draft/publish immutability title/description | 2 |
| Status change without history/comment | 2 |
| statusLabel snapshot | 2, 5 |
| Customer published-only | 2, 9 |
| ACTIVE mutations / ACCEPTANCE_PENDING read | 2–4, 8–9 |
| File types pdf/word/photos | 3–4 |
| UI under Детали | 9 |
| Settings sidebar | 10 |
| business-logic.md | 1 |
| Delete custom: block active, allow archive-only | 5 |

## Out of scope (не делать)

- История статусов / комментарии к смене
- Shared statuses на весь provider
- Rename `proInboxFilters` → `settings`
- Влияние этапов на state machine заявки
- Удаление published этапов
