#!/usr/bin/env bash
# Базовый smoke после деплоя.

set -euo pipefail

DOMAIN="${DOMAIN:-zemledelpro.ru}"
CDN="${CDN_DOMAIN:-cdn.zemledelpro.ru}"
FAIL=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "OK  ${name}"
  else
    echo "FAIL ${name}"
    FAIL=1
  fi
}

check "HTTPS сайт" curl -fsS -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" | grep -qE '^200|301|302$'
check "Swagger выключен" bash -c '! curl -fsS "https://${DOMAIN}/api" 2>/dev/null | head -c 200 | grep -qi swagger' || curl -fsS -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api" 2>/dev/null | grep -qv 200
check "CDN резолвится" curl -fsS -o /dev/null --max-time 10 "https://${CDN}/" 2>/dev/null || host "${CDN}" >/dev/null 2>&1

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo "Smoke пройден (базовый). Проверьте вручную: логин, чат, аватар, приватный файл."
else
  echo "Есть ошибки smoke."
  exit 1
fi
