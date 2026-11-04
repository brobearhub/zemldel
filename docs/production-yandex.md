# Production: виртуальные машины и Docker

Пошаговая инструкция и параметры находятся в
[infra/yandex/prod/README.md](../infra/yandex/prod/README.md).

Это самостоятельная конфигурация для двух ВМ, S3, CDN и DNS. База данных остаётся
существующей внешней PostgreSQL; Terraform её не создаёт и не меняет.

Начать проверку из корня проекта:

```bash
terraform -chdir=infra/yandex/prod init
terraform -chdir=infra/yandex/prod validate
terraform -chdir=infra/yandex/prod plan
```

До `plan` настройте авторизацию `yc` и локальный `terraform.tfvars` по инструкции.
Создание ресурсов, загрузка секретов, запуск приложений и переключение домена —
отдельные шаги. Не переключайте NS до переноса всех почтовых DNS-записей.
