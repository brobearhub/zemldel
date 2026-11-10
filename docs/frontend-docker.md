# Frontend через Docker в Timeweb App Platform

`frontend/Dockerfile` использует три этапа: установка по `package-lock.json`,
`npm run build` и запуск standalone-сервера Next.js через `node server.js`.
В финальный образ копируются `.next/standalone`, `.next/static` и `public`.
Процесс работает от пользователя `node`, слушает `0.0.0.0:3000`.
Настройка `output: "standalone"` в `frontend/next.config.mjs` обязательна.

## Настройки App Platform

1. Выбрать репозиторий и нужную ветку, фреймворк **Dockerfile**.
2. В поле **Путь до директории проекта** указать `frontend`.
   Контекст сборки — каталог `frontend`, Dockerfile — `frontend/Dockerfile`.
3. Порт контейнера — `3000` (задан через `EXPOSE`). Оставить `PORT=3000`
   и `HOSTNAME=0.0.0.0`; внешние HTTPS и домен настраиваются в App Platform.
4. Путь проверки состояния — `/maintenance`. Эта страница отвечает без backend;
   проверка подтверждает работу Next.js, но не доступность API или базы данных.
5. Перенести переменные текущего frontend-приложения по таблицам ниже.
   Команды сборки и запуска уже заданы в Dockerfile; `next start` не требуется.

Backend продолжает работать отдельным приложением. Docker frontend не запускает
Nest, PostgreSQL, миграции или фоновые задачи.

## Переменные сборки

В панели App Platform задать следующие значения до деплоя. Dockerfile объявляет
их через `ARG`, чтобы они были доступны во время `npm run build`.

| Переменная | Значение |
| --- | --- |
| `NEXTAUTH_URL` | Публичный HTTPS-адрес frontend. Для production — `https://zemledel.ru`. Нужен также при запуске. |
| `NEXT_PUBLIC_APP_ENV` | `production` по умолчанию; отключает Redux DevTools. |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | Публичный HTTPS-адрес Nest, например `https://api.zemledel.ru`. |
| `NEXT_PUBLIC_S3_ENDPOINT` | Текущее значение frontend для публичного хранилища, если используется. |
| `NEXT_PUBLIC_S3_PUBLIC_BUCKET` | Текущее имя публичного бакета, если используется. |
| `NEXT_PUBLIC_S3_FORCE_PATH_STYLE` | Сохранить текущее значение `true`/`false`; по умолчанию `false`. |

`NEXT_PUBLIC_*` встраиваются в браузерный код, а настройки разрешённых изображений
сохраняются в standalone-конфигурации. После изменения этих значений нужна новая
сборка; одного перезапуска контейнера недостаточно. `NEXTAUTH_URL` влияет также
на предварительно сгенерированные метаданные и `robots.txt`, поэтому его изменение
тоже требует пересборки. Для testing использовать адреса и бакет testing.

Если `NEXT_PUBLIC_CHAT_SOCKET_URL` не задан, клиент обращается к `/socket.io` на
домене frontend. Для отдельных приложений App Platform нужно явно указать адрес
backend либо обеспечить проксирование `/socket.io` на Nest. Backend должен
разрешать origin frontend в текущих настройках CORS.

## Переменные запуска

Сохранить в окружении контейнера те же значения, что у текущего frontend:

| Переменная | Назначение |
| --- | --- |
| `NEXTAUTH_URL` | Тот же внешний адрес, что при сборке. |
| `NEXTAUTH_SECRET` | Текущий секрет NextAuth; сохранить для действующих сессий. |
| `BACKEND_API_URL` | Доступный из контейнера адрес Nest, например `https://api.zemledel.ru`. `localhost` здесь означает сам контейнер frontend. |
| `INTERNAL_API_SECRET` | Тот же секрет, что у backend. |
| `SOCKET_JWT_SECRET` | Тот же секрет, что у backend. |
| `MAINTENANCE_MODE` | Необязательно: `true` включает страницу технических работ. |

Секреты передаются при запуске контейнера через настройки платформы. Они не
объявлены как `ARG`, не нужны для сборки и не должны сохраняться в образе.
Локальные `.env*` исключены из контекста Docker через `.dockerignore`.

## Проверка локально

Из корня репозитория, для примера с production-адресами:

```sh
docker build -f frontend/Dockerfile \
  --build-arg NEXTAUTH_URL=https://zemledel.ru \
  --build-arg NEXT_PUBLIC_CHAT_SOCKET_URL=https://api.zemledel.ru \
  -t zemledel-frontend:local frontend
```

Если используются `NEXT_PUBLIC_S3_*`, добавить их как `--build-arg NAME=value`
с текущими публичными значениями. Сборка загружает Google Fonts и npm-пакеты,
поэтому ей нужен доступ к сети.

Создать вне Git файл с переменными запуска в формате `KEY=value` без кавычек
и передать его через `--env-file`:

```sh
docker run --rm --name zemledel-frontend-check \
  -p 4001:3000 --env-file /absolute/path/frontend-runtime.env \
  zemledel-frontend:local
```

Для локальной проверки входа использовать `NEXTAUTH_URL=http://localhost:4001`
и при сборке, и при запуске; origin также должен быть разрешён backend.

```sh
curl -f http://localhost:4001/maintenance
curl -f http://localhost:4001/api/auth/providers
curl -f http://localhost:4001/favicon.ico -o /dev/null
```

После деплоя проверить на целевом домене главную, вход с существующей учётной
записью, запросы к backend, картинки через `/_next/image` и подключение чата.
Успешная сборка и healthcheck сами по себе не проверяют эти интеграции.

## Источники

- [Официальный Dockerfile Next.js](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)
- [Next.js: standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Timeweb: деплой из Dockerfile](https://timeweb.cloud/docs/apps/deploying-with-dockerfile)
- [Timeweb: переменные приложения](https://timeweb.cloud/docs/apps/variables)
