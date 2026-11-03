# Testing без CDN

Общий порядок настройки и переключения окружений: [Terraform: prod и testing](../../../docs/terraform.md).

Это отдельный Terraform root: собственный state, ресурсы и пароли. Prod остаётся в `infra/terraform/`, testing — в `infra/terraform/testing/`. Не запускайте testing tfvars из каталога prod и не копируйте state между окружениями.

## Ресурсы

- Сеть `zemledel-testing`, Москва, `192.168.20.0/24`.
- PostgreSQL 18 `zemledel-testing-tf`: **один узел без реплик**, готовый тариф 1 CPU / 2 ГБ / 20 ГБ. БД `zemledel_db_testing`, отдельный пароль пользователя.
- Автоматические резервные копии БД не настроены; testing используется без бэкапов.
- Два отдельных S3-бакета `zemledel-testing-public` и `zemledel-testing-private`, по 1 ГБ. Timeweb допишет префикс; фактические имена берите из outputs.
- Отдельная пара S3-ключей. Timeweb service account имеет доступ к хранилищам аккаунта: отдельные бакеты и ключи не обеспечивают строгую изоляцию прав от prod. Для строгой изоляции нужен отдельный аккаунт либо отдельно проверенная политика доступа.

**CDN, DNS-зона, сертификат CDN, backend/frontend AppPlatform не создаются.** Используются только официальный Timeweb Terraform provider и генератор пароля HashiCorp. AppPlatform создаётся вручную на технических HTTPS-доменах платформы.

Тариф БД выбирается из каталога во время plan. По каталогу на 2026-11-03 выбран минимальный совместимый тариф `4775`: 1 CPU / 2 ГБ / 20 ГБ за 2 000 ₽/месяц. Более дешёвый тариф с 1 ГБ RAM не соответствует минимальным требованиям PostgreSQL 18 (2 ГБ). Размеры можно изменить, если в каталоге существует соответствующий готовый тариф. S3 оплачивается отдельно. Для каждого S3-бакета выбран минимальный hot-тариф `5127` (1 ГБ): каталог показывает промоцену 1 ₽. Условия/доступность промо проверяются при создании; это не гарантия постоянной цены. Автоматическое увеличение тарифа выключено, при заполнении бакета потребуется вручную выбрать больший объём.

## Запуск из корня репозитория

```sh
umask 077
cp infra/terraform/testing/terraform.tfvars.example infra/terraform/testing/terraform.tfvars
export TF_VAR_timeweb_token="$TIMEWEB_CLOUD_TOKEN"
terraform -chdir=infra/terraform/testing init
terraform -chdir=infra/terraform/testing validate
terraform -chdir=infra/terraform/testing plan
# Только после проверки ресурсов и стоимости:
terraform -chdir=infra/terraform/testing apply
```

State хранится локально в каталоге testing и содержит секреты. Он исключён из Git; храните защищённую резервную копию и не выполняйте apply параллельно с разных машин. Защита `prevent_destroy` сохранена: testing тоже не будет удалён случайным destroy, пока защитные блоки присутствуют в конфигурации.

## Подключение приложений

Создайте отдельные приложения backend/frontend AppPlatform. Backend подключите к сети `zemledel-testing` в Москве. Не используйте production DATABASE_URL, бакеты и секреты в testing.

```sh
terraform -chdir=infra/terraform/testing output database_tariff
terraform -chdir=infra/terraform/testing output vpc_id
# Секретный вывод — не копировать в чат и Git:
terraform -chdir=infra/terraform/testing output -json database_credentials
terraform -chdir=infra/terraform/testing output -json backend_storage_environment
# Только публичные значения, без ключей:
terraform -chdir=infra/terraform/testing output -json frontend_storage_environment
```

Backend:

1. Задайте `DATABASE_URL` новой testing-базы с TLS и CA из панели подключения.
2. Скопируйте `backend_storage_environment`. `CDN_PUBLIC_BASE_URL` здесь равен **прямому HTTPS URL публичного S3-бакета**, вида `https://<endpoint>/<full_bucket_name>`. Несмотря на название переменной, CDN не требуется: backend добавляет к этому адресу ключ `public/...`. Не оставляйте переменную пустой — она нужна при загрузке изображений.
3. Используйте отдельные `DOCUMENTS_MASTER_KEY_BASE64`, `INTERNAL_API_SECRET`, `SOCKET_JWT_SECRET`. Если копируете зашифрованные документы, ключ должен соответствовать этим документам. Для обычного testing предпочтительны тестовые данные без production-документов.
4. `FRONTEND_URL` — фактический технический HTTPS URL frontend. SMTP можно оставить существующим; проверяйте отправку на тестовый почтовый адрес.

Frontend:

1. `NEXTAUTH_URL` — технический HTTPS URL frontend, `BACKEND_API_URL` и `NEXT_PUBLIC_CHAT_SOCKET_URL` — адрес testing-backend.
2. Свой `NEXTAUTH_SECRET`; `INTERNAL_API_SECRET` и `SOCKET_JWT_SECRET` должны совпадать с **testing-backend**.
3. Скопируйте `frontend_storage_environment` **до сборки**. `next.config.mjs` добавляет только конкретный public-бакет и путь `public/**` в Next Image remotePatterns. Это позволяет отображать S3-изображения напрямую. Ключи S3 во frontend не передаются.

Команды AppPlatform те же, что для prod. Terraform создаёт пустую базу: примените миграции, загрузите справочник городов и сиды по [инструкции БД](../../../docs/database.md). Публичные изображения загружаются в testing-public, документы — в testing-private; private-бакет нельзя делать публичным для обхода ошибок доступа.

После первого развёртывания проверьте загрузку/отображение/удаление картинки, анонимную недоступность приватного документа и работу авторизованного скачивания. В подготовке проверяется план; реальные S3/TLS-подключения подтверждаются после apply.
