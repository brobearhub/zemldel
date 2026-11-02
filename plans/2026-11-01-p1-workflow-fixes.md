---
name: P1 workflow fixes
overview: Исправить четыре подтверждённых P1 в порядке «цена → поздние оплаты → чат → предъявление результата», сохранив разные SERVICE/FREEFORM сценарии и серверные проверки доступа. План включает синхронизацию продуктовой спецификации, две точечные Prisma-миграции, BFF/data-layer контракты, UI и автоматические проверки.
todos:
  - id: spec-price
    content: Обновить продуктовую спецификацию и реализовать двустороннее provider-scoped согласование цены с тестами и миграцией.
    status: completed
  - id: late-payments
    content: Разрешить добавление и подтверждение платежей после COMPLETED, сохранив запрет смены цены и scope-проверки.
    status: completed
  - id: chat-selection
    content: Переключать FREEFORM на выбранный чат, сделать остальные треды read-only и локализовать штатные запреты.
    status: completed
  - id: delivery-submissions
    content: Добавить версионируемый итог сдачи, привязку замечаний, атомарный таймер и UI истории.
    status: completed
  - id: verification
    content: Запустить релевантные и полные проверки, затем выполнить ручную регрессию на новых заявках.
    status: completed
isProject: true
---

# План исправления P1 workflow заявок

## Выводы анализа
- UX-отчёт подтверждает четыре P1: неверный чат после выбора исполнителя, приёмка без предъявленного результата, блокировка поздней оплаты после `COMPLETED`, расхождение SERVICE-цены между подписанием и финансами.
- Корни дефектов находятся в разных слоях: `selectedConversationId` не синхронизирован с `providerId`; сдача не имеет body/истории; `COMPLETED` входит в общий запрет финансовых мутаций; UI подписания использует `servicePriceRubles`, а остаток — только `totalAmountRubles`.
- P2 из отчёта (автообновление вкладок, финальные подсказки, рейтинг по умолчанию) не входят в эту реализацию.
- [docs/business-logic.md](../docs/business-logic.md) сейчас противоречит brief по цене и оплатам после `COMPLETED`; спецификацию нужно обновлять до соответствующего кода каждого этапа.

## Архитектурные решения
- Все клиентские запросы остаются в цепочке UI/container → typed data layer → `app/api/**` BFF → NestJS; прямых REST-вызовов к backend не добавлять.
- `servicePriceRubles` остаётся справочным снимком карточки услуги. `totalAmountRubles` становится только подтверждённой ценой работ.
- Для двустороннего согласования использовать provider-scoped `RequestPriceProposal`: одна сторона предлагает, противоположная принимает; новое предложение аннулирует текущее согласование. Проект в разработке: перенос старых финансовых записей и backfill не входят в задачу.
- После подписания договора цену не менять в этом workflow. Будущее изменение потребует отдельного согласования обеих сторон и изменения договора; без этого ни предложение, ни прямое редактирование цены не допускаются.
- После `COMPLETED` разрешить создание и подтверждение платежных записей, но запретить изменение цены; `CANCELLED` и `CLOSED` остаются полностью закрыты.
- Разрешить завершать принятые работы при ненулевом остатке, сохраняя сумму к оплате в финансовом журнале. Согласовать этим правилом противоречащие друг другу разделы `docs/business-logic.md`.
- Для сдачи использовать `RequestDeliverySubmission` и nullable-связь замечания с версией сдачи. JSON `RequestEvent` остаётся аудитом, а не продуктовым read-model.
- Файлы результата переиспользуют опубликованные этапы/их вложения; обязательной загрузки и нового S3-flow не вводить. Итог допускает ссылки в тексте.

## Этапы реализации

### 1. Зафиксировать бизнес-контракт и согласование цены
- Обновить [docs/business-logic.md](../docs/business-logic.md): двустороннее согласование, SERVICE-цена как исходное предложение, сброс при новом предложении/смене FREEFORM-исполнителя, запрет подписания без согласованной цены и поздние платежи.
- Добавить `RequestPriceProposal` в [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) и отдельную миграцию в [backend/prisma/migrations](../backend/prisma/migrations): `requestId`, server-derived `providerId`, сумма, сторона/пользователь предложения, `acceptedAt/acceptedByUserId`, `supersededAt`, timestamps и индексы.
- В [backend/src/request-payments/request-payments.service.ts](../backend/src/request-payments/request-payments.service.ts) заменить односторонний `setTotal*` на создание предложения и отдельное принятие противоположной стороной; принятие атомарно записывает `totalAmountRubles`. Ограничить операции pre-contract статусами и текущим provider scope.
- В [backend/src/requests/requests.service.ts](../backend/src/requests/requests.service.ts) требовать согласованную цену в `acceptContractByCustomer`; в `selectProviderByCustomer` сбрасывать текущую цену/активное предложение при смене provider. Предложения разных исполнителей не должны смешиваться.
- Расширить backend/frontend DTO: текущая цена, активное предложение, авторская сторона и доступные действия. Добавить typed data-layer методы в [frontend/entities/request/api/request-payments.ts](../frontend/entities/request/api/request-payments.ts) и BFF-маршруты под [frontend/app/api/requests](../frontend/app/api/requests) и [frontend/app/api/pro/requests](../frontend/app/api/pro/requests).
- Обновить [frontend/widgets/request-payments/ui/RequestPayments.tsx](../frontend/widgets/request-payments/ui/RequestPayments.tsx), [frontend/entities/request/ui/RequestPriceBlock.tsx](../frontend/entities/request/ui/RequestPriceBlock.tsx) и диалог подписания в [frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx](../frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx): показывать справочную цену услуги отдельно, предложение/подтверждение обеим ролям и «Цена не согласована» вместо подмены.
- Тесты сначала: SERVICE 12 000 ₽ не создаёт фиктивного согласия; противоположная сторона принимает предложение; повторное предложение сбрасывает согласование; stale/own-side acceptance запрещён; подписание без цены отклонено; смена FREEFORM-provider не переносит цену; после подписания изменение цены отклонено.

### 2. Разрешить расчёты после завершения работ
- В [backend/src/request-payments/request-payments.service.ts](../backend/src/request-payments/request-payments.service.ts) заменить общий `assertWritable` на policy по операции: `addPayment` и `markPaymentPaid` разрешены при `COMPLETED`, изменение/новое предложение цены запрещено; `CANCELLED/CLOSED` запрещают всё.
- Сохранить текущий provider/customer scope и защиту повторного `paidAt`; все новые записи после завершения должны сохранять дату, сумму, автора и server-derived `providerId`.
- В [frontend/widgets/request-payments/ui/RequestPayments.tsx](../frontend/widgets/request-payments/ui/RequestPayments.tsx) разделить `canEditPrice`, `canAddPayment`, `canMarkPaid`; в [frontend/widgets/pro-requests/ui/ProRequestDetails.tsx](../frontend/widgets/pro-requests/ui/ProRequestDetails.tsx) заменить предупреждение на сообщение, что остаток можно отметить позднее.
- Тесты: принятые работы можно завершить с ненулевым остатком; provider и customer могут добавить/подтвердить платёж после `COMPLETED`; остаток пересчитывается, статус заявки не меняется; цена после завершения неизменяема; чужой/бывший provider и `CANCELLED/CLOSED` получают 403; повторное подтверждение не создаёт дубль.

### 3. Синхронизировать выбор исполнителя и чат FREEFORM
- Вынести чистый resolver активного диалога рядом с [frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx](../frontend/widgets/customer-requests/ui/CustomerRequestConversationWorkspace.tsx): после успешного `select-provider` и при reload выбирать conversation по `req.providerId`, а не `conversations[0]`; до загрузки выбранного access не оставлять ввод другого provider активным.
- В [frontend/widgets/chat/ui/ServiceRequestChatPanel.tsx](../frontend/widgets/chat/ui/ServiceRequestChatPanel.tsx) переоценивать access при изменении lock/provider, fail closed при ошибке access, локализовать штатный lock и скрывать «Повторить» для non-retryable 403. Добавить действие перехода к выбранному чату.
- В [backend/src/chat/chat.service.ts](../backend/src/chat/chat.service.ts) разрешить клиенту читать архивный тред после lock, но запретить запись; возвращать стабильный reason code вместо сырого `Forbidden/Request is locked`. Provider scope и запрет записи сохранить.
- SERVICE оставить на однотредовом пути без списка выбора.
- Тесты: выбор B из открытого A немедленно активирует B; reload сохраняет B; A читается без отправки/retry; backend разрешает customer read и запрещает write; provider A не получает финансовый/чат-write доступ; SERVICE не показывает multi-provider UI.

### 4. Добавить предъявление и историю результата
- Добавить `RequestDeliverySubmission` в [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) и отдельную миграцию: provider-scoped версия, последовательный номер в заявке, `summary` (trim, 1–2000), автор, `submittedAt`; добавить nullable `submissionId` к `RequestRemark`.
- В [backend/src/requests/requests.controller.ts](../backend/src/requests/requests.controller.ts) ввести typed body для `mark-rendered`; в [backend/src/requests/requests.service.ts](../backend/src/requests/requests.service.ts) одной транзакцией валидировать actor/status/open remarks, создать submission, CAS-переходом `ACTIVE → ACCEPTANCE_PENDING`, затем выставить `acceptanceRequestedAt/autoAcceptAt` и записать audit events с `submissionId`.
- При `sendRemarksByCustomer` связывать новые замечания с текущей сдачей; повторная сдача создаёт следующую версию и новый семидневный срок.
- Расширить DTO текущей сдачей и историей; BFF [frontend/app/api/pro/requests/[id]/mark-rendered/route.ts](../frontend/app/api/pro/requests/[id]/mark-rendered/route.ts) должен валидированно проксировать body через typed data-layer функцию.
- В [frontend/widgets/pro-requests/ui/ProRequestDetails.tsx](../frontend/widgets/pro-requests/ui/ProRequestDetails.tsx) заменить confirm на обязательный диалог итога; для повторной сдачи использовать формулировку «Что исправлено». В customer workspace показать текущий итог, дату и версии рядом с действиями приёмки, а существующие опубликованные этапы/файлы — как материалы результата.
- Тесты: пустой/пробельный итог не меняет статус и не запускает таймер; успешная сдача атомарно создаёт version 1; замечания привязаны к ней; повторная сдача создаёт version 2 и новый deadline; двойной параллельный POST не создаёт две версии.

### 5. Проверка и handoff
- После каждого этапа запускать релевантные backend/frontend Vitest-наборы; после Prisma-изменений — генерацию клиента и status миграций.
- Финально выполнить в `backend`: `npm test`, `npm run lint:check`, `npm run build`; в `frontend`: `npm test`, `npm run lint`, `npm run build`.
- Ручную браузерную регрессию на новых SERVICE/FREEFORM заявках проведём отдельно в Codex после завершения реализации в Cursor: согласование 12 000 ₽, поздняя оплата, выбор B из чата A, первая/повторная сдача.
- Итог реализации перечисляет файлы, обе миграции, API-контракты, результаты проверок и оставшиеся риски; P2 и внешние уведомления остаются вне scope.
