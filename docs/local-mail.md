# Локальная почта — MailCatcher

Запуск из корня проекта:

```sh
docker compose -p zemldel-mail -f docker-compose.mail.yml up -d
```

В `backend/.env` для backend, запущенного на хосте:

```dotenv
FRONTEND_URL="http://localhost:4000"
SMTP_HOST="127.0.0.1"
SMTP_PORT="1026"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="Земледел <noreply@zemledel.test>"
```

После изменения переменных перезапустите backend (`npm run start:dev` из `backend`).
Откройте http://localhost:1081 — здесь появляются перехваченные письма.
Для проверки отправьте форму http://localhost:4000/forgot-password с email
существующего тестового аккаунта. Откройте письмо и ссылку восстановления.
Письма остаются локально и не отправляются в реальные почтовые ящики.

Порты привязаны к loopback. Выбраны 1026/1081, поскольку на этой машине
1025/1080 заняты MailCatcher другого проекта. Не используйте эту конфигурацию
для production. Сообщения временные: пересоздание контейнера очищает ящик.

Остановка без воздействия на остальные Docker-сервисы:

```sh
docker compose -p zemldel-mail -f docker-compose.mail.yml stop
```

Чтобы вернуть вывод ссылок в терминал backend, очистите `SMTP_HOST` и
перезапустите backend.

Документация MailCatcher: https://github.com/sj26/mailcatcher

## Отправка через Yandex Cloud Postbox по HTTPS

В окружении, где SMTP-порты закрыты, используйте HTTPS сразу:

```dotenv
MAIL_TRANSPORT="postbox"
SMTP_FROM="reset-password@zemledel.ru"
POSTBOX_ACCESS_KEY_ID="идентификатор-статического-ключа"
POSTBOX_SECRET_ACCESS_KEY="секретная-часть-статического-ключа"
```

Ключ должен принадлежать сервисному аккаунту с ролью `postbox.sender` и доступом к адресу Postbox. Это **статический ключ доступа**, а не API-ключ для SMTP. Секрет задаётся только в защищённых переменных окружения. После изменения переменных необходимо перезапустить backend. Postbox должен подтвердить домен отправителя.

В других окружениях можно сохранить SMTP и включить запасной Postbox через `MAIL_POSTBOX_FALLBACK="true"` с теми же `POSTBOX_*` и `SMTP_FROM`. При ошибке установки SMTP-соединения приложение переключится на HTTPS. Если результат отправки по SMTP неоднозначен, автоматического повтора нет, чтобы не отправить письмо дважды. При отсутствии `MAIL_TRANSPORT` используется существующее поведение SMTP/MailCatcher.

Документация: https://yandex.cloud/ru/docs/postbox/operations/send-email
