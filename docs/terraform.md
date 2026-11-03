# Как создать инфраструктуру Timeweb через Terraform

Эта инструкция рассчитана на первый запуск Terraform. Начните с testing. Когда он будет настроен, prod можно создать отдельно по разделу ниже.

Terraform создаёт сеть, PostgreSQL и S3-хранилища. Для prod он также настраивает резервное копирование, DNS и CDN. Приложения backend и frontend в AppPlatform вы создаёте вручную.

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

Testing — минимальное окружение:

- PostgreSQL 18: **1 CPU, 2 ГБ RAM, 20 ГБ**, один узел, без реплик и бэкапов.
- Своя сеть `zemledel-testing` с адресами `192.168.20.0/24`.
- Два отдельных S3-бакета: public и private, по 1 ГБ на промотарифе.
- Изображения доступны напрямую из public S3; CDN и DNS-зона не создаются.

### 1. Создать файл настроек testing

```sh
cp -n infra/terraform/testing/terraform.tfvars.example infra/terraform/testing/terraform.tfvars
```

Команда копирует готовый пример в рабочий файл. Если `terraform.tfvars` уже существует, `-n` сохраняет его без перезаписи.

В дереве файлов Cursor откройте:

```text
infra/terraform/testing/terraform.tfvars
```

В нём уже указаны минимальные параметры. Для первого запуска их можно оставить. Terraform будет читать этот файл автоматически.

### 2. Подготовить Terraform для testing

```sh
terraform -chdir=infra/terraform/testing init
```

Команда скачивает компоненты для общения с Timeweb. Дождитесь сообщения `Terraform has been successfully initialized!`.

**Платные ресурсы на этом шаге не создаются.**

### 3. Проверить настройки

```sh
terraform -chdir=infra/terraform/testing validate
```

Ожидаемый результат: `Success! The configuration is valid.`

### 4. Посмотреть, что будет создано

```sh
terraform -chdir=infra/terraform/testing plan
```

Команда покажет список будущих ресурсов и прочитает актуальный тариф БД из Timeweb. Она ещё ничего не создаёт.

При первом запуске с текущей конфигурацией ожидается:

```text
Plan: 8 to add, 0 to change, 0 to destroy.
```

Это означает: создать 8 объектов, изменить 0, удалить 0. Среди имён должны быть `zemledel-testing-tf`, `zemledel_db_testing` и `zemledel-testing-public` / `private`.

В `database_tariff` указана цена БД. Это не цена всего окружения: S3, трафик и приложения AppPlatform считаются отдельно. Доступность промотарифа S3 подтверждается при создании.

### 5. Создать ресурсы testing

Когда проверили план, выполните:

```sh
terraform -chdir=infra/terraform/testing apply
```

Terraform снова покажет план и спросит подтверждение. Для создания введите:

```text
yes
```

**После подтверждения начнётся создание платных ресурсов.** Дождитесь сообщения `Apply complete!`.

Если команда завершилась ошибкой, сохраните её текст. Часть ресурсов уже могла создаться: не удаляйте файлы Terraform и не начинайте заново из другой папки.

### 6. Получить параметры testing

Посмотреть ID сети, ID кластера и адреса БД:

```sh
terraform -chdir=infra/terraform/testing output vpc_id
terraform -chdir=infra/terraform/testing output database_cluster_id
terraform -chdir=infra/terraform/testing output database_domains
```

Посмотреть выбранный тариф БД:

```sh
terraform -chdir=infra/terraform/testing output database_tariff
```

Получить имя БД, пользователя и пароль:

```sh
terraform -chdir=infra/terraform/testing output -json database_credentials
```

Получить переменные S3 для backend:

```sh
terraform -chdir=infra/terraform/testing output -json backend_storage_environment
```

Две последние команды показывают секреты. Не публикуйте их вывод.

Получить публичные переменные S3 для frontend:

```sh
terraform -chdir=infra/terraform/testing output -json frontend_storage_environment
```

### 7. Подключить приложения testing

Создайте отдельные backend и frontend в AppPlatform. Используйте их технические HTTPS-домены. При создании backend выберите сеть **`zemledel-testing`** в Москве.

Для backend:

- Путь проекта: `/backend`.
- Команда сборки: `npm ci --include=dev && npm run deploy`.
- Команда запуска: `npm run start:prod`.
- `DATABASE_URL`: подключение к **новой testing-БД**, с паролем из `database_credentials`. Hostname, порт и параметры TLS/CA возьмите в панели подключения этой БД.
- Переменные S3: из `backend_storage_environment`.
- `FRONTEND_URL`: технический HTTPS-адрес testing-frontend.
- Секреты приложения и `SMTP_*`: задаются отдельно в AppPlatform.

В testing переменная `CDN_PUBLIC_BASE_URL` из вывода Terraform содержит прямой адрес S3-бакета. Скопируйте её тоже: она нужна backend для формирования ссылок на изображения, даже когда CDN нет.

Для frontend:

- `NEXTAUTH_URL`: технический HTTPS-адрес testing-frontend.
- `BACKEND_API_URL` и `NEXT_PUBLIC_CHAT_SOCKET_URL`: технический HTTPS-адрес testing-backend.
- `NEXT_PUBLIC_S3_*`: из `frontend_storage_environment`, задать **до сборки**.
- `INTERNAL_API_SECRET` и `SOCKET_JWT_SECRET`: те же значения, что у testing-backend.
- `NEXTAUTH_SECRET`: отдельный секрет frontend.

Terraform создаёт пустую БД. Миграции, города и сиды выполняются отдельно: [инструкция по базе](database.md), [инструкция по городам](cities.md). Сборка backend через `deploy` выполняет миграции и сиды, поэтому ей нужен доступ к БД.

## Создать prod

Prod создаётся отдельно от testing:

- PostgreSQL 18: **мастер + 2 реплики**, каждый узел 2 CPU / 2 ГБ / 30 ГБ.
- Ежедневный бэкап с хранением одной последней копии.
- Своя сеть `zemledel-prod`, `192.168.10.0/24`.
- Отдельный публичный IPv4 для БД: оплачивается отдельно. Terraform привяжет его к кластеру и после этого запросит включение TLS.
- Два S3-бакета по 10 ГБ.
- DNS для `zemledelpro.ru` и CDN `cdn.zemledelpro.ru`.

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

1. В панели Timeweb откройте домен `zemledelpro.ru`.
2. До смены NS перенесите в Timeweb существующие DNS-записи, особенно MX/SPF/DKIM/DMARC для действующей почты. Проверьте автоматически созданные записи, чтобы не получить дубликаты.
3. В AppPlatform подключите `zemledelpro.ru` к frontend и `api.zemledelpro.ru` к backend.
4. Выданные AppPlatform значения A/CNAME внесите в `dns_records` файла `infra/terraform/terraform.tfvars`. Не используйте выдуманные IP-адреса и не ставьте CNAME на корень домена.
5. Примените новые записи:

```sh
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
```

6. У регистратора домена укажите NS-серверы, которые Timeweb показывает для вашего домена. Дождитесь распространения DNS.

Для prod-приложений задайте:

- Backend: `FRONTEND_URL=https://zemledelpro.ru`.
- Frontend: `NEXTAUTH_URL=https://zemledelpro.ru`.
- Frontend: `BACKEND_API_URL=https://api.zemledelpro.ru` и `NEXT_PUBLIC_CHAT_SOCKET_URL=https://api.zemledelpro.ru`.
- В обоих приложениях: согласованные production-секреты. S3-переменные backend возьмите из production-вывода Terraform.

Для доменов backend и frontend AppPlatform автоматически выпускает и устанавливает сертификаты при их подключении. Это отдельные сертификаты от сертификата CDN.

### 8. Включить HTTPS для CDN prod

Сначала нужно убедиться, что DNS настроен: сертификат не выпустится, если домен ещё не указывает на CDN. На компьютере должен быть установлен `dig`. Выполните:

```sh
terraform -chdir=infra/terraform output -raw cdn_cname_target
```

```sh
dig +short CNAME cdn.zemledelpro.ru
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

Terraform отправит запрос в Timeweb, дождётся выпуска и привязки сертификата и включит перенаправление HTTP → HTTPS. Сам сертификат создаёт и в дальнейшем автоматически продлевает Timeweb. Пока сертификат не готов, адрес `https://cdn.zemledelpro.ru` ещё нельзя считать рабочим для приложения.

## Что проверить после создания

Для обоих окружений проверьте подключение приложения к нужной БД, вход, сброс пароля, чат, загрузку и отображение картинки, скачивание приватного документа с авторизацией. Приватный S3-бакет должен оставаться недоступным анонимно.

Для prod дополнительно проверьте две готовые реплики, расписание бэкапов и HTTPS CDN. Для testing бэкапы и CDN не создаются.

Старую prod-БД удаляйте после переноса данных и проверки нового приложения. Terraform не переносит данные БД или файлы S3 автоматически. При переносе зашифрованных документов сохраняйте соответствующий им `DOCUMENTS_MASTER_KEY_BASE64`.

## Как потом менять настройки

Откройте `terraform.tfvars` нужного окружения в Cursor и внесите изменения. Размеры БД выбирают готовый тариф Timeweb: если такого сочетания CPU/RAM/диска нет в каталоге, план завершится ошибкой.

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

После создания, если настройки не менялись, ожидается сообщение `No changes.`. Числа `8 to add` и `16 to add` выше относятся к первому созданию. При частичном создании план показывает только оставшиеся ресурсы.

Если план показывает неожиданное удаление (`destroy`) или замену (`-/+`), остановитесь и проверьте изменения. Не снимайте `prevent_destroy` автоматически: это защита от случайного удаления важных ресурсов.

## Какие файлы нужно сохранять

Terraform ведёт файл **state** — список созданных ресурсов и их параметров. Он позволяет при следующем запуске обновить существующую инфраструктуру.

Файлы state находятся здесь:

```text
Testing: infra/terraform/testing/terraform.tfstate
Prod:    infra/terraform/terraform.tfstate
```

Они содержат пароли и ключи. Храните защищённую резервную копию этих файлов, даже если для testing отключён бэкап самой БД. Не добавляйте state, рабочие `terraform.tfvars` и выгрузки секретов в Git. Примеры `terraform.tfvars.example` и файлы `.terraform.lock.hcl` сохраняются в Git.

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
