#!/usr/bin/env bash
# Генерирует prod-секреты в deploy/.secrets/ (gitignored). DOCUMENTS_MASTER_KEY — сохраните офлайн!

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_DIR="${ROOT_DIR}/deploy/.secrets"
mkdir -p "${SECRETS_DIR}"
chmod 700 "${SECRETS_DIR}"

gen() { openssl rand -base64 32 | tr -d '\n'; }

INTERNAL_API_SECRET="$(gen)"
SOCKET_JWT_SECRET="$(gen)"
NEXTAUTH_SECRET="$(gen)"
DOCUMENTS_MASTER_KEY_BASE64="$(openssl rand 32 | base64 | tr -d '\n')"

cat > "${SECRETS_DIR}/generated.env" <<EOF
# Сгенерировано $(date -u +%Y-%m-%dT%H:%M:%SZ). НЕ коммитить.
INTERNAL_API_SECRET=${INTERNAL_API_SECRET}
SOCKET_JWT_SECRET=${SOCKET_JWT_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
DOCUMENTS_MASTER_KEY_BASE64=${DOCUMENTS_MASTER_KEY_BASE64}
EOF
chmod 600 "${SECRETS_DIR}/generated.env"

cp "${SECRETS_DIR}/generated.env" "${SECRETS_DIR}/documents-master-key-backup.txt"
chmod 600 "${SECRETS_DIR}/documents-master-key-backup.txt"

echo "Секреты: ${SECRETS_DIR}/generated.env"
echo ""
echo "ВАЖНО: скопируйте DOCUMENTS_MASTER_KEY_BASE64 в офлайн-хранилище:"
grep DOCUMENTS_MASTER_KEY "${SECRETS_DIR}/generated.env"
echo ""
echo "Дальше: ./deploy/scripts/build-lockbox-payload.sh"
