# Terraform — prod Zemledel (Yandex Cloud)

**Зачем:** описывает постоянную инфраструктуру (сеть, БД, бакеты, CDN, ВМ) как код. Изменения — только через `terraform plan` / `apply`, не вручную в консоли.

## Предпосылки

1. Установлены [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5 и [YC CLI](https://yandex.cloud/ru/docs/cli/quickstart) (`yc init`).
2. Есть `cloud_id`, `folder_id`, SSH-ключ и ваш публичный IP (`operator_cidr`, например `203.0.113.10/32`).
3. Домен **zemledelpro.ru** — DNS у регистратора или в Cloud DNS.

## Bootstrap: бакет для remote state (один раз, вручную)

**Автоматически:** `./scripts/bootstrap-state.sh` (после `yc init`).

**Вручную:**

**Зачем:** state Terraform хранится в Object Storage, а не локально — команда видит одну правду, есть блокировка.

```bash
export FOLDER_ID="<folder-id>"
export STATE_BUCKET="prod-zemledel-terraform-state"

# Сервисный аккаунт для Terraform state
yc iam service-account create --name prod-zemledel-terraform --folder-id "$FOLDER_ID"
export TF_SA_ID=$(yc iam service-account get prod-zemledel-terraform --folder-id "$FOLDER_ID" --format json | jq -r .id)

yc resource-manager folder add-access-binding "$FOLDER_ID" \
  --role storage.admin \
  --subject "serviceAccount:${TF_SA_ID}"

yc iam access-key create --service-account-id "$TF_SA_ID" --description "terraform-state"
# Сохраните key_id и secret — они пойдут в backend.hcl (не коммитить!)

yc storage bucket create --name "$STATE_BUCKET" --default-storage-class standard --max-size 1073741824
```

Скопируйте [`backend.hcl.example`](backend.hcl.example) → `backend.hcl`, подставьте ключи и имя бакета.

```bash
cp backend.hcl.example backend.hcl   # или bootstrap-state.sh создаст сам
cp terraform.tfvars.example terraform.tfvars   # или ./scripts/generate-tfvars.sh

export TF_VAR_postgres_password='...'
terraform init -backend-config=backend.hcl
./scripts/plan.sh
CONFIRM_APPLY=1 ./scripts/apply.sh
```

## После apply

1. Запишите outputs: IP ВМ, FQDN Postgres, имена бакетов, registry id, lockbox secret id.
2. Заполните секреты в Lockbox (консоль или `yc lockbox secret add-version`) — см. [`deploy/FIRST-DEPLOY.md`](../../deploy/FIRST-DEPLOY.md).
3. A-запись `zemledelpro.ru` → IP ВМ; CNAME `cdn.zemledelpro.ru` → CDN (из output).
4. Первый выкат приложения: [`deploy/deploy.sh`](../../deploy/deploy.sh).

## Переменные

| Переменная | Описание |
|------------|----------|
| `cloud_id` | ID облака |
| `folder_id` | ID каталога |
| `domain` | `zemledelpro.ru` |
| `cdn_domain` | `cdn.zemledelpro.ru` |
| `operator_cidr` | Ваш IP для SSH (`x.x.x.x/32`) |
| `ssh_public_key` | Публичный ключ (`ssh-ed25519 ...`) |
| `postgres_password` | Пароль пользователя БД `zemledel` (через `TF_VAR_postgres_password`, не в git) |

## Стоимость (оценка)

≈ **18 250 ₽/мес с НДС** при конфигурации из плана (VM 4 vCPU / 8 GB, PG HA 2× s3-c2-m8). Перед apply — [калькулятор YC](https://yandex.cloud/ru/prices).
