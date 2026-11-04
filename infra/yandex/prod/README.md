# Production: две ВМ, Docker, S3, CDN и DNS

Отдельная конфигурация, отдельные state и lock-файл. Все команды ниже выполняются
из корня репозитория `zemldel`. Флаг `-chdir=infra/yandex/prod` означает:
«запусти Terraform в каталоге `infra/yandex/prod`». Он выбирает эту конфигурацию.

Создаются:

- Две обычные, непрерываемые ВМ `standard-v3`: frontend и backend, каждая
  2 vCPU с гарантией 100%, 4 ГБ RAM, SSD 20 ГБ, Ubuntu 24.04.
- Приватная сеть `10.42.0.0/24`, два статических публичных IPv4, группы безопасности.
  SSH разрешён только с указанных адресов; 80/443 открыты для сайта и API.
  Порт 3003 backend доступен по приватному адресу только frontend-серверу.
- Container Registry и сервисный аккаунт ВМ с правом только загрузки образов из этого реестра.
- Два S3-бакета с лимитом по 10 ГБ: публичные изображения в `public/` и приватные документы.
  Отдельный ключ backend имеет доступ только к этим бакетам; листинг для анонимных пользователей закрыт.
- CDN для изображений, публичная DNS-зона и управляемый сертификат для CDN.
- Docker Compose и Caddy на каждой ВМ. Caddy выпускает и продлевает сертификаты
  сайта и API после переключения DNS. Настройки Caddy поддерживают WebSocket.

PostgreSQL, ящик поддержки и Postbox здесь не создаются. Используются существующие
БД, почтовый ящик и ключи Postbox. Эти файлы не управляют прежней инфраструктурой.

На 2026-11-04 ориентир для этой схемы — 6 788 ₽/30 дней без БД: по 20 ГБ SSD,
20 ГБ фактических данных S3 суммарно, 250 ГБ CDN, 5 ГБ образов и небольшое число DNS-запросов.
Это не фиксированный тариф: трафик, запросы, хранение и будущие цены влияют на сумму.
У CDN нет настроенного здесь жёсткого лимита 250 ГБ: это допущение для расчёта,
за превышение оплачивается дополнительный трафик. Пакет CDN оплачивается уже при создании.

## 1. Авторизация и локальные параметры

Нужны Terraform >= 1.4 и < 2, `yc`, SSH и Docker с Buildx на машине сборки.
Официальный провайдер зафиксирован на ветке 0.243; lock-файл хранится в Git.
Для macOS/Linux lock получен из официального зеркала провайдеров.

Если `yc` ещё не настроен:

```bash
yc init
```

Посмотреть выбранные cloud/folder (без вывода секретов):

```bash
yc config get cloud-id
yc config get folder-id
```

Нужны права на Compute/VPC, DNS, CDN, Certificate Manager, Registry, S3,
создание сервисных аккаунтов/статических ключей и назначение доступа к Registry.
Работайте в существующем каталоге с подключённым платёжным аккаунтом.

```bash
export YC_TOKEN="$(yc iam create-token)"
```

IAM-токен временный: при истечении повторите эту команду. Не сохраняйте токен в tfvars.

В этой рабочей копии уже подготовлен локальный `terraform.tfvars` с ID из настроек
`yc`, SSH-ключом `~/.ssh/id_ed25519_brobearhub.pub` и вашим IP `93.90.235.87/32`.
Проверьте ID облака и каталога перед планированием. Этот файл исключён из Git.
На новой машине создайте его из примера:

```bash
cp infra/yandex/prod/terraform.tfvars.example infra/yandex/prod/terraform.tfvars
```

Заполните `cloud_id`, `folder_id`, путь к существующему публичному SSH-ключу
и ваш текущий IP с `/32`. Файл `.pub` можно передавать серверу; приватный ключ
остаётся на вашем компьютере. При смене IP обновите список и примените план.

## 2. Проверка и создание инфраструктуры

Сначала оставьте `publish_application_dns = false`, `enable_cdn_tls = false`.
Не меняйте NS у регистратора на этом этапе: действующие сайт и почта должны
продолжать использовать прежнюю DNS-зону.

```bash
terraform -chdir=infra/yandex/prod init
terraform -chdir=infra/yandex/prod fmt -check
terraform -chdir=infra/yandex/prod validate
terraform -chdir=infra/yandex/prod plan
```

Если аккаунт ещё не активировал Cloud CDN, включите провайдера `ourcdn` в консоли
CDN перед apply. Само создание CDN-ресурса запускает его платную тарификацию.

Когда план проверен и вы готовы к расходам:

```bash
terraform -chdir=infra/yandex/prod apply
```

`apply` создаёт платные ресурсы. Не выполняйте `apply` в старом каталоге по этой инструкции.
Защита от удаления включена для важных ресурсов. Не используйте `destroy` для переключения окружений.
Локальный `terraform.tfstate` содержит S3-ключ: он исключён из Git, храните его
в защищённом месте вместе с резервной копией. Потеря state усложнит управление ресурсами.
Для работы командой отдельно настройте защищённый удалённый backend с блокировкой state.

Получите адреса и переменные:

```bash
terraform -chdir=infra/yandex/prod output servers
terraform -chdir=infra/yandex/prod output -raw registry
terraform -chdir=infra/yandex/prod output -json backend_storage_environment
terraform -chdir=infra/yandex/prod output -json frontend_environment
terraform -chdir=infra/yandex/prod output -raw database_firewall_source_ipv4
```

Команда `backend_storage_environment` выводит секреты — не публикуйте её вывод.
Серверы устанавливают Docker при первом запуске; дождитесь завершения `cloud-init`.

## 3. Подключение существующей базы и подготовка секретов

В настройках Firewall существующего PostgreSQL разрешите подключение от адреса
`database_firewall_source_ipv4`. ВМ другого облака не имеет доступа к `192.168.*`:
используйте публичное доменное имя кластера, соответствующее его сертификату.
Подключение сохраняет `sslmode=verify-full`; публичный CA будет смонтирован
в backend-контейнер как `/run/db-certs/root.crt`.

```bash
cp deploy/yandex/backend.env.example deploy/yandex/backend.env
cp deploy/yandex/frontend.env.example deploy/yandex/frontend.env
chmod 600 deploy/yandex/backend.env deploy/yandex/frontend.env
```

Заполните эти локальные файлы в редакторе. Они исключены из Git и не читаются Terraform.
В `backend.env` перенесите существующий `DATABASE_URL`, заменив путь сертификата
на `/run/db-certs/root.crt`; пароль внутри URL должен быть URL-encoded.
Перенесите существующий ключ шифрования документов и почтовые ключи.
Впишите новые S3-параметры из вывода этой конфигурации.

В `frontend.env` `INTERNAL_API_SECRET` и `SOCKET_JWT_SECRET` должны совпадать с backend.
`BACKEND_API_URL=http://10.42.0.11:3003` — приватное соединение двух новых ВМ.
Публичный адрес чата — `https://api.zemledelpro.ru`.
Четыре `NEXT_PUBLIC_*` значения используйте также при сборке образа ниже.

CA существующей базы уже скачан на вашем компьютере в `~/.cloud-certs/root.crt`.
Проверьте наличие файла; это публичный сертификат, пароль базы туда не входит.
Управление БД и её резервными копиями остаётся отдельно от этой конфигурации.

## 4. Сборка образов вне production-серверов

Используйте отдельные Dockerfile из `deploy/yandex`. Они не меняют старую схему
развёртывания. Backend запускает `dist/src/main.js`; сборка и обычный старт
не подключаются к БД для миграций или сидирования.

Команды ниже — пример ручной сборки на компьютере с Docker. Для автоматического
деплоя их можно перенести в CI отдельным последующим изменением. Расходы на CI
зависят от выбранного сервиса и не включены в оценку.

```bash
yc container registry configure-docker
export REGISTRY="$(terraform -chdir=infra/yandex/prod output -raw registry)"
export IMAGE_TAG="$(git rev-parse HEAD)"
```

Для production собирайте из чистого проверенного коммита: `git status --short`
должен быть пустым. Иначе тег SHA не будет точно описывать содержимое образа.

Backend:

```bash
docker buildx build --platform linux/amd64 --target runtime \
  -f deploy/yandex/Dockerfile.backend \
  -t "$REGISTRY/backend:$IMAGE_TAG" --push backend
```

Frontend: замените `PUBLIC_BUCKET_FROM_OUTPUT` на имя нового публичного бакета.
Это публичные параметры; секреты не передаются через Docker build args.

```bash
docker buildx build --platform linux/amd64 \
  -f deploy/yandex/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_CHAT_SOCKET_URL=https://api.zemledelpro.ru \
  --build-arg NEXT_PUBLIC_S3_ENDPOINT=https://storage.yandexcloud.net \
  --build-arg NEXT_PUBLIC_S3_PUBLIC_BUCKET=PUBLIC_BUCKET_FROM_OUTPUT \
  --build-arg NEXT_PUBLIC_S3_FORCE_PATH_STYLE=true \
  -t "$REGISTRY/frontend:$IMAGE_TAG" --push frontend
```

Сохраняйте предыдущий тег для отката. При заполнении диска удаляйте только
заведомо ненужные старые теги: автоматическая очистка здесь удаляет лишь образы
без тегов. Логи ограничены до трёх файлов по 10 МБ на контейнер.

## 5. Запуск сначала backend, затем frontend

Подставьте реальные IPv4 из `output servers`. Убедитесь, что SSH использует
тот же ключ, что указан в tfvars. Для нестандартного имени ключа удобно настроить
`IdentityFile ~/.ssh/id_ed25519_brobearhub` в `~/.ssh/config` для этих двух IP.

```bash
sh deploy/yandex/deploy-host.sh BACKEND_PUBLIC_IP backend \
  "$REGISTRY/backend:$IMAGE_TAG" deploy/yandex/backend.env \
  "$HOME/.cloud-certs/root.crt"

sh deploy/yandex/deploy-host.sh FRONTEND_PUBLIC_IP frontend \
  "$REGISTRY/frontend:$IMAGE_TAG" deploy/yandex/frontend.env
```

Скрипт ждёт `cloud-init`, передаёт env по SSH, сохраняет его на сервере с правами 600,
загружает CA для backend и запускает Compose. Сервисный аккаунт ВМ получает временный
токен Registry через metadata — статического ключа Registry на сервере нет.

Проверьте приложения до переключения домена:

```bash
ssh ubuntu@BACKEND_PUBLIC_IP 'curl -fsS --max-time 15 http://127.0.0.1:3003/'
ssh ubuntu@FRONTEND_PUBLIC_IP 'curl -I --max-time 15 http://127.0.0.1:3000/'
ssh ubuntu@FRONTEND_PUBLIC_IP 'curl -fsS --max-time 15 http://10.42.0.11:3003/'
```

Ответ корня backend ещё не доказывает доступ к БД. Проверьте API с чтением категорий,
города, вход и чат; для браузерной проверки до смены DNS можно временно добавить
имена доменов с новыми IP в локальный hosts, учитывая готовность HTTPS-сертификата.
Безопаснее завершить проверку HTTPS сразу после согласованного переключения.

Логи:

```bash
ssh ubuntu@BACKEND_PUBLIC_IP 'sudo docker compose --env-file /etc/zemledel/compose.env -f /opt/zemledel/compose.yaml logs --tail=100 app'
ssh ubuntu@FRONTEND_PUBLIC_IP 'sudo docker compose --env-file /etc/zemledel/compose.env -f /opt/zemledel/compose.yaml logs --tail=100 app'
```

Существующая production-база уже заполнена. Не запускайте reset, restore или seed
заново ради переезда ВМ. Для будущих миграций есть отдельная стадия `migrations`
в Dockerfile backend: соберите её отдельным тегом и выполните один раз перед
обновлением приложения на backend-ВМ с `--network host`, тем же `--env-file`
и монтированием CA. Пример после загрузки migrations-образа в Registry:

```bash
docker buildx build --platform linux/amd64 --target migrations \
  -f deploy/yandex/Dockerfile.backend \
  -t "$REGISTRY/migrations:$IMAGE_TAG" --push backend
```

На backend-сервере после аутентификации Registry (обычный deploy уже её выполняет):

```bash
sudo docker run --rm --network host \
  --env-file /etc/zemledel/app.env \
  -v /etc/zemledel/db-certs:/run/db-certs:ro \
  cr.yandex/REGISTRY_ID/migrations:COMMIT_SHA
```

## 6. Перенос файлов и DNS без потери почты

Новые бакеты пустые. Если в прежних бакетах уже есть пользовательские файлы,
перенесите их с сохранением ключей объектов до переключения приложения. Смена
endpoint/bucket не переносит объекты и не переписывает сохранённые в БД абсолютные URL.
Проверьте старые URL изображений и подписанные ссылки на приватные файлы отдельно.

До смены NS экспортируйте ВСЕ записи действующей DNS-зоны: MX, SPF, DKIM Postbox,
DMARC, служебные TXT/CNAME. Запишите их в `extra_dns_records`. SPF должен оставаться
одной согласованной записью, сохраняющей разрешения всех используемых отправителей.
Не заменяйте значения почты примерами из tfvars.

После готовности обоих приложений и почтовых записей измените в tfvars:

```hcl
publish_application_dns = true
enable_cdn_tls          = false
```

```bash
terraform -chdir=infra/yandex/prod plan
terraform -chdir=infra/yandex/prod apply
```

Новая DNS-зона теперь содержит A сайта/www/API, CNAME CDN, проверку сертификата
и перенесённые почтовые записи. У регистратора замените NS на серверы
авторитетной DNS-зоны Yandex Cloud: `ns1.yandexcloud.net.` и `ns2.yandexcloud.net.`.
Перенос регистрации домена не нужен. Если включён DNSSEC, сначала согласуйте DS
у регистратора с новой зоной — старый DS приведёт к ошибкам разрешения DNS.
Делегирование переключается у регистратора и не выполняется Terraform автоматически.

```bash
dig +short NS zemledelpro.ru
dig +short A zemledelpro.ru
dig +short A api.zemledelpro.ru
dig +short CNAME cdn.zemledelpro.ru
dig +short MX zemledelpro.ru
terraform -chdir=infra/yandex/prod output cdn_dns_challenge
```

Дождитесь, пока публичные резолверы видят новую зону и CNAME проверки сертификата.
Caddy на обеих ВМ автоматически получит сертификаты сайта/API. Старые записи и
работающие сервисы сохраняйте на период распространения DNS и проверки отката.

## 7. Автоматический сертификат CDN

После распространения DNS измените в tfvars:

```hcl
enable_cdn_tls = true
```

```bash
terraform -chdir=infra/yandex/prod plan
terraform -chdir=infra/yandex/prod apply
terraform -chdir=infra/yandex/prod output cdn_certificate_status
```

Terraform дождётся выдачи сертификата Certificate Manager, подключит его к CDN
и включит HTTP → HTTPS. Записи DNS challenge сохраняются для автоматического
продления. Не загружайте приватный ключ сертификата в Terraform вручную.

Проверки после переключения:

```bash
curl -I --max-time 15 https://zemledelpro.ru
curl -I --max-time 15 https://api.zemledelpro.ru
```

Для CDN проверяйте URL реально существующего изображения, например
`https://cdn.zemledelpro.ru/public/...`; корень пустого бакета может вернуть 403/404.
Проверьте регистрацию/вход, каталог из БД, загрузку изображения, получение документа,
чат, сброс пароля через Postbox и входящее письмо на support. До этих проверок
переезд нельзя считать завершённым. Старые ресурсы здесь не удаляются.

## Источники

- [Виртуальные машины](https://yandex.cloud/ru/docs/terraform/resources/compute_instance)
- [S3-бакеты](https://yandex.cloud/ru/docs/terraform/resources/storage_bucket)
- [CDN](https://yandex.cloud/ru/docs/terraform/resources/cdn_resource)
- [Сертификаты](https://yandex.cloud/ru/docs/terraform/resources/cm_certificate)
- [Приватный доступ в VPC](https://yandex.cloud/ru/docs/vpc/concepts/security-groups)

## Состояние проверки на 2026-11-04

- Установка официального провайдера из зеркала, `terraform fmt -check` и
  `terraform validate` выполнены успешно. Lock содержит контрольные суммы
  для `darwin_arm64` и `linux_amd64`.
- Оба cloud-init шаблона отрендерены Terraform; YAML, вложенные Compose-файлы
  и синтаксис shell-скриптов проверены локально.
- Облачный `plan` не получен: текущая авторизация `yc` возвращает
  `Unauthenticated: Subject ... was not found`. Нужна повторная авторизация
  через `yc init` и подтверждение cloud/folder в локальном tfvars.
- Сборки Docker не завершены: загрузка базового образа из Docker Hub зависла,
  сборки остановлены до установки зависимостей. Успешная сборка образов,
  запуск ВМ, доступ к БД и сертификаты в облаке пока не подтверждены.
- `apply`, публикация образов и переключение DNS не выполнялись.
