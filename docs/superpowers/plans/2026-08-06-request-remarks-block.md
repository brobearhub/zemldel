# Request Remarks Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести блок «Замечания» из `RequestDetails` в общий widget `request-remarks` и показать его отдельной секцией между «Детали» и «Документы» на customer/pro страницах заявки.

**Architecture:** Новый FSD widget-slice с UI + behavior (Strategy для customer/provider). Screen-контейнеры по-прежнему владеют fetch/mutations через `/api/...` и `entities/request/api/request-remarks`. `RequestDetails` остаётся только lifecycle/stepper/actions без remarks.

**Tech Stack:** Next.js App Router, React, MUI, Vitest, TypeScript, FSD.

## Global Constraints

- Спека: `docs/superpowers/specs/2026-08-06-request-remarks-block-design.md`
- Порядок секций: Детали → Замечания → Документы
- «Отправить замечания» только в блоке «Замечания»
- Правила show/canAdd/canComplete/highlight без изменения продукта
- Entity API / BFF / backend не менять
- Коммиты — только если пользователь явно попросил; иначе пропускать commit-шаги
- Язык коммитов/комментариев — русский; идентификаторы — английский
- Без `any` без обоснования; публичные контракты DTO/API не ломать

## File map

| Path | Responsibility |
|------|----------------|
| Create `frontend/widgets/request-remarks/model/request-remarks-behavior.ts` | View-model + run для remarks |
| Create `frontend/widgets/request-remarks/model/request-remarks-behavior.test.ts` | Юнит-тесты behavior |
| Create `frontend/widgets/request-remarks/ui/RequestRemarks.tsx` | UI секции «Замечания» |
| Create `frontend/widgets/request-remarks/index.ts` | Public API slice |
| Modify `frontend/widgets/request-details/model/request-details-model.ts` | Убрать `sendRemarks` / remark action ids из details |
| Modify `frontend/widgets/request-details/model/request-details-behavior.ts` | Убрать remarksSection и remark callbacks |
| Modify `frontend/widgets/request-details/ui/RequestDetails.tsx` | Убрать nested remarks UI |
| Modify `frontend/widgets/request-details/model/request-details-*.test.ts` | Актуальные ожидания без remarks |
| Modify `frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx` | Подключить `RequestRemarks` |
| Modify `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx` | Подключить `RequestRemarks` |

---

### Task 1: Behavior `request-remarks` (TDD)

**Files:**
- Create: `frontend/widgets/request-remarks/model/request-remarks-behavior.ts`
- Create: `frontend/widgets/request-remarks/model/request-remarks-behavior.test.ts`
- Create: `frontend/widgets/request-remarks/index.ts` (partial export ok)

**Interfaces:**
- Consumes: `RequestCustomerDto`, `RequestProDto`, `RequestRemarkDto` from `@/entities/request`
- Produces:
  - `RequestRemarksBehavior` with `getViewModel()` / `run({ id, payload? })`
  - `createCustomerRequestRemarksBehavior(input)`
  - `createProviderRequestRemarksBehavior(input)`
  - View-model shape:
    ```ts
    type RequestRemarksViewModel = {
      canAdd: boolean;
      canSendRemarks: boolean; // customer only; button visible when true path applies
      sendRemarksDisabled: boolean;
      items: Array<{
        id: string;
        text: string;
        status: RequestRemarkDto["status"];
        meta: string;
        canComplete: boolean;
        highlightAsIncoming: boolean;
      }>;
    };
    // getViewModel returns RequestRemarksViewModel | null (null = don't render section)
    ```

- [ ] **Step 1: Write failing tests**

Создать `frontend/widgets/request-remarks/model/request-remarks-behavior.test.ts`:

```ts
import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import {
  createCustomerRequestRemarksBehavior,
  createProviderRequestRemarksBehavior,
} from "./request-remarks-behavior";
import { vi } from "vitest";

function makeCustomer(overrides: Partial<RequestCustomerDto> = {}): RequestCustomerDto {
  return {
    id: "r1",
    subjectType: "FREEFORM" satisfies RequestSubjectType,
    status: "NEW" satisfies RequestStatus,
    serviceId: null,
    categoryId: null,
    message: null,
    location: null,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    selectedProviderIds: [],
    declinedProviderIds: [],
    lastSelectionAt: null,
    offers: [],
    requestCityId: null,
    lockedAt: null,
    serviceTitle: null,
    providerName: null,
    customerName: null,
    customerEmail: null,
    customerUserId: "u1",
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

function makeProvider(overrides: Partial<RequestProDto> = {}): RequestProDto {
  return {
    id: "r1",
    subjectType: "FREEFORM" satisfies RequestSubjectType,
    serviceId: null,
    serviceTitle: null,
    categoryId: null,
    categoryName: null,
    message: null,
    location: null,
    status: "NEW" satisfies RequestStatus,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    offerStatus: null,
    offerSelectedAt: null,
    offerDeclinedAt: null,
    requestCityId: null,
    lockedAt: null,
    conversationsCount: 0,
    isLocked: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("request-remarks behavior", () => {
  it("hides section when status is not acceptance/work and there are no remarks", () => {
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "CONTRACT_ACCEPTED" }),
      remarks: [],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    expect(behavior.getViewModel()).toBeNull();
  });

  it("shows section on ACCEPTANCE_PENDING with canAdd and sendRemarks controls", () => {
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const vm = behavior.getViewModel();
    expect(vm).not.toBeNull();
    expect(vm?.canAdd).toBe(true);
    expect(vm?.canSendRemarks).toBe(true);
    expect(vm?.sendRemarksDisabled).toBe(true);
    expect(vm?.items).toEqual([]);
  });

  it("enables sendRemarks when there is OPEN customer remark", () => {
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [
        {
          id: "rm1",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте X",
          createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
          doneAt: null,
        },
      ],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    expect(behavior.getViewModel()?.sendRemarksDisabled).toBe(false);
  });

  it("customer: remarkAdd uses payload.text; sendRemarks dispatches", async () => {
    const sendRemarks = vi.fn();
    const remarkAdd = vi.fn();
    const remarkComplete = vi.fn();
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [],
      actions: { sendRemarks, remarkAdd, remarkComplete },
    });

    await behavior.run({ id: "remarkAdd", payload: { text: " test " } });
    expect(remarkAdd).toHaveBeenCalledWith(" test ");

    await behavior.run({ id: "sendRemarks" });
    expect(sendRemarks).toHaveBeenCalledTimes(1);
  });

  it("exposes canAdd/canComplete/highlight rules", () => {
    const customerBehavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [
        {
          id: "rm1",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте X",
          createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
          doneAt: null,
        },
        {
          id: "rm2",
          requestId: "r1",
          authorSide: "PROVIDER",
          status: "OPEN",
          text: "Нужны данные Y",
          createdAt: new Date("2026-01-01T10:01:00.000Z").toISOString(),
          doneAt: null,
        },
      ],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const customerVm = customerBehavior.getViewModel();
    expect(customerVm?.canAdd).toBe(true);
    expect(customerVm?.items.some((x) => x.canComplete)).toBe(false);
    expect(customerVm?.items.find((x) => x.id === "rm1")?.highlightAsIncoming).toBe(false);
    expect(customerVm?.items.find((x) => x.id === "rm2")?.highlightAsIncoming).toBe(true);

    const providerBehavior = createProviderRequestRemarksBehavior({
      request: makeProvider({ status: "ACTIVE" }),
      remarks: [
        {
          id: "rm3",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте Z",
          createdAt: new Date("2026-01-01T10:02:00.000Z").toISOString(),
          doneAt: null,
        },
        {
          id: "rm4",
          requestId: "r1",
          authorSide: "PROVIDER",
          status: "OPEN",
          text: "От себя",
          createdAt: new Date("2026-01-01T10:03:00.000Z").toISOString(),
          doneAt: null,
        },
      ],
      actions: { remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const providerVm = providerBehavior.getViewModel();
    expect(providerVm?.canAdd).toBe(false);
    expect(providerVm?.canSendRemarks).toBe(false);
    expect(providerVm?.items[0]?.canComplete).toBe(true);
    expect(providerVm?.items.find((x) => x.id === "rm3")?.highlightAsIncoming).toBe(true);
    expect(providerVm?.items.find((x) => x.id === "rm4")?.highlightAsIncoming).toBe(false);
  });

  it("provider: remarkComplete uses payload.remarkId", async () => {
    const remarkComplete = vi.fn();
    const behavior = createProviderRequestRemarksBehavior({
      request: makeProvider({ status: "ACTIVE" }),
      remarks: [],
      actions: { remarkAdd: vi.fn(), remarkComplete },
    });
    await behavior.run({ id: "remarkComplete", payload: { remarkId: "rm3" } });
    expect(remarkComplete).toHaveBeenCalledWith("rm3");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npm test -- widgets/request-remarks/model/request-remarks-behavior.test.ts
```

Expected: FAIL (module/export not found).

- [ ] **Step 3: Implement behavior**

Создать `frontend/widgets/request-remarks/model/request-remarks-behavior.ts`:

```ts
import type { RequestCustomerDto, RequestProDto, RequestRemarkDto } from "@/entities/request";

export type RequestRemarksActionId = "sendRemarks" | "remarkAdd" | "remarkComplete";

export type RequestRemarksItemViewModel = {
  id: string;
  text: string;
  status: RequestRemarkDto["status"];
  meta: string;
  canComplete: boolean;
  /** Чужое замечание для текущей стороны — подсвечиваем title цветом info. */
  highlightAsIncoming: boolean;
};

export type RequestRemarksViewModel = {
  canAdd: boolean;
  canSendRemarks: boolean;
  sendRemarksDisabled: boolean;
  items: RequestRemarksItemViewModel[];
};

export type RequestRemarksBehavior = {
  getViewModel: () => RequestRemarksViewModel | null;
  run: (action: { id: string; payload?: unknown }) => Promise<void> | void;
};

export type CreateCustomerRequestRemarksBehaviorInput = {
  request: RequestCustomerDto;
  remarks: RequestRemarkDto[];
  actions: {
    sendRemarks: () => Promise<void> | void;
    remarkAdd: (text: string) => Promise<void> | void;
    remarkComplete: (remarkId: string) => Promise<void> | void;
  };
};

export type CreateProviderRequestRemarksBehaviorInput = {
  request: RequestProDto;
  remarks: RequestRemarkDto[];
  actions: {
    remarkAdd: (text: string) => Promise<void> | void;
    remarkComplete: (remarkId: string) => Promise<void> | void;
  };
};

function shouldShowRemarksSection(status: RequestCustomerDto["status"], remarksCount: number) {
  return status === "ACCEPTANCE_PENDING" || status === "ACTIVE" || remarksCount > 0;
}

function isRemarksActionId(value: string): value is RequestRemarksActionId {
  return value === "sendRemarks" || value === "remarkAdd" || value === "remarkComplete";
}

function readTextPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const text = (payload as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

function readRemarkIdPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const remarkId = (payload as { remarkId?: unknown }).remarkId;
  return typeof remarkId === "string" ? remarkId : "";
}

function formatRemarkMeta(r: RequestRemarkDto) {
  const side = r.authorSide === "CUSTOMER" ? "От заказчика" : "От исполнителя";
  return `${side} · ${new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(r.createdAt))}`;
}

function mapItems(args: {
  remarks: RequestRemarkDto[];
  canComplete: boolean;
  completeAuthorSide: RequestRemarkDto["authorSide"];
  incomingAuthorSide: RequestRemarkDto["authorSide"];
}): RequestRemarksItemViewModel[] {
  return args.remarks.map((r) => ({
    id: r.id,
    text: r.text,
    status: r.status,
    meta: formatRemarkMeta(r),
    canComplete: args.canComplete && r.status === "OPEN" && r.authorSide === args.completeAuthorSide,
    highlightAsIncoming: r.authorSide === args.incomingAuthorSide,
  }));
}

export function createCustomerRequestRemarksBehavior(
  input: CreateCustomerRequestRemarksBehaviorInput
): RequestRemarksBehavior {
  return {
    getViewModel: () => {
      if (!shouldShowRemarksSection(input.request.status, input.remarks.length)) return null;
      const canAdd = input.request.status === "ACCEPTANCE_PENDING";
      const canComplete = input.request.status === "ACTIVE";
      const canSendRemarks = input.request.status === "ACCEPTANCE_PENDING";
      const hasOpenCustomerRemarks = input.remarks.some((r) => r.status === "OPEN" && r.authorSide === "CUSTOMER");
      return {
        canAdd,
        canSendRemarks,
        sendRemarksDisabled: !hasOpenCustomerRemarks,
        items: mapItems({
          remarks: input.remarks,
          canComplete,
          completeAuthorSide: "PROVIDER",
          incomingAuthorSide: "PROVIDER",
        }),
      };
    },
    run: async ({ id, payload }) => {
      if (!isRemarksActionId(id)) return;
      if (id === "sendRemarks") {
        await input.actions.sendRemarks();
        return;
      }
      if (id === "remarkAdd") {
        await input.actions.remarkAdd(readTextPayload(payload));
        return;
      }
      if (id === "remarkComplete") {
        await input.actions.remarkComplete(readRemarkIdPayload(payload));
      }
    },
  };
}

export function createProviderRequestRemarksBehavior(
  input: CreateProviderRequestRemarksBehaviorInput
): RequestRemarksBehavior {
  return {
    getViewModel: () => {
      if (!shouldShowRemarksSection(input.request.status, input.remarks.length)) return null;
      const canAdd = input.request.status === "ACCEPTANCE_PENDING";
      const canComplete = input.request.status === "ACTIVE";
      return {
        canAdd,
        canSendRemarks: false,
        sendRemarksDisabled: true,
        items: mapItems({
          remarks: input.remarks,
          canComplete,
          completeAuthorSide: "CUSTOMER",
          incomingAuthorSide: "CUSTOMER",
        }),
      };
    },
    run: async ({ id, payload }) => {
      if (!isRemarksActionId(id)) return;
      if (id === "remarkAdd") {
        await input.actions.remarkAdd(readTextPayload(payload));
        return;
      }
      if (id === "remarkComplete") {
        await input.actions.remarkComplete(readRemarkIdPayload(payload));
      }
    },
  };
}
```

Создать `frontend/widgets/request-remarks/index.ts`:

```ts
export { RequestRemarks } from "./ui/RequestRemarks";
export type { RequestRemarksProps } from "./ui/RequestRemarks";
export {
  createCustomerRequestRemarksBehavior,
  createProviderRequestRemarksBehavior,
} from "./model/request-remarks-behavior";
export type {
  RequestRemarksBehavior,
  RequestRemarksViewModel,
} from "./model/request-remarks-behavior";
```

Пока `RequestRemarks.tsx` ещё нет — в Step 3 экспортировать только model из `index.ts`, UI-export добавить в Task 2. Временный `index.ts`:

```ts
export {
  createCustomerRequestRemarksBehavior,
  createProviderRequestRemarksBehavior,
} from "./model/request-remarks-behavior";
export type {
  RequestRemarksBehavior,
  RequestRemarksViewModel,
} from "./model/request-remarks-behavior";
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend && npm test -- widgets/request-remarks/model/request-remarks-behavior.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit (только по явной просьбе пользователя)**

```bash
git add frontend/widgets/request-remarks docs/superpowers/specs/2026-08-06-request-remarks-block-design.md docs/superpowers/plans/2026-08-06-request-remarks-block.md
git commit -m "$(cat <<'EOF'
feat(frontend): добавить behavior виджета замечаний заявки

EOF
)"
```

---

### Task 2: UI `RequestRemarks`

**Files:**
- Create: `frontend/widgets/request-remarks/ui/RequestRemarks.tsx`
- Modify: `frontend/widgets/request-remarks/index.ts`

**Interfaces:**
- Consumes: `RequestRemarksBehavior` from Task 1
- Produces: `RequestRemarks({ behavior, busy?: boolean })`

- [ ] **Step 1: Implement UI**

`frontend/widgets/request-remarks/ui/RequestRemarks.tsx` — перенести remarks-блок из `RequestDetails` в отдельный `Paper`, добавить кнопку sendRemarks:

```tsx
"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { RequestRemarksBehavior, RequestRemarksViewModel } from "../model/request-remarks-behavior";

export type RequestRemarksProps = {
  behavior: RequestRemarksBehavior;
  busy?: boolean;
};

export function RequestRemarks(props: RequestRemarksProps) {
  const [newRemarkText, setNewRemarkText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [remarksBusy, setRemarksBusy] = useState(false);

  const vm: RequestRemarksViewModel | null = props.behavior.getViewModel();
  if (!vm) return null;

  const isBusy = Boolean(props.busy) || remarksBusy;

  async function runAction(actionId: string, payload?: unknown) {
    await props.behavior.run({ id: actionId, payload });
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" fontWeight={800}>
            Замечания
          </Typography>
          {vm.canAdd ? (
            <Button size="small" variant="outlined" disabled={isBusy} onClick={() => setAddOpen((v) => !v)}>
              {addOpen ? "Скрыть" : "Добавить"}
            </Button>
          ) : null}
        </Stack>

        {addOpen && vm.canAdd ? (
          <Stack spacing={1}>
            <TextField
              label="Новое замечание"
              value={newRemarkText}
              onChange={(e) => setNewRemarkText(e.target.value)}
              minRows={2}
              multiline
              disabled={isBusy}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: "flex-start" }}>
              <Button
                variant="contained"
                disabled={isBusy || newRemarkText.trim().length < 3}
                onClick={async () => {
                  setRemarksBusy(true);
                  try {
                    await runAction("remarkAdd", { text: newRemarkText.trim() });
                    setNewRemarkText("");
                    setAddOpen(false);
                  } finally {
                    setRemarksBusy(false);
                  }
                }}
              >
                Добавить замечание
              </Button>
              <Button variant="text" disabled={isBusy} onClick={() => setAddOpen(false)}>
                Отмена
              </Button>
            </Stack>
          </Stack>
        ) : null}

        <Divider />

        {vm.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Пока нет замечаний.
          </Typography>
        ) : (
          <List dense disablePadding>
            {vm.items.map((item) => {
              const checked = item.status === "DONE";
              const canToggle = item.canComplete && item.status === "OPEN" && !isBusy;
              return (
                <ListItem key={item.id} disableGutters disablePadding>
                  <ListItemButton
                    disabled={!canToggle}
                    onClick={async () => {
                      if (!canToggle) return;
                      setRemarksBusy(true);
                      try {
                        await runAction("remarkComplete", { remarkId: item.id });
                      } finally {
                        setRemarksBusy(false);
                      }
                    }}
                    sx={{
                      py: 0.5,
                      "&.Mui-disabled": { opacity: 1 },
                    }}
                  >
                    <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: checked ? "line-through" : "none",
                            color: checked
                              ? "text.secondary"
                              : item.highlightAsIncoming
                                ? "info.main"
                                : "text.primary",
                            fontWeight: checked ? 600 : 700,
                          }}
                        >
                          {item.text}
                        </Typography>
                      }
                      secondary={item.meta}
                      secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}

        {vm.canSendRemarks ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5, alignSelf: "flex-start" }}>
            <Button
              variant="outlined"
              color="warning"
              disabled={isBusy || vm.sendRemarksDisabled}
              onClick={() => void runAction("sendRemarks")}
            >
              Отправить замечания
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
```

Обновить `index.ts` — полный public API (как в File map).

- [ ] **Step 2: Typecheck sanity**

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | head -n 40
```

Expected: нет ошибок по `request-remarks` (остальные pre-existing ок игнорировать, если не связаны).

- [ ] **Step 3: Commit (только по просьбе)**

```bash
git add frontend/widgets/request-remarks
git commit -m "$(cat <<'EOF'
feat(frontend): UI блока замечаний заявки

EOF
)"
```

---

### Task 3: Очистить `request-details` от remarks

**Files:**
- Modify: `frontend/widgets/request-details/model/request-details-model.ts`
- Modify: `frontend/widgets/request-details/model/request-details-behavior.ts`
- Modify: `frontend/widgets/request-details/ui/RequestDetails.tsx`
- Modify: `frontend/widgets/request-details/model/request-details-model.test.ts`
- Modify: `frontend/widgets/request-details/model/request-details-behavior.test.ts`
- Modify: `frontend/widgets/request-details/index.ts` (если экспортировал remarks-типы — убрать)

**Interfaces:**
- Consumes: без remarks
- Produces: details behavior без `remarks` / `sendRemarks` / `remarkAdd` / `remarkComplete`

- [ ] **Step 1: Update failing expectations in tests first**

В `request-details-model.test.ts` заменить кейс:

```ts
it("customer: shows acceptance action on ACCEPTANCE_PENDING", () => {
  const req = makeCustomer({
    status: "ACCEPTANCE_PENDING",
    autoAcceptAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
  });
  const vm = buildRequestDetailsViewModel({ side: "customer", request: req, canAcceptContract: false });

  expect(vm.actions.map((a) => a.id)).toEqual(["acceptResult"]);
  expect(vm.autoAcceptAtLabel?.startsWith("Автопринятие:")).toBe(true);
});
```

В `request-details-behavior.test.ts` оставить только non-remarks кейсы и убрать remarks из input:

```ts
describe("request-details behavior", () => {
  it("customer: getViewModel exposes actions and run dispatches callbacks", async () => {
    const openOfferDialog = vi.fn();
    const acceptResult = vi.fn();

    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "PROVIDER_SELECTED" }),
      canAcceptContract: true,
      actions: { openOfferDialog, acceptResult },
    });

    const vm = behavior.getViewModel();
    expect(vm.actions.map((a) => a.id)).toEqual(["openOfferDialog"]);

    await behavior.run({ id: "openOfferDialog" });
    expect(openOfferDialog).toHaveBeenCalledTimes(1);
  });

  it("customer: acceptResult dispatches on ACCEPTANCE_PENDING", async () => {
    const acceptResult = vi.fn();
    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
      actions: { openOfferDialog: vi.fn(), acceptResult },
    });

    expect(behavior.getViewModel().actions.map((a) => a.id)).toEqual(["acceptResult"]);
    await behavior.run({ id: "acceptResult" });
    expect(acceptResult).toHaveBeenCalledTimes(1);
  });

  it("provider: run dispatches to correct callbacks", async () => {
    const startWork = vi.fn();
    const markRendered = vi.fn();
    const requestAcceptance = vi.fn();
    const complete = vi.fn();
    const declineOffer = vi.fn();

    const behavior = createProviderRequestDetailsBehavior({
      request: makeProvider({ status: "ACTIVE", offerStatus: "SELECTED" }),
      actions: { startWork, markRendered, requestAcceptance, complete, declineOffer },
    });

    await behavior.run({ id: "markRendered" });
    expect(markRendered).toHaveBeenCalledTimes(1);

    await behavior.run({ id: "declineOffer" });
    expect(declineOffer).toHaveBeenCalledTimes(1);
  });
});
```

Удалить все remarks-тесты из этого файла (они уже в Task 1).

- [ ] **Step 2: Run details tests — expect FAIL**

```bash
cd frontend && npm test -- widgets/request-details/model
```

Expected: FAIL на старых сигнатурах / `sendRemarks` в actions.

- [ ] **Step 3: Strip model**

В `request-details-model.ts`:

1. Из `RequestDetailsActionId` удалить `"sendRemarks" | "remarkAdd" | "remarkComplete"`.
2. В `ACCEPTANCE` customer actions оставить только:

```ts
actions:
  request.status === "ACCEPTANCE_PENDING"
    ? [{ id: "acceptResult", label: "Принять результат", variant: "contained", color: "success" }]
    : [],
```

- [ ] **Step 4: Strip behavior**

Переписать `request-details-behavior.ts` без remarks:

- убрать типы `RequestDetailsRemarkItemViewModel`, `RequestDetailsRemarksSectionViewModel`
- из `RequestDetailsBehaviorViewModel` убрать `remarksSection`
- из customer/provider input убрать `remarks` и remark/sendRemarks actions
- `isRequestDetailsActionId` без remark ids
- `getViewModel` возвращает только details fields + actions/bottomSlot
- `run` без remark/sendRemarks веток
- удалить helpers `shouldShowRemarksSection`, `formatRemarkMeta`, `readTextPayload`, `readRemarkIdPayload` если больше не нужны

Итоговый customer input:

```ts
export type CreateCustomerRequestDetailsBehaviorInput = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
  bottomSlot?: ReactNode;
  actions: {
    openOfferDialog: () => void;
    acceptResult: () => Promise<void> | void;
  };
};
```

Provider input:

```ts
export type CreateProviderRequestDetailsBehaviorInput = {
  request: RequestProDto;
  bottomSlot?: ReactNode;
  actions: {
    startWork: () => Promise<void> | void;
    markRendered: () => Promise<void> | void;
    requestAcceptance: () => Promise<void> | void;
    complete: () => Promise<void> | void;
    declineOffer: () => Promise<void> | void;
  };
};
```

- [ ] **Step 5: Strip UI**

В `RequestDetails.tsx`:

- удалить state `newRemarkText`, `addOpen`, `remarksBusy`
- `isBusy = Boolean(props.busy)`
- удалить весь блок `{vm.remarksSection ? (... ) : null}`
- удалить неиспользуемые MUI-импорты (`Checkbox`, `Divider`, `List`, `ListItem`, `ListItemButton`, `ListItemText`, `TextField` — если больше не нужны)

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd frontend && npm test -- widgets/request-details/model widgets/request-remarks/model
```

Expected: PASS.

- [ ] **Step 7: Commit (только по просьбе)**

```bash
git add frontend/widgets/request-details
git commit -m "$(cat <<'EOF'
refactor(frontend): убрать замечания из RequestDetails

EOF
)"
```

---

### Task 4: Подключить на customer-экране

**Files:**
- Modify: `frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx`

**Interfaces:**
- Consumes: `RequestRemarks`, `createCustomerRequestRemarksBehavior`
- Produces: порядок Header → alerts → `RequestDetails` → `RequestRemarks` → `CustomerRequestDocumentsSection` → chats

- [ ] **Step 1: Wire component**

1. Импорт:

```ts
import {
  createCustomerRequestRemarksBehavior,
  RequestRemarks,
} from "@/widgets/request-remarks";
```

2. Упростить `createCustomerRequestDetailsBehavior` input — убрать `remarks`, `sendRemarks`, `remarkAdd`, `remarkComplete` из actions.

3. Сразу после `<RequestDetails ... />` добавить:

```tsx
<RequestRemarks
  busy={busy}
  behavior={createCustomerRequestRemarksBehavior({
    request: req,
    remarks,
    actions: {
      sendRemarks,
      remarkAdd,
      remarkComplete,
    },
  })}
/>
```

Функции `sendRemarks` / `remarkAdd` / `remarkComplete` / `loadRemarks` оставить в контейнере без изменений логики.

- [ ] **Step 2: Manual check**

Открыть `/profile/requests/<id>` в статусе с замечаниями / ACTIVE / ACCEPTANCE_PENDING.

Expected:
- «Замечания» отдельным блоком между «Детали» и «Документы»
- в «Детали» nested remarks нет
- на ACCEPTANCE_PENDING кнопка «Отправить замечания» в блоке «Замечания», «Принять результат» в «Детали»

- [ ] **Step 3: Commit (только по просьбе)**

```bash
git add frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): отдельный блок замечаний на странице заявки customer

EOF
)"
```

---

### Task 5: Подключить на pro-экране

**Files:**
- Modify: `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx`

**Interfaces:**
- Consumes: `RequestRemarks`, `createProviderRequestRemarksBehavior`
- Produces: порядок Header → alerts → `RequestDetails` → `RequestRemarks` → `ProRequestDocumentsSection` → reminders

- [ ] **Step 1: Wire component**

1. Импорт из `@/widgets/request-remarks`.

2. Упростить `createProviderRequestDetailsBehavior` — убрать `remarks`, `remarkAdd`, `remarkComplete`.

3. После `RequestDetails`:

```tsx
<RequestRemarks
  busy={isBusy}
  behavior={createProviderRequestRemarksBehavior({
    request: req,
    remarks,
    actions: {
      remarkAdd,
      remarkComplete,
    },
  })}
/>
```

- [ ] **Step 2: Manual check**

Открыть `/pro/requests/<id>` со статусом ACTIVE / ACCEPTANCE_PENDING.

Expected: отдельный блок «Замечания» между «Детали» и «Документы»; lifecycle-кнопки остаются в «Детали».

- [ ] **Step 3: Commit (только по просьбе)**

```bash
git add frontend/widgets/pro-requests/ui/ProRequestDetails.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): отдельный блок замечаний на странице заявки pro

EOF
)"
```

---

### Task 6: Финальная верификация

**Files:** нет новых

- [ ] **Step 1: Run related unit tests**

```bash
cd frontend && npm test -- widgets/request-remarks widgets/request-details/model
```

Expected: all PASS.

- [ ] **Step 2: Lint touched files (optional sanity)**

```bash
cd frontend && npx eslint widgets/request-remarks widgets/request-details widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx widgets/pro-requests/ui/ProRequestDetails.tsx
```

Expected: no new errors.

- [ ] **Step 3: Spec DoD checklist**

Отметить в спеке / подтвердить:

- [x] есть `widgets/request-remarks`
- [x] remarks не внутри «Детали»
- [x] порядок Детали → Замечания → Документы
- [x] «Отправить замечания» только в remarks
- [x] поведение без регрессий
- [x] тесты зелёные

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Новый widget `request-remarks` | 1–2 |
| Убрать remarks из `RequestDetails` | 3 |
| Порядок Детали → Замечания → Документы | 4–5 |
| sendRemarks в remarks | 1–2, 4 |
| Правила show/canAdd/canComplete | 1 |
| API/BFF без изменений | соблюдено (нет задач на API) |
| Тесты перенесены/обновлены | 1, 3, 6 |

Placeholder scan: нет TBD/TODO.  
Type consistency: `canSendRemarks` / `sendRemarksDisabled` / `getViewModel(): null` согласованы между Task 1 и Task 2.
