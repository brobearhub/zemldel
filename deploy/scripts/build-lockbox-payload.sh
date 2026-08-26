#!/usr/bin/env bash
# Собирает JSON для yc lockbox secret add-version → deploy/.secrets/lockbox-payload.json

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS="${ROOT_DIR}/deploy/.secrets/generated.env"
OUTPUTS="${ROOT_DIR}/deploy/terraform-outputs.env"
OUT="${ROOT_DIR}/deploy/.secrets/lockbox-payload.json"

if [[ ! -f "${SECRETS}" ]]; then
  echo "Сначала: ./deploy/scripts/generate-secrets.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${SECRETS}"

if [[ -f "${OUTPUTS}" ]]; then
  # shellcheck disable=SC1090
  source "${OUTPUTS}"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -n "${POSTGRES_RW_FQDN:-}" && -n "${TF_VAR_postgres_password:-}" ]]; then
    ENC_PASS="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${TF_VAR_postgres_password}''', safe=''))")"
    DATABASE_URL="postgres://zemledel:${ENC_PASS}@${POSTGRES_RW_FQDN}:6432/zemledel?sslmode=verify-full&target_session_attrs=read-write"
  else
    DATABASE_URL="REPLACE_ME"
    echo "WARN: DATABASE_URL=REPLACE_ME — задайте TF_VAR_postgres_password или добавьте DATABASE_URL в terraform-outputs" >&2
  fi
fi

export DATABASE_URL INTERNAL_API_SECRET SOCKET_JWT_SECRET NEXTAUTH_SECRET DOCUMENTS_MASTER_KEY_BASE64
export YA_S3_KEY="${YA_S3_KEY:-REPLACE_AFTER_TERRAFORM}"
export YA_S3_SECRET="${YA_S3_SECRET:-REPLACE_AFTER_TERRAFORM}"
export YA_S3_PRIVATE_BUCKET="${YA_S3_PRIVATE_BUCKET:-REPLACE_AFTER_TERRAFORM}"
export YA_S3_PUBLIC_BUCKET="${YA_S3_PUBLIC_BUCKET:-REPLACE_AFTER_TERRAFORM}"

python3 <<'PY' > "${OUT}"
import json, os
keys = [
    "DATABASE_URL", "INTERNAL_API_SECRET", "SOCKET_JWT_SECRET", "NEXTAUTH_SECRET",
    "DOCUMENTS_MASTER_KEY_BASE64", "YA_S3_KEY", "YA_S3_SECRET",
    "YA_S3_PRIVATE_BUCKET", "YA_S3_PUBLIC_BUCKET",
]
print(json.dumps([{"key": k, "text_value": os.environ[k]} for k in keys], ensure_ascii=False, indent=2))
PY

chmod 600 "${OUT}"
echo "Payload: ${OUT}"
echo ""
echo "Lockbox:"
echo "  yc lockbox secret add-version --id \"\${LOCKBOX_SECRET_ID}\" --payload \"file://${OUT}\""
