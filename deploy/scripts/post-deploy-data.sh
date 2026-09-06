#!/usr/bin/env bash
# db:seed на prod ВМ (без импорта ГАР — City заливается дампом с локальной машины, см. docs/cities.md).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_ENV="${ROOT_DIR}/deploy/.deploy.env"

if [[ -f "${DEPLOY_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${DEPLOY_ENV}"
fi

VM_HOST="${VM_HOST:-}"
if [[ -z "${VM_HOST}" && -f "${ROOT_DIR}/deploy/terraform-outputs.env" ]]; then
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/deploy/terraform-outputs.env"
  VM_HOST="${VM_PUBLIC_IP:-}"
fi

VM_USER="${VM_USER:-ubuntu}"
SSH_KEY_PATH="${SSH_KEY_PATH:-${HOME}/.ssh/id_rsa}"
VM_DEPLOY_PATH="${VM_DEPLOY_PATH:-/opt/zemledel}"
COMPOSE="docker compose -f ${VM_DEPLOY_PATH}/docker-compose.prod.yml"

ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new "${VM_USER}@${VM_HOST}" bash -s <<EOF
set -euo pipefail
cd "${VM_DEPLOY_PATH}"
${COMPOSE} exec -T backend npm run db:seed
echo "Готово. Справочник City — через cities:restore с локальной машины (docs/cities.md)."
echo "Создайте PLATFORM_ADMIN вручную (SQL или admin-flow)."
EOF
