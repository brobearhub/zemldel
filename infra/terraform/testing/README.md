# Testing: один S3-бакет на Timeweb, база на ONREZA

Этот Terraform root создаёт публичный бакет `zemledel-testing-public` (Standard 1 ГБ, preset `5135`) и отдельного S3-пользователя. База testing остаётся на ONREZA. Сеть, БД, CDN, DNS и приложения Timeweb здесь не создаются.

Каталог аккаунта Timeweb на 2026-11-08 показывает 1 ₽/месяц за бакет плюс возможный исходящий трафик. Автоувеличение выключено: при заполнении бакета загрузка остановится. State содержит S3-ключи, исключён из Git и требует защищённой резервной копии.

В этом бакете будут публичные изображения и **только искусственные документы testing**. При `NODE_ENV=testing` backend отправляет `S3_PRIVATE_BUCKET`, документы и паспорта в тот же публичный бакет без KMS. Любой, кто узнает адрес объекта, сможет прочитать его напрямую. Не используйте реальные паспортные данные, договоры или иные конфиденциальные файлы. При любом другом значении `NODE_ENV` backend по-прежнему требует отдельные `PASSPORT_S3_*` и KMS.

В аккаунте на 2026-11-08 промотариф Premium 1 ГБ был недоступен (`Storage class hot is sold out`), поэтому второй бакет не создан. Отдельный S3-пользователь не гарантирует изоляцию от production: его права нужно проверить до использования. Проверка S3 SDK с ключами из Terraform state сейчас возвращает `SignatureDoesNotMatch` (HTTP 403) и для нового пользователя, и для ключей бакета. До устранения этой ошибки не считайте загрузку работающей и не подставляйте эти ключи в приложение.

## Применение и параметры

```sh
umask 077
cp -n infra/terraform/testing/terraform.tfvars.example infra/terraform/testing/terraform.tfvars
export TF_VAR_timeweb_token="$TIMEWEB_CLOUD_TOKEN"
terraform -chdir=infra/terraform/testing init
terraform -chdir=infra/terraform/testing validate
terraform -chdir=infra/terraform/testing plan
terraform -chdir=infra/terraform/testing apply
```

План должен показывать только бакет и S3-пользователя, если они ещё не созданы. Существующий state не удаляйте и не переносите в production.

```sh
# Содержит секреты: не публикуйте вывод.
terraform -chdir=infra/terraform/testing output -json backend_storage_environment
# Публичные значения для frontend, задать до сборки.
terraform -chdir=infra/terraform/testing output -json frontend_storage_environment
```

`DATABASE_URL` оставьте от testing-базы ONREZA. `NODE_ENV=testing` требуется именно backend; frontend может использовать обычную production-сборку. `CDN_PUBLIC_BASE_URL` — прямой HTTPS-адрес бакета, без отдельного CDN. После восстановления доступа S3 измените env, перезапустите backend, пересоберите frontend и проверьте реальную загрузку, чтение и удаление синтетического файла. Наличие Terraform output само по себе не подтверждает, что ключи S3 работают.

Другие настройки приложения и миграций описаны в [общей инструкции](../../../docs/terraform.md).
