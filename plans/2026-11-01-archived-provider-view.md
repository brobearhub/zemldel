---
name: Archived provider view
overview: "Исправить критическую регрессию экрана невыбранного FREEFORM-исполнителя: оставить только базовый read-only контекст и архивный чат, скрыть workflow/отзывы и закрыть серверные операции сделки. Визуальный composer архива, stale remark и невоспроизводимый переход панели оплаты остаются вне выбранного scope."
todos:
  - id: archive-contract
    content: Уточнить бизнес-контракт базовой карточки и архивного чата невыбранного provider.
    status: pending
  - id: backend-access
    content: Закрыть remarks/cadastral атомарными проверками providerId внутри транзакций и подтвердить access-control тестами.
    status: pending
  - id: archived-screen
    content: Добавить archived screen model и исключить workflow/review запросы и действия из ProRequestDetails.
    status: pending
  - id: regression
    content: Запустить автоматические проверки и повторить ACTIVE/COMPLETED сценарии невыбранного provider.
    status: pending
isProject: true
---

# План исправления archived provider view

## Вывод анализа
- [`RequestProDto.isLocked`](../frontend/entities/request/dto/request.dto.ts) уже означает, что FREEFORM-заявка закреплена за другим provider; новый статус или capability framework не нужен.
- Чат корректно работает как read-only архив, но [`ProRequestDetails`](../frontend/widgets/pro-requests/ui/ProRequestDetails.tsx) продолжает загружать и рендерить этапы, замечания и отзывы выбранной сделки. Эти endpoint возвращают 403, поэтому UI показывает raw `Forbidden`.
- Backend уже защищает этапы и отзывы, но `listRemarksByProvider` допускает archived participant к замечаниям, а `mutateCadastralNumbersForProvider` не требует эксклюзивного provider — это нужно закрыть как access-control дефект.

## 1. Зафиксировать контракт архивного участника
- Уточнить [`docs/business-logic.md`](../docs/business-logic.md): невыбранный FREEFORM-provider после `lockedAt` видит базовые сведения заявки без кадастровых номеров, общий статус только с подписью «работу выполняет другой исполнитель» и свой архивный чат; этапы, документы сделки, замечания, кадастровые номера и мутации, финансы и отзывы ему недоступны.
- Зафиксировать, что после выбора другого исполнителя archived provider не получает ни исходный, ни актуальный список кадастровых номеров:
  - API: в [`request.dto.ts`](../backend/src/requests/dto/request.dto.ts) `RequestProDto.cadastralNumbers` для `locked=true` всегда равен `[]`, независимо от `revealMessageForLocked`; поздние изменения выбранного provider не раскрываются;
  - UI: archived mode не рендерит секцию и панель кадастровых номеров, включая read-only список и триггер панели.
- Его собственный архивный чат остаётся доступен: API продолжает отдавать только тред пары `(requestId, actorProviderId)`, а UI сохраняет чат в правой колонке без рабочих действий сделки.
- Не менять SERVICE: его единственный provider остаётся исполнителем сделки и получает полный workflow.

## 2. Ужесточить backend-доступ
- В [`backend/src/requests/requests.service.ts`](../backend/src/requests/requests.service.ts) разделить read базовой карточки/архивного чата и доступ исполнителя сделки через существующий `isExclusiveForActorProvider`.
- Для `listRemarksByProvider`, создания/закрытия замечаний и `mutateCadastralNumbersForProvider` требовать выбранного provider; archived responder получает стабильный 403-код без данных и мутаций.
- В `completeRemarkByProvider` и `mutateCadastralNumbersForProvider` проверять `request.providerId === actorProviderId` и допустимый статус через переданный `tx` в той же транзакции, где изменяются замечание или кадастровые номера. Не полагаться на `requireProviderAccessToRequest`, выполняющий отдельные запросы вне транзакции: между проверкой и записью provider заявки может измениться.
- В `createRemarkByProvider` сохранить существующий транзакционный guard `updateMany({ where: { id, providerId: actorProviderId, status } })`; тестом закрепить, что запись замечания не создаётся, если provider изменился после предварительного чтения.
- Сохранить текущие строгие проверки [`request-work-stages.service.ts`](../backend/src/request-work-stages/request-work-stages.service.ts) и [`reviews.service.ts`](../backend/src/reviews/reviews.service.ts), добавив regression-проверки, что archived provider не получает их данные/действия.
- В [`requests.remarks.spec.ts`](../backend/src/requests/requests.remarks.spec.ts) и [`requests.cadastral-numbers.spec.ts`](../backend/src/requests/requests.cadastral-numbers.spec.ts) проверить race-сценарий смены `providerId` между предварительным чтением и транзакцией: `completeRemarkByProvider` и кадастровая мутация завершаются 403 и не пишут данные; транзакционный guard создания замечания остаётся рабочим.
- DTO/access-тесты: selected FREEFORM и SERVICE сохраняют актуальные кадастровые номера и права на мутации; archived provider читает карточку/чат, получает `cadastralNumbers: []` и не имеет доступа к remarks, stages, reviews и cadastral mutations; посторонний provider по-прежнему не получает карточку.

## 3. Ввести явный archived mode экрана
- Добавить чистую модель в [`frontend/widgets/pro-requests/model`](../frontend/widgets/pro-requests/model), которая по `req.isLocked` возвращает `mode: "archived"`, понятный status copy и флаги секций.
- В [`ProRequestDetails.tsx`](../frontend/widgets/pro-requests/ui/ProRequestDetails.tsx) при archived mode:
  - не запускать запросы work stages, remarks, reviews и reminders сделки;
  - не монтировать progress, remark actions, review form, documents, payments, секцию кадастровых номеров и её panel trigger;
  - показать единый read-only блок «Клиент выбрал другого исполнителя» и подпись глобальной стадии вида «Работа выполняется другим исполнителем» / «Завершена другим исполнителем»;
  - не показывать полный stepper как собственный workflow.
- Оставить архивный чат в правой колонке; выбранный provider и SERVICE проходят прежний deal mode без изменений.
- При переходе `req.isLocked: false → true` отменить применение результатов всех ранее запущенных exclusive-запросов: cleanup/идентификатор поколения должен блокировать запись поздних success и error в state. Одновременно очистить данные и ошибки workflow (`workStages`, `remarks`, документы и связанные panel/error state), чтобы архивный экран не показывал stale-контент.
- Нормализовать 403 в архивное пользовательское пояснение только когда актуальный `req.isLocked === true`. В deal mode любой 403 остаётся реальной ошибкой доступа и не маскируется; поздний 403 от запроса, начатого до архивации, игнорируется вместе с остальными stale-ответами.

## 4. Автоматическая и браузерная регрессия
- TDD component tests для `ProRequestDetails` в `ACTIVE` и `COMPLETED` с `isLocked=true`: нет exclusive fetch, кнопок «Добавить», review form, секции/панели кадастровых номеров и raw `Forbidden`; есть архивное пояснение, корректная подпись стадии и собственный архивный чат.
- Переходный component test: запросы стартуют в deal mode, затем `req` становится locked; их поздние success/403 не меняют archived UI, старые workflow-данные и ошибки очищены. Отдельно проверить, что 403 при `isLocked=false` отображается как ошибка, а не заменяется архивным пояснением.
- Model tests: archived/deal mode; selected FREEFORM и SERVICE не теряют этапы, замечания и отзыв.
- Backend access tests для remarks/cadastral и существующих stages/reviews.
- Запустить focused tests, затем backend `npm test`, `npm run lint:check`, `npm run build`; frontend `npm test`, `npm run lint`, `npm run build` с явной фиксацией известных baseline failures.
- Повторить браузерный сценарий из [`p1-regression.md`](../artifacts/ux-audit/2026-11-01/p1-regression.md) под невыбранным ООО в `ACTIVE` и `COMPLETED`: API карточки возвращает `cadastralNumbers: []`, UI не показывает кадастровую секцию, собственный архивный чат читается, рабочие действия, форма отзыва и `Forbidden` отсутствуют.

## Вне scope
- Скрытие disabled composer и усиление контраста CTA архивного чата.
- Мгновенная синхронизация DONE-статуса замечания внутри версии сдачи.
- Невоспроизводимый переход из панели «Цена и оплата» в «Профиль».
