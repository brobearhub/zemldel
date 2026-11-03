# Справочник локаций (City) и импорт из ГАР/ФИАС

Таблица `City` — офлайн-справочник локаций РФ из XML-выгрузок ГАР/ФИАС.

**Оглавление:** [Обзор](#обзор) · [Чистая база: порядок заливки](#чистая-база-порядок-заливки) · [Схема работы](#схема-работы) · [Локально](#локально) · [Production](#production-timeweb-cloud) · [Код](#где-лежит-код) · [Troubleshooting](#troubleshooting)

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

- `ACTIVE` — объект есть в актуальном снимке ГАР
- `INACTIVE` — был в справочнике, но исчез из снимка (soft delete, строка не удаляется)

Inactivate города **не показываются** в автокомплите (`GET /cities/suggest` фильтрует `status = ACTIVE`).

### Подключения

| Окружение | `DATABASE_URL` |
|-----------|----------------|
| Local | `postgres://postgres:postgres@localhost:5421/new_gorisons` |
| Prod | PostgreSQL 18 в Timeweb Cloud; строку подключения взять в панели Timeweb и передать через `DATABASE_URL` |

Имя таблицы в SQL: `"City"` (кавычки и регистр важны).

---

## Чистая база: порядок заливки

Шпаргалка: поднять пустую БД и залить справочники. Команды из `backend/`, `DATABASE_URL` смотрит на нужную БД.

### Первый шаг: миграции production

В терминале из `backend/` с `DATABASE_URL`, указывающим на нужную production-базу, выполните:

```bash
npm run db:migrate:deploy
```

Убедитесь по выводу, что миграции прошли без ошибки и были направлены в нужную базу. Если результат неясен, в том же окружении проверьте `npm run db:migrate:status`. При передаче вывода не публикуйте строку подключения, пароль или токены. Факт запуска команды сам по себе не подтверждает успешное применение миграций.

`npm run deploy` тоже выполняет миграции, но дополнительно запускает сиды и сборку. Справочник городов он не переносит: для него нужны отдельные шаги ниже.

### 0. Один раз: клиент PostgreSQL нужной версии

Для локального PostgreSQL 17 и production PostgreSQL 18 используйте клиентские утилиты PostgreSQL **18**: `pg_dump` не может выгружать данные с сервера более новой major-версии. Проверяйте совместимость дампа и целевого сервера перед восстановлением.

```bash
brew list --versions | grep -i postgres   # что стоит
pg_dump --version                         # что в PATH

brew install postgresql@18                # если 18 нет
export PG_BIN_DIR=/opt/homebrew/opt/postgresql@18/bin
```

`PG_BIN_DIR` читают `cities:backup` и `cities:restore`. Без него утилиты берутся из `PATH`. Локальный сервер проекта остаётся PostgreSQL 17; `PG_BIN_DIR` меняет только используемые клиентские утилиты.

### 1. До сброса: снять дамп справочника

Пока старая БД жива (или с любой БД, где справочник уже заполнен):

```bash
npm run cities:backup        # → backups/cities-YYYYMMDD.dump
```

В дампе `City`, `Region`, `RegionalCapital`. Дамп нет — см. [вариант Б](#вариант-б-из-гар).

### 2. Порядок команд

| # | Что | Команда | Заполняет |
|---|-----|---------|-----------|
| 1 | Схема | `npm run db:migrate:deploy` (dev: `db:migrate:dev`) | таблицы, индексы и другие объекты схемы; миграции могут содержать преобразования данных |
| 2 | Города, регионы, столицы | `npm run cities:restore -- --file backups/cities-YYYYMMDD.dump` | `City`, `Region`, `RegionalCapital` |
| 3 | Категории услуг | `npm run db:seed` | `ServiceCategory` |
| 4 | Админ | зарегистрироваться на сайте, затем SQL ниже | `User.systemRole` |

```sql
UPDATE "User" SET "systemRole" = 'PLATFORM_ADMIN' WHERE email = 'you@example.com';
```

❌ Не заливать дамп напрямую через `pg_restore` / `psql`: столицы ссылаются на `City.id` источника, а restore переносит их по `garObjectId`.

### Вариант Б: из ГАР

Если дампа нет. Шаг 2 таблицы заменяется на:

```bash
# долго, нужен gar_xml.zip
npm run cities:update -- --mode full --zip "/Volumes/One Touch/Projects/novagor/cities/gar_xml.zip"

# в ГАР столиц нет — после городов:
npm run db:seed:capitals
```

### Проверка

```sql
SELECT
  (SELECT count(*) FROM "City" WHERE status = 'ACTIVE') AS cities,     -- ~176 тыс.
  (SELECT count(*) FROM "Region")                       AS regions,    -- 89–90
  (SELECT count(*) FROM "RegionalCapital")              AS capitals,   -- ~87
  (SELECT count(*) FROM "ServiceCategory")              AS categories;
```

В UI: `/pro/services/create`, поле «Локация» → «Свер» должно показать группу «Области» со Свердловской.

---

## Схема работы

**ГАР (~50 GB) парсится только локально.** На prod уходит дамп `"City"`, `"Region"` и `"RegionalCapital"` (~100–500 MB).

```text
┌─────────────────────────────────────────────────────────┐
│  Локальная машина (50 GB+ диск / external drive)        │
│  1. npm run cities:update -- --zip gar_xml.zip          │
│  2. npm run cities:backup → backups/cities-YYYYMMDD.dump│
└──────────────────────────┬──────────────────────────────┘
                           │ merge-restore (без DELETE)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Prod PostgreSQL 18 (Timeweb Cloud)                     │
│  npm run cities:restore -- --file backups/cities-….dump │
│  (с локального компа при разрешённом доступе к БД)      │
└─────────────────────────────────────────────────────────┘
```

**Почему не import в production:** архив `gar_xml.zip` занимает ~50+ GB; его обработка выполняется локально. На production передаётся только дамп справочника.

### Merge-restore (общие правила)

`DELETE FROM "City"` **не используем** — иначе обнулятся FK (`ON DELETE SET NULL`).

| Ситуация                            | Действие                                |
| ----------------------------------- | --------------------------------------- |
| `garObjectId` уже есть в целевой БД | UPDATE полей; `City.id` **сохраняется** |
| `garObjectId` новый                 | INSERT                                  |
| Есть в БД, нет в дампе              | **Не трогаем**                          |

**Первая заливка** (пустая `"City"`): тот же restore — все строки INSERT.  
**Повторные заливки:** prod `City.id` не меняются, даже если local reset перегенерировал UUID.

### Чего не делать

- ❌ `DELETE FROM "City"` + `pg_restore` / `psql` напрямую
- ❌ `cities:update` с download `gar_xml.zip` на prod-ВМ
- ❌ Restore без merge (сломает FK в заявках)

---

## Локально

Рабочая директория для import: `backend/`.  
Бэкап тоже из `backend/`, файлы кладутся в `backend/backups/`.

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

### 2. Бэкап `"City"` + `"Region"` + `"RegionalCapital"`

```bash
cd backend
npm run cities:backup                      # → backups/cities-YYYYMMDD.dump
npm run cities:backup -- --out /path/x.dump
```

Для локального PostgreSQL 17 и production PostgreSQL 18 используйте клиент PostgreSQL 18:

```bash
brew install postgresql@18
export PG_BIN_DIR=/opt/homebrew/opt/postgresql@18/bin   # берут cities:backup и cities:restore
```

Проверка: `pg_restore -l backups/cities-*.dump | grep "TABLE DATA"` — три таблицы.

### 3. Restore (dev)

```bash
cd backend
npm run cities:restore -- --file backups/cities-YYYYMMDD.dump
```

Merge по `garObjectId`: UPDATE существующих (prod `City.id` сохраняется), INSERT новых, без DELETE.
Опции: `--dry-run` — только загрузка staging и подсчёт строк.

---

## Production (Timeweb Cloud)

Production — управляемый PostgreSQL 18 в Timeweb Cloud. Актуальные параметры, ограничения сети и инструкции по резервному копированию — в [документации базы](database.md).

### Доступ к PostgreSQL

Возьмите строку подключения, порт и параметры TLS из панели Timeweb Cloud. Для запуска `cities:backup` и `cities:restore` с локального компьютера нужен разрешённый сетевой доступ к кластеру; при закрытой приватной сети используйте согласованный безопасный способ доступа. Не копируйте строку подключения в Git, чат или журнал команд.

Перед изменениями production убедитесь, что доступен актуальный бэкап и что `DATABASE_URL` указывает на нужную базу. Для этой операции нужен оператор с правами записи.

### Restore дампа на prod

1. Локально подготовьте дамп по разделу «Локально».
2. В безопасном окружении задайте `DATABASE_URL` для Timeweb и проверьте доступ. Используйте PostgreSQL client 18 (`PG_BIN_DIR` выше).
3. Из `backend/` выполните:

```bash
npm run cities:restore -- --file backups/cities-YYYYMMDD.dump
```

Это операция записи в production: скрипт выполняет merge справочника. После неё проверьте `GET /cities/suggest?q=Моск` на действующем backend.

### Бэкап и восстановление

`npm run cities:backup` сохраняет только справочники, а не всю базу. Для восстановления после сбоя нужны отдельные резервные копии всей БД в Timeweb, проверка их расписания и тест восстановления. Восстановление всего кластера может затронуть все данные, а не только города.

---

## Где лежит код

| Что | Путь |
|-----|------|
| Import GAR + reconcile | `backend/scripts/import-gar-cities.ts` → `npm run cities:update` |
| Reconcile SQL | `backend/scripts/import-gar-cities-reconcile.ts` |
| Restore merge | `backend/scripts/restore-city-dump.ts` → `npm run cities:restore` |
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

### `pg_dump: aborting because of server version mismatch`

`pg_dump` не поддерживает выгрузку с сервера более новой major-версии. Для production PostgreSQL 18 установите клиент 18: см. [шаг 0](#0-один-раз-клиент-postgresql-нужной-версии).
