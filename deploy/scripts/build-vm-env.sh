#!/usr/bin/env bash
# Собирает /opt/zemledel/.env на ВМ из секретов + terraform outputs.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS="${ROOT_DIR}/deploy/.secrets/generated.env"
OUTPUTS="${ROOT_DIR}/deploy/terraform-outputs.env"
OUT="${ROOT_DIR}/deploy/.secrets/vm.env"

if [[ ! -f "${SECRETS}" ]]; then
  echo "Нет ${SECRETS}. Сначала: ./deploy/scripts/generate-secrets.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${SECRETS}"

if [[ -f "${OUTPUTS}" ]]; then
  # shellcheck disable=SC1090
  source "${OUTPUTS}"
fi

if [[ -f "${ROOT_DIR}/deploy/.secrets/database.url" ]]; then
  DATABASE_URL="$(cat "${ROOT_DIR}/deploy/.secrets/database.url")"
fi

CR_REGISTRY="${CR_REGISTRY:-REPLACE_CR_REGISTRY}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

cat > "${OUT}" <<EOF
CR_REGISTRY=${CR_REGISTRY}
IMAGE_TAG=${IMAGE_TAG}

NODE_ENV=production
NEXTAUTH_URL=https://zemledelpro.ru
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
BACKEND_API_URL=http://backend:3003
INTERNAL_API_SECRET=${INTERNAL_API_SECRET}
SOCKET_JWT_SECRET=${SOCKET_JWT_SECRET}

PORT=3003
SWAGGER_ENABLED=0
FRONTEND_URL=https://zemledelpro.ru
DATABASE_URL=${DATABASE_URL:-postgres://REPLACE}

DOCUMENTS_MASTER_KEY_BASE64=${DOCUMENTS_MASTER_KEY_BASE64}

YA_S3_ENDPOINT=https://storage.yandexcloud.net
YA_S3_REGION=ru-central1
YA_S3_KEY=${YA_S3_KEY:-REPLACE}
YA_S3_SECRET=${YA_S3_SECRET:-REPLACE}
YA_S3_PRIVATE_BUCKET=${YA_S3_PRIVATE_BUCKET:-REPLACE}
YA_S3_PUBLIC_BUCKET=${YA_S3_PUBLIC_BUCKET:-REPLACE}
YA_CDN_PUBLIC_BASE_URL=https://cdn.zemledelpro.ru
YA_S3_FORCE_PATH_STYLE=true

DOMAIN=zemledelpro.ru
CADDY_ADMIN_EMAIL=admin@zemledelpro.ru
EOF

chmod 600 "${OUT}"
echo "Файл для ВМ: ${OUT}"
echo ""
echo "Скопировать:"
echo "  scp deploy/.secrets/vm.env ubuntu@\${VM_PUBLIC_IP}:/opt/zemledel/.env"
echo "  scp deploy/Caddyfile deploy/docker-compose.prod.yml ubuntu@\${VM_PUBLIC_IP}:/opt/zemledel/"
