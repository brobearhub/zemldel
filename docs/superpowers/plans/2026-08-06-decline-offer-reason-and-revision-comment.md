# Decline Offer Reason + Revision Comment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать комментарий «на доработку» заметнее и добавить отказ исполнителя с обязательной причиной + сообщением в чат.

**Architecture:** Backend атомарно валидирует `reason`, отклоняет оффер и пишет сообщение в существующий conversation. Frontend расширяет shared confirm полем причины и шлёт body через BFF.

**Tech Stack:** NestJS + Prisma, Next.js BFF, MUI ConfirmProvider, Vitest

## Global Constraints

- Шаблон сообщения: `Исполнитель отказался от выполнения заявки по причине: "Текст причины"`
- Причина обязательна (trim не пустой)
- Без conversation — decline ok, message не создаём
- Кнопка: «Отказаться от заявки»; confirm: «Да, отказаться»
- Revision comment: `body1` + `text.primary` + `fontWeight={600}`

---

### Task 1: Backend decline with reason

**Files:**
- Create: `backend/src/requests/dto/decline-offer.dto.ts`
- Create: `backend/src/requests/requests.decline-offer.spec.ts`
- Modify: `backend/src/requests/requests.service.ts` (`declineOfferByProvider`)
- Modify: `backend/src/requests/requests.controller.ts` (`proDeclineOffer`)

- [x] Implement + tests (inline execution)

### Task 2: Frontend confirm + wiring

**Files:**
- Modify: `frontend/shared/ui/confirm/*`
- Modify: `frontend/widgets/request-details/model/request-details-model.ts`
- Modify: `frontend/widgets/pro-requests/ui/ProRequestDetails.tsx`
- Modify: `frontend/app/api/pro/requests/[id]/decline-offer/route.ts`

- [x] Implement (inline execution)

### Task 3: Revision comment + docs

**Files:**
- Modify: `frontend/entities/request/ui/ContractFilesList.tsx`
- Modify: `docs/business-logic.md`

- [x] Implement (inline execution)
