# Первый выкат prod (Yandex Cloud)

**Быстрый старт:** интерактивный пайплайн `./deploy/run-prod-pipeline.sh`

**Не выполняйте `terraform apply` без осознанного OK** (~18 250 ₽/мес).

## 0. Авторизация YC

```bash
yc init   # если Subject not found / Unauthenticated
```

## 1. Terraform (скрипты)

```bash
cd infra/terraform

./scripts/bootstrap-state.sh          # state-бакет + backend.hcl
./scripts/generate-tfvars.sh          # terraform.tfvars (ваш IP + SSH)
export TF_VAR_postgres_password='...'

./scripts/plan.sh
CONFIRM_APPLY=1 ./scripts/apply.sh    # только когда готовы платить
```

Outputs: `deploy/terraform-outputs.env`, `deploy/.secrets/database.url`

## 2. DNS

```bash
./deploy/scripts/print-dns-instructions.sh
```

| Запись | Значение |
|--------|----------|
| `A` `zemledelpro.ru` | `VM_PUBLIC_IP` |
| `CNAME` `cdn.zemledelpro.ru` | `CDN_PROVIDER_CNAME` |
| DNS-challenge CDN | `terraform output cdn_certificate_dns_records` |

**Порядок:** A на ВМ → challenge + CNAME CDN. Старый `cdn.zemledel.pro` не затрагивается.

## 3. Секреты и Lockbox

```bash
./deploy/scripts/generate-secrets.sh       # + офлайн-копия master key
./deploy/scripts/build-lockbox-payload.sh
yc lockbox secret add-version --id "$LOCKBOX_SECRET_ID" --payload "file://deploy/.secrets/lockbox-payload.json"
./deploy/scripts/build-vm-env.sh
```

## 4. Файлы на ВМ

```bash
./deploy/scripts/setup-vm-files.sh
# или вручную scp из build-vm-env / setup-vm-files
```

## 5. Deploy образов

```bash
cp deploy/.deploy.env.example deploy/.deploy.env
# CR_REGISTRY, VM_HOST, SSH_KEY_PATH, YC_CR_TOKEN

./deploy/deploy.sh
```

Или **Run workflow** в GitHub Actions.

## 6. Данные в БД

```bash
./deploy/scripts/post-deploy-data.sh   # db:seed (услуги/категории)
```

Справочник **City** — отдельно, с локальной машины: см. [`docs/cities.md`](../docs/cities.md) (`cities:update` → dump → `cities:restore`).

Первый **PLATFORM_ADMIN** — явно.

## 7. Smoke

```bash
./deploy/scripts/smoke-check.sh
```

Вручную: логин, услуги, аватар (CDN URL), чат, приватный файл, Swagger выключен.

## 8. Откат образа

```bash
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.prod.yml up -d
```

## GitHub Secrets

| Secret | Описание |
|--------|----------|
| `CR_REGISTRY` | из `terraform-outputs.env` |
| `YC_CR_TOKEN` | `yc iam create-token` |
| `VM_HOST` | IP ВМ |
| `VM_USER` | `ubuntu` |
| `VM_DEPLOY_PATH` | `/opt/zemledel` |
| `VM_SSH_PRIVATE_KEY` | приватный ключ |

`DATABASE_URL` в GitHub **не** храним.
