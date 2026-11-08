# Как создать инфраструктуру Timeweb через Terraform

Для паспортных данных подготовлен отдельный [root приватного хранилища](../infra/terraform/passports/README.md). Он не заменяет описанные ниже окружения и применяется отдельно.

Эта инструкция рассчитана на первый запуск Terraform. Начните с testing. Когда он будет настроен, prod можно создать отдельно по разделу ниже.

Testing Terraform создаёт только S3-хранилища: база остаётся на ONREZA. Prod Terraform управляет своей сетью, PostgreSQL, S3, резервным копированием, DNS и CDN. Приложения backend и frontend в AppPlatform создаются отдельно.

## Где вводить команды

В Cursor откройте меню **Terminal → New Terminal**. Внизу появится терминал. Копируйте команды из инструкции в него и нажимайте Enter. Выполняйте шаги по порядку и дожидайтесь завершения каждой команды.

Сначала перейдите в папку проекта:

```sh
cd /Users/pavelusov/Projects/brobearhub/zemldel
```

Все следующие команды выполняются из этой папки. Если откроете новый терминал, выполните `cd` ещё раз.

### Что означает `-chdir`

`-chdir` — часть команды Terraform. Она сообщает, **из какой папки взять настройки и с какими ресурсами работать**.

Для testing путь такой:

```text
infra/terraform/testing
```

Для prod:

```text
infra/terraform
```

Например, `terraform -chdir=infra/terraform/testing init` подготавливает testing, а `terraform -chdir=infra/terraform init` — prod. Выбор окружения уже записан в каждой команде ниже. Менять пути вручную не нужно.

## Общая подготовка

### 1. Проверить, установлен ли Terraform

```sh
terraform version
```

Должна появиться версия Terraform. Проект поддерживает версии **от 1.4.4 до 2.0, не включая 2.0**.

Если терминал пишет `command not found: terraform`, Terraform ещё не установлен. Сначала установите его, затем вернитесь к этому шагу.

### 2. Передать токен Timeweb

Terraform нужен API-токен вашего аккаунта Timeweb. Возьмите его в панели Timeweb в разделе API-токенов. Подключение MCP в Cursor не заменяет настройку токена в терминале.

Если `TIMEWEB_CLOUD_TOKEN` уже задана в этом терминале, сразу выполните:

```sh
export TF_VAR_timeweb_token="${TIMEWEB_CLOUD_TOKEN:?Сначала задайте TIMEWEB_CLOUD_TOKEN}"
```

Если переменная ещё не задана, выполните этот блок в стандартном терминале macOS с zsh:

```sh
read -rs 'TIMEWEB_CLOUD_TOKEN?Вставьте API-токен Timeweb и нажмите Enter: '
printf '\n'
export TIMEWEB_CLOUD_TOKEN
export TF_VAR_timeweb_token="$TIMEWEB_CLOUD_TOKEN"
```

Терминал попросит токен. Вставьте его и нажмите Enter. Символы при вводе не отображаются — это нормально. Значение не попадёт в историю команд.

Выполните также:

```sh
umask 077
```

Эта команда ограничивает доступ к создаваемым локальным файлам вашим пользователем. Токен и секретные файлы не нужно добавлять в Git или отправлять в чат.

Подготовка действует для текущего терминала. Если закроете его, снова перейдите в папку проекта и передайте токен.

## Создать testing

База testing остаётся на ONREZA. Этот Terraform root создаёт только **один публичный бакет Standard 1 ГБ и отдельного S3-пользователя**. На 2026-11-08 тариф бакета — 1 ₽/месяц плюс возможный исходящий трафик. Автоувеличение выключено. Второй бакет Premium 1 ГБ создать не удалось: Timeweb ответил `Storage class hot is sold out`.

В публичный бакет можно загружать фотографии и **только искусственные документы testing**. При `NODE_ENV=testing` backend направляет документы и паспорта туда же без KMS. Прямой URL объекта открыт любому, кто его узнает. Для всех прочих значений `NODE_ENV` остаются обязательными отдельное защищённое хранилище `PASSPORT_S3_*` и KMS.

```sh
cp -n infra/terraform/testing/terraform.tfvars.example infra/terraform/testing/terraform.tfvars
terraform -chdir=infra/terraform/testing init
terraform -chdir=infra/terraform/testing validate
terraform -chdir=infra/terraform/testing plan
terraform -chdir=infra/terraform/testing apply
```

При первом запуске план должен содержать только бакет и S3-пользователя. State сохраняется отдельно и содержит секреты. При ошибке не удаляйте state: часть ресурсов уже могла создаться.

```sh
# Содержит S3_KEY и S3_SECRET — не публикуйте вывод.
terraform -chdir=infra/terraform/testing output -json backend_storage_environment
# Публичные значения, задать до сборки frontend.
terraform -chdir=infra/terraform/testing output -json frontend_storage_environment
```

Для backend оставьте `DATABASE_URL` testing-базы ONREZA и проверьте сетевое подключение и миграции. На 2026-11-08 ключи S3 из Terraform state отвечают `SignatureDoesNotMatch` (HTTP 403); сначала добейтесь успешного пробного обращения к бакету. Затем подставьте S3-переменные и `NODE_ENV` из `backend_storage_environment` и перезапустите backend. `CDN_PUBLIC_BASE_URL` указывает прямо на HTTPS-адрес бакета; CDN не требуется. Для frontend установите `NEXT_PUBLIC_S3_*` из `frontend_storage_environment` и пересоберите его. `NEXTAUTH_URL`, `BACKEND_API_URL`, `FRONTEND_URL`, `INTERNAL_API_SECRET`, `SOCKET_JWT_SECRET` и `NEXTAUTH_SECRET` должны соответствовать именно testing-приложениям.

Подробнее: [testing S3](../infra/terraform/testing/README.md), [миграции и данные БД](database.md).

## Создать prod

Prod создаётся отдельно от testing:

- PostgreSQL 18: **мастер + 2 реплики**, каждый узел 2 CPU / 2 ГБ / 30 ГБ.
- Ежедневный бэкап с хранением одной последней копии.
- Своя сеть `zemledel-prod`, `192.168.10.0/24`.
- Отдельный публичный IPv4 для БД: оплачивается отдельно. Terraform привяжет его к кластеру и после этого запросит включение TLS.
- Два S3-бакета по 10 ГБ.
- DNS для `zemledel.ru` и CDN `cdn.zemledel.ru`.

Все команды по-прежнему вводятся из папки проекта. Если открыли новый терминал, выполните общую подготовку в начале инструкции.

### 1. Создать файл настроек prod

```sh
cp -n infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
```

В Cursor откройте:

```text
infra/terraform/terraform.tfvars
```

Установите `backup_start_date` на день развёртывания в формате `YYYY-MM-DD`. Например, для развёртывания 3 ноября 2026 года:

```hcl
backup_start_date = "2026-11-03"
```

Для первого запуска оставьте:

```hcl
enable_cdn_tls = false
dns_records    = {}
```

`false` означает, что Terraform пока не запрашивает сертификат. После настройки DNS запустите выпуск через Terraform. Сам сертификат выпускает и автоматически продлевает Timeweb.

### 2. Подготовить Terraform для prod

```sh
terraform -chdir=infra/terraform init
```

Дождитесь успешного завершения. Эта команда ещё не создаёт ресурсы.

### 3. Проверить настройки prod

```sh
terraform -chdir=infra/terraform validate
```

Ожидаемый результат: `Success! The configuration is valid.`

### 4. Посмотреть план prod

```sh
terraform -chdir=infra/terraform plan
```

При первом запуске с текущими примерами ожидается:

```text
Plan: 16 to add, 0 to change, 0 to destroy.
```

Проверьте имена `zemledel-prod-*`, базу `zemledel_db_prod` и `replications = 3`. Здесь 3 — общее число узлов: мастер и две реплики. Параметры CPU/RAM/диска относятся к каждому узлу.

### 5. Создать ресурсы prod

```sh
terraform -chdir=infra/terraform apply
```

После проверки плана введите `yes`. Начнётся создание и тарификация ресурсов. Дождитесь `Apply complete!`.

### 6. Получить параметры prod

```sh
terraform -chdir=infra/terraform output vpc_id
terraform -chdir=infra/terraform output database_cluster_id
terraform -chdir=infra/terraform output database_public_ipv4
terraform -chdir=infra/terraform output database_domains
terraform -chdir=infra/terraform output database_tariff
```

Получить имя базы, имя пользователя и пароль prod-БД:

```sh
terraform -chdir=infra/terraform output -json database_credentials
```

Команда покажет поля `database`, `user` и `password`. Пароль нужен для настройки `DATABASE_URL`; не присылайте его в чат и не сохраняйте в Git.

Получить параметры S3 для backend:

```sh
terraform -chdir=infra/terraform output -json backend_storage_environment
```

Вывод обеих команд содержит секреты. Выполняйте команды из корня проекта.

Создайте backend/frontend в AppPlatform вручную. Backend подключите к сети **`zemledel-prod`** в Москве. Команды сборки и запуска backend такие же, как в разделе testing, но БД, бакеты и секреты должны быть production.

### 7. Подключить домен и приложения prod

Домен остаётся у текущего регистратора. Terraform добавляет его в DNS-хостинг Timeweb.

1. В панели Timeweb откройте домен `zemledel.ru`.
2. До смены NS перенесите в Timeweb существующие DNS-записи, особенно MX/SPF/DKIM/DMARC для действующей почты. Проверьте автоматически созданные записи, чтобы не получить дубликаты.
3. В AppPlatform подключите `zemledel.ru` к frontend и `api.zemledel.ru` к backend.
4. Выданные AppPlatform значения A/CNAME внесите в `dns_records` файла `infra/terraform/terraform.tfvars`. Не используйте выдуманные IP-адреса и не ставьте CNAME на корень домена.
5. Примените новые записи:

```sh
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
```

6. У регистратора домена укажите NS-серверы, которые Timeweb показывает для вашего домена. Дождитесь распространения DNS.

Для prod-приложений задайте:

- Backend: `FRONTEND_URL=https://zemledel.ru`.
- Frontend: `NEXTAUTH_URL=https://zemledel.ru`.
- Frontend: `BACKEND_API_URL=https://api.zemledel.ru` и `NEXT_PUBLIC_CHAT_SOCKET_URL=https://api.zemledel.ru`.
- В обоих приложениях: согласованные production-секреты. S3-переменные backend возьмите из production-вывода Terraform.

Для доменов backend и frontend AppPlatform автоматически выпускает и устанавливает сертификаты при их подключении. Это отдельные сертификаты от сертификата CDN.

### 8. Включить HTTPS для CDN prod

Сначала нужно убедиться, что DNS настроен: сертификат не выпустится, если домен ещё не указывает на CDN. На компьютере должен быть установлен `dig`. Выполните:

```sh
terraform -chdir=infra/terraform output -raw cdn_cname_target
```

```sh
dig +short CNAME cdn.zemledel.ru
```

Значения должны совпасть; завершающую точку в ответе `dig` можно не учитывать. Если они не совпадают, дождитесь распространения DNS и повторите проверку.

Сертификат выпускает и автоматически продлевает Timeweb. Для первого выпуска Terraform отправит запрос в Timeweb. На компьютере также нужны Python 3 и `curl`.

После этого в файле `infra/terraform/terraform.tfvars` поменяйте:

```hcl
enable_cdn_tls = true
```

Выполните:

```sh
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
```

Terraform отправит запрос в Timeweb, дождётся выпуска и привязки сертификата и включит перенаправление HTTP → HTTPS. Сам сертификат создаёт и в дальнейшем автоматически продлевает Timeweb. Пока сертификат не готов, адрес `https://cdn.zemledel.ru` ещё нельзя считать рабочим для приложения.

## Смена домена существующего prod

Для перехода на `zemledel.ru` используйте [пошаговую инструкцию](domain-change.md).
Не повторяйте создание БД, восстановление городов и сиды. Существующий CDN
перенастраивается через список алиасов без создания второго платного ресурса.

## Что проверить после создания

Для обоих окружений проверьте подключение приложения к нужной БД, вход, сброс пароля, чат, загрузку и отображение картинки, скачивание приватного документа с авторизацией. Приватный S3-бакет должен оставаться недоступным анонимно.

Для prod дополнительно проверьте две готовые реплики, расписание бэкапов и HTTPS CDN. Для testing этот Terraform root не создаёт БД и CDN.

Старую prod-БД удаляйте после переноса данных и проверки нового приложения. Terraform не переносит данные БД или файлы S3 автоматически. При переносе зашифрованных документов сохраняйте соответствующий им `DOCUMENTS_MASTER_KEY_BASE64`.

## Как потом менять настройки

Откройте `terraform.tfvars` нужного окружения в Cursor и внесите изменения. Для prod размеры БД выбирают готовый тариф Timeweb: если такого сочетания CPU/RAM/диска нет в каталоге, план завершится ошибкой.

Для изменения testing:

```sh
terraform -chdir=infra/terraform/testing plan
terraform -chdir=infra/terraform/testing apply
```

Для изменения prod:

```sh
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
```

После создания, если настройки не менялись, ожидается сообщение `No changes.`. Числа ресурсов в первом плане относятся только к первому созданию. При частичном создании план показывает только оставшиеся ресурсы.

Если план показывает неожиданное удаление (`destroy`) или замену (`-/+`), остановитесь и проверьте изменения. Не снимайте `prevent_destroy` автоматически: это защита от случайного удаления важных ресурсов.

## Какие файлы нужно сохранять

Terraform ведёт файл **state** — список созданных ресурсов и их параметров. Он позволяет при следующем запуске обновить существующую инфраструктуру.

Файлы state находятся здесь:

```text
Testing: infra/terraform/testing/terraform.tfstate
Prod:    infra/terraform/terraform.tfstate
```

Они содержат пароли и ключи. Храните защищённую резервную копию этих файлов; они содержат секреты S3. Не добавляйте state, рабочие `terraform.tfvars` и выгрузки секретов в Git. Примеры `terraform.tfvars.example` и файлы `.terraform.lock.hcl` сохраняются в Git.

Не копируйте state между prod/testing и не подставляйте в testing настройки prod. Не используйте `init -migrate-state` для переключения окружения. Отдельные S3-ключи Timeweb service account имеют доступ к хранилищам аккаунта: разные имена бакетов сами по себе не изолируют права.

Если запуск завершился ошибкой, посмотреть уже учтённые ресурсы можно так.

Для testing:

```sh
terraform -chdir=infra/terraform/testing state list
```

Для prod:

```sh
terraform -chdir=infra/terraform state list
```

Удаление локального state не удаляет ресурсы из Timeweb и не останавливает оплату. Для запуска с нескольких компьютеров сначала нужно настроить общее защищённое хранение state с отдельным файлом каждого окружения и блокировкой одновременных изменений.

Третье окружение потребует отдельной папки конфигурации и state, новых имён ресурсов и свободной подсети. Одного нового tfvars сейчас недостаточно: имена частично закреплены в `.tf`.

Подробности реализации: [prod](../infra/terraform/README.md), [testing](../infra/terraform/testing/README.md). Настройка данных: [база](database.md), [города](cities.md).
