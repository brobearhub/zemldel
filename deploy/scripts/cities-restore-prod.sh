#!/usr/bin/env bash
# Fallback: merge-restore City dump на prod через SSH-туннель к Managed PostgreSQL.
# Основной сценарий — cities:restore с локального компа и prod DATABASE_URL (см. docs/cities.md).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DUMP_FILE="${1:-}"

if [[ -z "${DUMP_FILE}" || ! -f "${DUMP_FILE}" ]]; then
  echo "Usage: $0 <path-to-city-dump>" >&2
  echo "Пример: $0 backups/city-20260827.dump" >&2
  exit 1
fi

if [[ "${DUMP_FILE}" = /* ]]; then
  DUMP_ABS="${DUMP_FILE}"
else
  DUMP_ABS="${ROOT_DIR}/${DUMP_FILE}"
fi

if [[ ! -f "${DUMP_ABS}" ]]; then
  echo "Dump file not found: ${DUMP_ABS}" >&2
  exit 1
fi

DEPLOY_ENV="${ROOT_DIR}/deploy/.deploy.env"
if [[ -f "${DEPLOY_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${DEPLOY_ENV}"
fi

if [[ -f "${ROOT_DIR}/deploy/terraform-outputs.env" ]]; then
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/deploy/terraform-outputs.env"
fi

VM_HOST="${VM_HOST:-${VM_PUBLIC_IP:-}}"
VM_USER="${VM_USER:-ubuntu}"
SSH_KEY_PATH="${SSH_KEY_PATH:-${HOME}/.ssh/id_rsa}"
LOCAL_TUNNEL_PORT="${CITIES_RESTORE_TUNNEL_PORT:-15432}"

DATABASE_URL_FILE="${ROOT_DIR}/deploy/.secrets/database.url"
if [[ ! -f "${DATABASE_URL_FILE}" ]]; then
  echo "Missing ${DATABASE_URL_FILE}. Run terraform apply first." >&2
  exit 1
fi

DATABASE_URL="$(tr -d '\n' < "${DATABASE_URL_FILE}")"
POSTGRES_HOST="${POSTGRES_RW_FQDN:-}"

if [[ -z "${POSTGRES_HOST}" ]]; then
  POSTGRES_HOST="$(python3 - <<'PY'
import os, urllib.parse
url = os.environ["DATABASE_URL"]
print(urllib.parse.urlparse(url).hostname or "")
PY
)"
fi

if [[ -z "${POSTGRES_HOST}" ]]; then
  echo "Cannot resolve PostgreSQL host from DATABASE_URL / POSTGRES_RW_FQDN." >&2
  exit 1
fi

if [[ -z "${VM_HOST}" ]]; then
  echo "VM_HOST is not set (deploy/.deploy.env or terraform-outputs.env)." >&2
  exit 1
fi

TUNNEL_PID=""
cleanup() {
  if [[ -n "${TUNNEL_PID}" ]] && kill -0 "${TUNNEL_PID}" 2>/dev/null; then
    kill "${TUNNEL_PID}" 2>/dev/null || true
    wait "${TUNNEL_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "Opening SSH tunnel localhost:${LOCAL_TUNNEL_PORT} -> ${POSTGRES_HOST}:6432 via ${VM_USER}@${VM_HOST}"
ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new -N \
  -L "${LOCAL_TUNNEL_PORT}:${POSTGRES_HOST}:6432" \
  "${VM_USER}@${VM_HOST}" &
TUNNEL_PID=$!
sleep 2

if ! kill -0 "${TUNNEL_PID}" 2>/dev/null; then
  echo "SSH tunnel failed to start." >&2
  exit 1
fi

TUNNEL_DATABASE_URL="$(DATABASE_URL="${DATABASE_URL}" LOCAL_TUNNEL_PORT="${LOCAL_TUNNEL_PORT}" python3 - <<'PY'
import os
import urllib.parse

url = urllib.parse.urlparse(os.environ["DATABASE_URL"])
port = os.environ["LOCAL_TUNNEL_PORT"]
user = url.username or ""
password = url.password or ""
host = "127.0.0.1"
db = (url.path or "/").lstrip("/")
query = url.query
auth = ""
if user:
    auth = user
    if password:
        auth += f":{password}"
    auth += "@"
print(f"postgres://{auth}{host}:{port}/{db}" + (f"?{query}" if query else ""))
PY
)"

echo "Running merge-restore from ${DUMP_ABS}"
(
  cd "${ROOT_DIR}/backend"
  DATABASE_URL="${TUNNEL_DATABASE_URL}" npm run cities:restore -- --file "${DUMP_ABS}"
)

echo "City restore завершён."
