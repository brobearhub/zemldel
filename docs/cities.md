# Справочник локаций (City) и импорт из ГАР/ФИАС

Таблица **`City`** — офлайн-справочник локаций РФ из XML-выгрузок ГАР/ФИАС.

**Оглавление:** [Обзор](#обзор) · [Схема работы](#схема-работы) · [Локально](#локально) · [Production](#production-yandex-cloud) · [Код](#где-лежит-код) · [Troubleshooting](#troubleshooting)

---

## Обзор

### Уровни ГАР

Импортируем только адресные объекты уровней:

- **2, 3, 4, 6** — административные/муниципальные единицы, поселения, населённые пункты
- **5** — города (`typeName="г"`)
- **1** — города федерального значения (`typeName="г"` на уровне субъекта)

Улицы, дома, помещения и более низкие уровни **не импортируются**.

### Идентификаторы

| Поле | Источник | Назначение |
|------|----------|------------|
| `City.id` | UUID приложения (Prisma) | FK в `User`, `Provider`, `Request` — **не менять при restore на prod** |
| `garObjectId` | ГАР (`OBJECTID`) | Ключ upsert/import и **merge при restore** |
| `objectGuid` | ГАР (`OBJECTGUID`) | Справочное поле ФИАС/ГАР |

### Статус локации

- **`ACTIVE`** — объект есть в актуальном снимке ГАР
- **`INACTIVE`** — был в справочнике, но исчез из снимка (soft delete, строка не удаляется)

Inactivate города **не показываются** в автокомплите (`GET /cities/suggest` фильтрует `status = ACTIVE`).

### Подключения

| Окружение | `DATABASE_URL` |
|-----------|----------------|
| Local | `postgres://postgres:postgres@localhost:5421/new_gorisons` |
| Prod | `deploy/.secrets/database.url` (после `terraform apply`) |

Имя таблицы в SQL: **`"City"`** (кавычки и регистр важны).

---

## Схема работы

**ГАР (~50 GB) парсится только локально.** На prod уходит дамп `"City"` (~100–500 MB).

```text
┌─────────────────────────────────────────────────────────┐
│  Локальная машина (50 GB+ диск / external drive)        │
│  1. npm run cities:update -- --zip gar_xml.zip          │
│  2. pg_dump → backups/city-YYYYMMDD.dump                │
└──────────────────────────┬──────────────────────────────┘
                           │ merge-restore (без DELETE)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Prod PostgreSQL (Yandex Managed)                       │
│  npm run cities:restore -- --file backups/city....dump  │
│  (с локального компа, prod DATABASE_URL + ваш IP в SG)  │
└─────────────────────────────────────────────────────────┘
```

**Почему не import на prod-ВМ:** диск ~30 GB, `gar_xml.zip` ~50+ GB.

### Merge-restore (общие правила)

`DELETE FROM "City"` **не используем** — иначе обнулятся FK (`ON DELETE SET NULL`).

| Ситуация | Действие |
|----------|----------|
| `garObjectId` уже есть в целевой БД | UPDATE полей; **`City.id` сохраняется** |
| `garObjectId` новый | INSERT |
| Есть в БД, нет в дампе | **Не трогаем** |

**Первая заливка** (пустая `"City"`): тот же restore — все строки INSERT.  
**Повторные заливки:** prod `City.id` не меняются, даже если local reset перегенерировал UUID.

### Чего не делать

- ❌ `DELETE FROM "City"` + `pg_restore` / `psql` напрямую
- ❌ `cities:update` с download `gar_xml.zip` на prod-ВМ
- ❌ Restore без merge (сломает FK в заявках)

---

## Локально

Рабочая директория для import: **`backend/`**.  
Для бэкапа: **корень репозитория** (`backups/`).

### 1. Импорт из ГАР

Полный reconcile (включая inactive) — только с `gar_xml.zip`.

```bash
cd backend

# первичная заливка / full reconcile
npm run cities:update -- --mode full --zip "/path/to/gar_xml.zip"

# download на external drive
npm run cities:update -- --mode full --out "/Volumes/One Touch/Projects/novagor/cities"

# обновление на уже заполненной БД (тот же полный снимок)
npm run cities:update -- --mode delta --zip "/path/to/gar_xml.zip"

# XML уже распакованы
npm run cities:update -- --dir "/path/to/unzipped/gar"
```

**Backfill / reconcile:** `--mode full` и `--mode delta` оба работают с **полным снимком** `gar_xml.zip` (не `gar_delta_xml.zip`). Delta сравнивает снимок с БД: новые → INSERT, изменившиеся → UPDATE, исчезнувшие → `INACTIVE`.

**Регион:** `regionCode` / `regionName` из `AS_ADM_HIERARCHY`.

### 2. Бэкап `"City"`

```bash
# из корня репозитория
mkdir -p backups
export LOCAL_DATABASE_URL="postgres://postgres:postgres@localhost:5421/new_gorisons"
```

**Custom-формат (рекомендуется):**

```bash
pg_dump "$LOCAL_DATABASE_URL" \
  -t '"City"' \
  --data-only --no-owner --no-privileges \
  -F c \
  -f "backups/city-$(date +%Y%m%d).dump"
```

**SQL + gzip:**

```bash
pg_dump "$LOCAL_DATABASE_URL" \
  -t '"City"' \
  --data-only --no-owner --no-privileges \
  | gzip > "backups/city-$(date +%Y%m%d).sql.gz"
```

**Проверка:**

```bash
ls -lh backups/city-*.dump
pg_restore -l backups/city-*.dump | head
```

**`pg_dump version mismatch`** (клиент 14, Docker Postgres 16):

```bash
docker run --rm \
  -v "$(pwd)/backups:/backups" \
  postgres:16-alpine \
  pg_dump "postgres://postgres:postgres@host.docker.internal:5421/new_gorisons" \
    -t '"City"' --data-only --no-owner --no-privileges \
    -F c -f "/backups/city-$(date +%Y%m%d).dump"
```

Linux: добавьте `--add-host=host.docker.internal:host-gateway`.  
Или: `brew install postgresql@16`.

### 3. Restore (dev)

```bash
cd backend
npm run cities:restore -- --file ../backups/city-YYYYMMDD.dump
```

Merge по `garObjectId`: UPDATE существующих (prod `City.id` сохраняется), INSERT новых, без DELETE.
Опции: `--dry-run` — только загрузка staging и подсчёт строк.

---

## Production (Yandex Cloud)

### Доступ к PostgreSQL

- **Целевой способ:** restore **с локального компа** напрямую в Managed PostgreSQL (public IP на кластере + SG: `operator_cidr` → `:6432`). **ВМ не нужна.**
- **Fallback:** через SSH-туннель на prod-ВМ → `deploy/scripts/cities-restore-prod.sh` (если IP изменился и SG ещё не обновлён).
- **pgAdmin:** клиент на вашей машине; [встроенного pgAdmin в YC нет](https://yandex.cloud/ru/docs/managed-postgresql/operations/connect).

Сертификат CA: https://storage.yandexcloud.net/cloud-certs/CA.pem  
Порт: **6432**, SSL: `verify-full`.

### Restore дампа на prod (основной сценарий)

```bash
# 1. Локально: import + бэкап (см. раздел «Локально»)

# 2. Restore на prod с локального компа
cd backend
export DATABASE_URL="$(cat ../deploy/.secrets/database.url)"
curl -fsSL -o ~/.postgresql/root.crt https://storage.yandexcloud.net/cloud-certs/CA.pem
chmod 0600 ~/.postgresql/root.crt

npm run cities:restore -- --file ../backups/city-YYYYMMDD.dump
```

Проверка: `GET /cities/suggest?q=Моск` на prod.

### Fallback: restore через ВМ

Если PostgreSQL ещё без public IP:

```bash
yc compute instance start <vm-id>   # если ВМ выключена
source deploy/.deploy.env

./deploy/scripts/cities-restore-prod.sh backups/city-YYYYMMDD.dump
```

### Бэкап `"City"` с prod (audit)

Только с prod-ВМ (если нет прямого доступа к PG):

```bash
source deploy/.deploy.env

ssh -i "${SSH_KEY_PATH}" "${VM_USER}@${VM_HOST}" bash -s <<'EOF'
set -euo pipefail
mkdir -p /tmp/backups
source /opt/zemledel/.env
curl -fsSL -o /tmp/YandexCA.crt https://storage.yandexcloud.net/cloud-certs/CA.pem
docker run --rm \
  -v /tmp/YandexCA.crt:/root/.postgresql/root.crt:ro \
  postgres:16-alpine \
  pg_dump "${DATABASE_URL}" \
    -t '"City"' --data-only --no-owner --no-privileges -F c \
    -f /tmp/backups/city-prod.dump
ls -lh /tmp/backups/city-prod.dump
EOF

scp -i "${SSH_KEY_PATH}" "${VM_USER}@${VM_HOST}:/tmp/backups/city-prod.dump" ./backups/
```

### pgAdmin через SSH tunnel

Если PG доступен только из VPC:

```bash
ssh -L 15432:<POSTGRES_RW_FQDN>:6432 ubuntu@<VM_HOST>
```

pgAdmin → `localhost:15432`, SSL `verify-full`.

### DR: бэкап всего кластера

Автобэкапы Managed PostgreSQL (~02:00 UTC, `infra/terraform/postgres.tf`).  
Restore через консоль YC — откат **всей** БД, не только `"City"`.

---

## Где лежит код

| Что | Путь |
|-----|------|
| Import GAR + reconcile | `backend/scripts/import-gar-cities.ts` → `npm run cities:update` |
| Reconcile SQL | `backend/scripts/import-gar-cities-reconcile.ts` |
| Restore merge | `backend/scripts/restore-city-dump.ts` → `npm run cities:restore` |
| Prod wrapper (fallback) | `deploy/scripts/cities-restore-prod.sh` |
| API suggest | `backend/src/cities/cities.service.ts` → `GET /cities/suggest` |
| Admin import runs | `GET /admin/city-import-runs`, UI `/admin/cities/imports` |
| BFF suggest | `frontend/app/api/cities/suggest/route.ts` |
| UI autocomplete | `frontend/shared/ui/CityAutocomplete.tsx` |
| Prisma | `backend/prisma/schema.prisma` — `City`, `CityImportRun`, `CityImportEvent` |

---

## Troubleshooting

### `Import failed: ... invalid block type` / `bad zipfile offset`

Повреждённый ZIP (обрыв download / некорректный resume).

- удалите/переименуйте битый `gar_xml.zip`
- перезапустите `npm run cities:update -- --mode full --zip ...`

Подозрительные файлы скрипт откладывает в `*.mismatch.*` / `*.corrupt.*`.

### `pg_dump: server version 16.x; pg_dump version 14.x`

Major-версия клиента должна совпадать с сервером. См. [бэкап через Docker](#2-бэкап-city) в разделе «Локально».
