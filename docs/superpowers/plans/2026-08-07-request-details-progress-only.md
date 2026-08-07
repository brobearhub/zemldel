# Request Details Progress-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Упростить блок «Детали» до линии прогресса и показать lifecycle-кнопки/мету отдельным виджетом под описанием заявки (customer и provider).

**Architecture:** Новый FSD widget-slice `request-lifecycle-actions` (UI + model + Strategy/Behavior). `RequestDetails` оставляет только stepper. `RequestDetailHeaderCard` получает слот `afterBody`. Screen-контейнеры владеют mutations/confirm как сейчас; action ids не меняются.

**Tech Stack:** Next.js App Router, React, MUI, Vitest, TypeScript, FSD.

## Global Constraints

- Спека: `docs/superpowers/specs/2026-08-07-request-details-progress-only-design.md`
- Layout: header → details(stepper) → body? → afterBody(lifecycle) → Прогресс → Замечания → Документы
- Без описания (`body == null`): lifecycle сразу после stepper
- Пустой lifecycle → не рендерить
- Backend / DTO / бизнес-правила кнопок не менять
- Action ids прежние: `openOfferDialog | acceptResult | startWork | markRendered | requestAcceptance | complete | declineOffer`
- FSD: widgets не импортируют друг друга; типы actions живут в `request-lifecycle-actions`
- Коммиты — только если пользователь явно попросил; иначе пропускать commit-шаги
- Язык коммитов/комментариев — русский; идентификаторы — английский
- Без `any` без обоснования; публичные контракты API не ломать

## File map

| Path | Responsibility |
|------|----------------|
| Create `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-model.ts` | Lifecycle VM: alert/note/info/actions/autoAccept |
| Create `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-model.test.ts` | Юнит-тесты lifecycle model (перенос из details) |
| Create `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-behavior.ts` | Behavior factories + run |
| Create `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-behavior.test.ts` | Behavior тесты (перенос из details) |
| Create `frontend/widgets/request-lifecycle-actions/ui/RequestLifecycleActions.tsx` | UI блока без заголовка |
| Create `frontend/widgets/request-lifecycle-actions/index.ts` | Public API slice |
| Modify `frontend/widgets/request-details/model/request-details-model.ts` | Только progress VM |
| Modify `frontend/widgets/request-details/model/request-details-model.test.ts` | Только steps/activeStep/muted |
| Modify `frontend/widgets/request-details/model/request-details-behavior.ts` | Только progress; убрать actions/bottomSlot |
| Modify `frontend/widgets/request-details/model/request-details-behavior.test.ts` | Progress-only expectations |
| Modify `frontend/widgets/request-details/ui/RequestDetails.tsx` | Только stepper UI |
| Modify `frontend/shared/ui/RequestDetailHeaderCard.tsx` | Слот `afterBody` |
| Modify `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx` | Подключить lifecycle в `afterBody` |
| Modify `frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx` | Подключить lifecycle в `afterBody` |

---

### Task 1: Lifecycle model (TDD)

**Files:**
- Create: `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-model.ts`
- Create: `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-model.test.ts`

**Interfaces:**
- Consumes: `RequestCustomerDto`, `RequestProDto`, helpers from `@/entities/request` (`formatRequestDate`, `hasRequestLock`, `isContractPhase`, `isOrderExecutionStatus`, `isOpenRequestStatus`)
- Produces:
  ```ts
  export type RequestLifecycleActionId =
    | "openOfferDialog"
    | "acceptResult"
    | "startWork"
    | "markRendered"
    | "requestAcceptance"
    | "complete"
    | "declineOffer";

  export type RequestLifecycleActionDescriptor = {
    id: RequestLifecycleActionId;
    label: string;
    variant: "contained" | "outlined";
    color: "primary" | "secondary" | "success" | "warning";
    disabled?: boolean;
  };

  export type RequestLifecycleInfoRow = { label: string; value: string };

  export type RequestLifecycleViewModel = {
    lockedAlert?: { title: string };
    note: string | null;
    infoRows: RequestLifecycleInfoRow[];
    actions: RequestLifecycleActionDescriptor[];
    autoAcceptAtLabel: string | null;
  };

  export function buildRequestLifecycleViewModel(
    input:
      | { side: "customer"; request: RequestCustomerDto; canAcceptContract: boolean }
      | { side: "provider"; request: RequestProDto },
  ): RequestLifecycleViewModel;

  export function isLifecycleEmpty(vm: RequestLifecycleViewModel): boolean;
  // true когда нет alert/note/infoRows/actions/autoAcceptAtLabel
  ```

- [ ] **Step 1: Write failing tests**

Создать `request-lifecycle-model.test.ts` — перенести кейсы из `request-details-model.test.ts`, заменив `buildRequestDetailsViewModel` → `buildRequestLifecycleViewModel` и ожидания на lifecycle-поля:

```ts
import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { buildRequestLifecycleViewModel, isLifecycleEmpty } from "./request-lifecycle-model";

// makeCustomer / makeProvider — скопировать из request-details-model.test.ts как есть

describe("buildRequestLifecycleViewModel", () => {
  it("customer: shows acceptance action on ACCEPTANCE_PENDING", () => {
    const req = makeCustomer({
      status: "ACCEPTANCE_PENDING",
      autoAcceptAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
    });
    const vm = buildRequestLifecycleViewModel({ side: "customer", request: req, canAcceptContract: false });

    expect(vm.actions.map((a) => a.id)).toEqual(["acceptResult"]);
    expect(vm.autoAcceptAtLabel?.startsWith("Автопринятие:")).toBe(true);
  });

  it("customer: shows open offer action when contract can be accepted", () => {
    const req = makeCustomer({ status: "DISCUSSING", lockedAt: "2026-08-06T00:00:00.000Z" });
    const vm = buildRequestLifecycleViewModel({ side: "customer", request: req, canAcceptContract: true });

    expect(vm.actions.map((a) => a.id)).toEqual(["openOfferDialog"]);
  });

  it("provider: shows locked alert and hides actions when request is locked", () => {
    const req = makeProvider({ status: "ACTIVE", isLocked: true, offerStatus: "SELECTED" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.lockedAlert?.title).toBe("Заказ уже оформлен другим провайдером.");
    expect(vm.actions).toEqual([]);
  });

  it("provider: ACTIVE shows markRendered", () => {
    const req = makeProvider({ status: "ACTIVE", offerStatus: "SELECTED", lockedAt: "2026-08-06T00:00:00.000Z" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).not.toContain("startWork");
    expect(vm.actions.map((a) => a.id)).toContain("markRendered");
  });

  it("provider: ACCEPTANCE_PENDING has no markRendered / requestAcceptance", () => {
    const req = makeProvider({ status: "ACCEPTANCE_PENDING", offerStatus: "SELECTED", lockedAt: "2026-08-06T00:00:00.000Z" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).not.toContain("requestAcceptance");
    expect(vm.actions.map((a) => a.id)).not.toContain("markRendered");
  });

  it("provider: allows decline on non-execution status when offer is selected", () => {
    const req = makeProvider({ status: "DISCUSSING", offerStatus: "SELECTED" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).toContain("declineOffer");
    expect(vm.actions.find((a) => a.id === "declineOffer")?.label).toBe("Отказаться от заявки");
  });

  it("provider: includes dialogs info row", () => {
    const req = makeProvider({ conversationsCount: 1 });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });
    expect(vm.infoRows).toContainEqual({ label: "Диалогов", value: "1" });
  });

  it("isLifecycleEmpty: true when nothing to show", () => {
    const req = makeCustomer({ status: "NEW" });
    const vm = buildRequestLifecycleViewModel({ side: "customer", request: req, canAcceptContract: false });
    expect(isLifecycleEmpty(vm)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npx vitest run widgets/request-lifecycle-actions/model/request-lifecycle-model.test.ts
```

Expected: FAIL (module not found / export missing)

- [ ] **Step 3: Implement model**

Перенести из `request-details-model.ts` без изменения правил:

- `resolveStateIdFromRequest`
- `buildCustomerPendingInfo` / `buildProviderPendingInfo`
- `buildCustomerState` / `buildProviderState` (только note/actions/autoAcceptAtLabel)
- сборку `infoRows`, `lockedAlert`
- типы action id / descriptor / info row

Добавить:

```ts
export function isLifecycleEmpty(vm: RequestLifecycleViewModel): boolean {
  return (
    !vm.lockedAlert &&
    !vm.note &&
    !vm.autoAcceptAtLabel &&
    vm.infoRows.length === 0 &&
    vm.actions.length === 0
  );
}
```

Why: UI решает «рисовать ли блок» одной чистой функцией, без дублирования условий в JSX.

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend && npx vitest run widgets/request-lifecycle-actions/model/request-lifecycle-model.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit (только по просьбе пользователя)**

```bash
git add frontend/widgets/request-lifecycle-actions/model/request-lifecycle-model.ts \
  frontend/widgets/request-lifecycle-actions/model/request-lifecycle-model.test.ts
git commit -m "$(cat <<'EOF'
feat(frontend): lifecycle model для кнопок и меты заявки

EOF
)"
```

---

### Task 2: Lifecycle behavior (TDD)

**Files:**
- Create: `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-behavior.ts`
- Create: `frontend/widgets/request-lifecycle-actions/model/request-lifecycle-behavior.test.ts`

**Interfaces:**
- Consumes: `buildRequestLifecycleViewModel`, action types from Task 1
- Produces:
  ```ts
  export type RequestLifecycleBehavior = {
    getViewModel: () => RequestLifecycleViewModel;
    run: (action: { id: string; payload?: unknown }) => Promise<void> | void;
  };

  export function createCustomerRequestLifecycleBehavior(input: {
    request: RequestCustomerDto;
    canAcceptContract: boolean;
    actions: {
      openOfferDialog: () => void;
      acceptResult: () => Promise<void> | void;
    };
  }): RequestLifecycleBehavior;

  export function createProviderRequestLifecycleBehavior(input: {
    request: RequestProDto;
    isMarkRenderedDisabled?: boolean;
    actions: {
      startWork: () => Promise<void> | void;
      markRendered: () => Promise<void> | void;
      requestAcceptance: () => Promise<void> | void;
      complete: () => Promise<void> | void;
      declineOffer: () => Promise<void> | void;
    };
  }): RequestLifecycleBehavior;
  ```

- [ ] **Step 1: Write failing tests**

Перенести кейсы из `request-details-behavior.test.ts`, заменив factories на lifecycle:

```ts
import { createCustomerRequestLifecycleBehavior, createProviderRequestLifecycleBehavior } from "./request-lifecycle-behavior";
import { vi } from "vitest";
// makeCustomer / makeProvider — как в Task 1

describe("request-lifecycle behavior", () => {
  it("customer: getViewModel exposes actions and run dispatches callbacks", async () => {
    const openOfferDialog = vi.fn();
    const acceptResult = vi.fn();
    const behavior = createCustomerRequestLifecycleBehavior({
      request: makeCustomer({ status: "DISCUSSING", lockedAt: "2026-08-06T00:00:00.000Z" }),
      canAcceptContract: true,
      actions: { openOfferDialog, acceptResult },
    });
    expect(behavior.getViewModel().actions.map((a) => a.id)).toEqual(["openOfferDialog"]);
    await behavior.run({ id: "openOfferDialog" });
    expect(openOfferDialog).toHaveBeenCalledTimes(1);
  });

  it("customer: acceptResult dispatches on ACCEPTANCE_PENDING", async () => {
    const acceptResult = vi.fn();
    const behavior = createCustomerRequestLifecycleBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
      actions: { openOfferDialog: vi.fn(), acceptResult },
    });
    expect(behavior.getViewModel().actions.map((a) => a.id)).toEqual(["acceptResult"]);
    await behavior.run({ id: "acceptResult" });
    expect(acceptResult).toHaveBeenCalledTimes(1);
  });

  it("provider: run dispatches to correct callbacks", async () => {
    const markRendered = vi.fn();
    const declineOffer = vi.fn();
    const behavior = createProviderRequestLifecycleBehavior({
      request: makeProvider({ status: "ACTIVE", offerStatus: "SELECTED" }),
      actions: {
        startWork: vi.fn(),
        markRendered,
        requestAcceptance: vi.fn(),
        complete: vi.fn(),
        declineOffer,
      },
    });
    await behavior.run({ id: "markRendered" });
    expect(markRendered).toHaveBeenCalledTimes(1);
    await behavior.run({ id: "declineOffer" });
    expect(declineOffer).toHaveBeenCalledTimes(1);
  });

  it("provider: disables markRendered when flag is set", () => {
    const behavior = createProviderRequestLifecycleBehavior({
      request: makeProvider({ status: "ACTIVE", offerStatus: "SELECTED" }),
      isMarkRenderedDisabled: true,
      actions: {
        startWork: vi.fn(),
        markRendered: vi.fn(),
        requestAcceptance: vi.fn(),
        complete: vi.fn(),
        declineOffer: vi.fn(),
      },
    });
    expect(behavior.getViewModel().actions.find((a) => a.id === "markRendered")?.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run widgets/request-lifecycle-actions/model/request-lifecycle-behavior.test.ts
```

- [ ] **Step 3: Implement behavior**

Логика `run` / `isMarkRenderedDisabled` — как в текущем `request-details-behavior.ts`, но без `bottomSlot` и без progress-полей. `getViewModel` возвращает результат `buildRequestLifecycleViewModel` (+ disable markRendered).

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && npx vitest run widgets/request-lifecycle-actions/model/request-lifecycle-behavior.test.ts
```

- [ ] **Step 5: Commit (только по просьбе пользователя)**

---

### Task 3: Lifecycle UI + public API

**Files:**
- Create: `frontend/widgets/request-lifecycle-actions/ui/RequestLifecycleActions.tsx`
- Create: `frontend/widgets/request-lifecycle-actions/index.ts`

**Interfaces:**
- Consumes: `RequestLifecycleBehavior`, `isLifecycleEmpty`
- Produces: `RequestLifecycleActions` component, barrel exports

- [ ] **Step 1: Implement UI**

```tsx
"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { isLifecycleEmpty } from "../model/request-lifecycle-model";
import type { RequestLifecycleBehavior } from "../model/request-lifecycle-behavior";

export type RequestLifecycleActionsProps = {
  behavior: RequestLifecycleBehavior;
  busy?: boolean;
};

export function RequestLifecycleActions(props: RequestLifecycleActionsProps) {
  const vm = props.behavior.getViewModel();
  if (isLifecycleEmpty(vm)) return null;

  const isBusy = Boolean(props.busy);

  return (
    <Box>
      <Stack spacing={1.5}>
        {vm.lockedAlert ? (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              "& .MuiAlert-message": { width: "100%" },
              "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
            }}
          >
            <Typography variant="body2" fontWeight={800}>
              {vm.lockedAlert.title}
            </Typography>
          </Alert>
        ) : null}

        {vm.note ? (
          <Typography variant="body2" color="text.secondary">
            {vm.note}
          </Typography>
        ) : null}

        {vm.autoAcceptAtLabel ? (
          <Typography variant="body2" color="text.secondary">
            {vm.autoAcceptAtLabel}
          </Typography>
        ) : null}

        {vm.infoRows.map((row) => (
          <Typography key={row.label} variant="body2" color="text.secondary">
            {row.label}: {row.value}
          </Typography>
        ))}

        {vm.actions.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: "flex-start" }}>
            {vm.actions.map((a) => (
              <Button
                key={a.id}
                variant={a.variant}
                color={a.color}
                disabled={isBusy || Boolean(a.disabled)}
                onClick={() => void props.behavior.run({ id: a.id })}
              >
                {a.label}
              </Button>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
```

Why: без заголовка — блок не конкурирует с «Детали»/«Прогресс»; пустой VM → `null`.

- [ ] **Step 2: Barrel**

```ts
export { RequestLifecycleActions } from "./ui/RequestLifecycleActions";
export type { RequestLifecycleActionsProps } from "./ui/RequestLifecycleActions";
export {
  createCustomerRequestLifecycleBehavior,
  createProviderRequestLifecycleBehavior,
} from "./model/request-lifecycle-behavior";
export type { RequestLifecycleBehavior } from "./model/request-lifecycle-behavior";
```

- [ ] **Step 3: Typecheck slice**

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | head -40
```

Expected: нет ошибок по `request-lifecycle-actions`

- [ ] **Step 4: Commit (только по просьбе пользователя)**

---

### Task 4: Slim `RequestDetails` to progress-only

**Files:**
- Modify: `frontend/widgets/request-details/model/request-details-model.ts`
- Modify: `frontend/widgets/request-details/model/request-details-model.test.ts`
- Modify: `frontend/widgets/request-details/model/request-details-behavior.ts`
- Modify: `frontend/widgets/request-details/model/request-details-behavior.test.ts`
- Modify: `frontend/widgets/request-details/ui/RequestDetails.tsx`
- Modify: `frontend/widgets/request-details/index.ts` (если нужно урезать экспорты)

**Interfaces:**
- Produces:
  ```ts
  export type RequestDetailsViewModel = {
    steps: StatusProgressStep[];
    activeStepId: string;
    muted: boolean;
  };

  export function buildRequestDetailsViewModel(
    input:
      | { side: "customer"; request: RequestCustomerDto; canAcceptContract: boolean }
      | { side: "provider"; request: RequestProDto },
  ): RequestDetailsViewModel;
  // canAcceptContract остаётся в input для совместимости сигнатуры screen'ов,
  // но на progress VM не влияет

  export type RequestDetailsBehavior = {
    getViewModel: () => RequestDetailsViewModel;
  };

  export function createCustomerRequestDetailsBehavior(input: {
    request: RequestCustomerDto;
    canAcceptContract: boolean;
  }): RequestDetailsBehavior;

  export function createProviderRequestDetailsBehavior(input: {
    request: RequestProDto;
  }): RequestDetailsBehavior;
  ```

- [ ] **Step 1: Rewrite model tests (progress-only)**

```ts
describe("buildRequestDetailsViewModel", () => {
  it("provider: ACTIVE maps to WORK step and muted=false", () => {
    const req = makeProvider({ status: "ACTIVE", offerStatus: "SELECTED", lockedAt: "2026-08-06T00:00:00.000Z" });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });
    expect(vm.activeStepId).toBe("WORK");
    expect(vm.muted).toBe(false);
    expect(vm.steps.length).toBeGreaterThan(0);
  });

  it("provider: locked request is muted", () => {
    const req = makeProvider({ status: "ACTIVE", isLocked: true });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });
    expect(vm.muted).toBe(true);
  });

  it("customer: ACCEPTANCE_PENDING maps to ACCEPTANCE step", () => {
    const req = makeCustomer({ status: "ACCEPTANCE_PENDING" });
    const vm = buildRequestDetailsViewModel({ side: "customer", request: req, canAcceptContract: false });
    expect(vm.activeStepId).toBe("ACCEPTANCE");
  });
});
```

Удалить ожидания по `actions` / `autoAcceptAtLabel` / `lockedAlert` из этого файла (они уже в Task 1).

- [ ] **Step 2: Slim model implementation**

Оставить только:

```ts
export function buildRequestDetailsViewModel(input: BuildRequestDetailsInput): RequestDetailsViewModel {
  const muted = input.side === "provider" ? input.request.isLocked : false;
  const steps =
    input.side === "customer"
      ? buildCustomerRequestFlowSteps(input.request)
      : buildRequestFlowSteps(input.request);
  const activeStepId =
    input.side === "customer"
      ? getCustomerRequestFlowActiveStepId(input.request)
      : getRequestFlowActiveStepId(input.request);
  return { steps, activeStepId, muted };
}
```

Удалить action types, state builders, infoRows, note, lockedAlert из этого файла.

- [ ] **Step 3: Slim behavior**

```ts
export function createCustomerRequestDetailsBehavior(input: {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
}): RequestDetailsBehavior {
  return {
    getViewModel: () =>
      buildRequestDetailsViewModel({
        side: "customer",
        request: input.request,
        canAcceptContract: input.canAcceptContract,
      }),
  };
}

export function createProviderRequestDetailsBehavior(input: {
  request: RequestProDto;
}): RequestDetailsBehavior {
  return {
    getViewModel: () => buildRequestDetailsViewModel({ side: "provider", request: input.request }),
  };
}
```

Убрать `run`, `bottomSlot`, action callbacks, `isMarkRenderedDisabled`.

- [ ] **Step 4: Rewrite behavior tests**

```ts
describe("request-details behavior", () => {
  it("customer: exposes progress view model only", () => {
    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
    });
    const vm = behavior.getViewModel();
    expect(vm.activeStepId).toBe("ACCEPTANCE");
    expect(vm.steps.length).toBeGreaterThan(0);
    expect("actions" in vm).toBe(false);
  });

  it("provider: muted when locked", () => {
    const behavior = createProviderRequestDetailsBehavior({
      request: makeProvider({ status: "ACTIVE", isLocked: true }),
    });
    expect(behavior.getViewModel().muted).toBe(true);
  });
});
```

- [ ] **Step 5: Slim UI**

`RequestDetails.tsx` оставить только:

- заголовок «Детали»
- `StatusProgressViewToggle`
- list/stepper с `vm.steps` / `vm.activeStepId` / `vm.muted`

Удалить Alert, note, infoRows, actions, bottomSlot, `runAction`.

- [ ] **Step 6: Run all request-details + lifecycle tests**

```bash
cd frontend && npx vitest run widgets/request-details widgets/request-lifecycle-actions
```

Expected: PASS

- [ ] **Step 7: Commit (только по просьбе пользователя)**

---

### Task 5: Header slot `afterBody` + wire screens

**Files:**
- Modify: `frontend/shared/ui/RequestDetailHeaderCard.tsx`
- Modify: `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx`
- Modify: `frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx`

**Interfaces:**
- Consumes: `RequestLifecycleActions`, lifecycle behavior factories
- Produces: header с `afterBody?: ReactNode` после `body`

- [ ] **Step 1: Extend header card**

В `RequestDetailHeaderCardProps` добавить `afterBody?: ReactNode`.

В JSX после `{body ? <Paper>...</Paper> : null}`:

```tsx
{afterBody ? <Box>{afterBody}</Box> : null}
```

Порядок уже гарантирует: без body lifecycle идёт сразу после details.

- [ ] **Step 2: Wire provider screen**

В `ProRequestDetails.tsx`:

```tsx
import {
  createProviderRequestLifecycleBehavior,
  RequestLifecycleActions,
} from "@/widgets/request-lifecycle-actions";

// RequestDetailHeaderCard:
details={
  <RequestDetails
    busy={isBusy}
    behavior={createProviderRequestDetailsBehavior({ request: req })}
  />
}
afterBody={
  <RequestLifecycleActions
    busy={isBusy}
    behavior={createProviderRequestLifecycleBehavior({
      request: req,
      isMarkRenderedDisabled: remarks.some((r) => r.status === "OPEN"),
      actions: {
        startWork: async () => undefined,
        markRendered: async () => { /* тот же confirm + runAction("confirm") что сейчас */ },
        requestAcceptance: async () => undefined,
        complete: () => runAction("confirm"),
        declineOffer: async () => { /* тот же confirmWithReason + runAction("decline") */ },
      },
    })}
  />
}
```

Убрать `bottomSlot` и action callbacks из `createProviderRequestDetailsBehavior`.

- [ ] **Step 3: Wire customer screen**

В `CustomerRequestConversationWorkspace.tsx` аналогично:

```tsx
details={
  <RequestDetails
    busy={busy}
    behavior={createCustomerRequestDetailsBehavior({
      request: req,
      canAcceptContract,
    })}
  />
}
afterBody={
  <RequestLifecycleActions
    busy={busy}
    behavior={createCustomerRequestLifecycleBehavior({
      request: req,
      canAcceptContract,
      actions: {
        openOfferDialog: openContractDialog,
        acceptResult,
      },
    })}
  />
}
```

- [ ] **Step 4: Verify tests + lint touched files**

```bash
cd frontend && npx vitest run widgets/request-details widgets/request-lifecycle-actions
cd frontend && npx eslint \
  widgets/request-lifecycle-actions \
  widgets/request-details \
  shared/ui/RequestDetailHeaderCard.tsx \
  widgets/pro-requests/ui/ProRequestDetails.tsx \
  widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx
```

Expected: tests PASS, eslint без новых ошибок.

- [ ] **Step 5: Manual smoke (dev servers уже запущены)**

Проверить `/pro/requests/{id}` и `/profile/requests/{id}`:

1. «Детали» = только линия прогресса (+ toggle)
2. Под описанием — «Диалогов» / note / кнопки (если применимо)
3. Без текста заявки — lifecycle сразу под stepper
4. Кнопка «Услуга выполнена» / «Принять результат» / «Отказаться» работает как раньше
5. Блок «Прогресс» на месте ниже шапки

- [ ] **Step 6: Commit (только по просьбе пользователя)**

```bash
git add frontend/widgets/request-lifecycle-actions \
  frontend/widgets/request-details \
  frontend/shared/ui/RequestDetailHeaderCard.tsx \
  frontend/widgets/pro-requests/ui/ProRequestDetails.tsx \
  frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx \
  docs/superpowers/plans/2026-08-07-request-details-progress-only.md
git commit -m "$(cat <<'EOF'
feat(frontend): «Детали» только прогресс, lifecycle под описанием

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Details = только progress UI | Task 4 |
| Actions/meta под описанием | Task 3, 5 |
| Fallback без body | Task 5 (`afterBody` после optional body) |
| Empty lifecycle hidden | Task 1 `isLifecycleEmpty`, Task 3 |
| No lifecycle title | Task 3 |
| Customer + provider same layout | Task 5 |
| Action ids unchanged | Task 1–2 |
| `isMarkRenderedDisabled` | Task 2, 5 |
| Unit tests moved/updated | Task 1, 2, 4 |
| No backend changes | — (global) |

## Self-review notes

- Placeholders: none
- FSD: lifecycle types не импортируются из `request-details` (одностороннего cross-import нет)
- `canAcceptContract` остаётся в progress behavior input для минимального diff screen'ов, на VM не влияет
- Confirm-флоу остаётся в screen-контейнерах — behavior только вызывает переданные callbacks
