#!/usr/bin/env bash
# Копирует compose/Caddyfile/.env на ВМ.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_ENV="${ROOT_DIR}/deploy/.deploy.env"

if [[ -f "${DEPLOY_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${DEPLOY_ENV}"
fi

VM_HOST="${VM_HOST:-${VM_PUBLIC_IP:-}}"
VM_USER="${VM_USER:-ubuntu}"
SSH_KEY_PATH="${SSH_KEY_PATH:-${HOME}/.ssh/id_rsa}"
VM_DEPLOY_PATH="${VM_DEPLOY_PATH:-/opt/zemledel}"

if [[ -z "${VM_HOST}" ]]; then
  if [[ -f "${ROOT_DIR}/deploy/terraform-outputs.env" ]]; then
    # shellcheck disable=SC1090
    source "${ROOT_DIR}/deploy/terraform-outputs.env"
    VM_HOST="${VM_PUBLIC_IP:-}"
  fi
fi

if [[ -z "${VM_HOST}" ]]; then
  echo "Задайте VM_HOST в deploy/.deploy.env или terraform-outputs.env" >&2
  exit 1
fi

SSH=(ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new "${VM_USER}@${VM_HOST}")
SCP=(scp -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new)

"${SSH[@]}" "mkdir -p ${VM_DEPLOY_PATH} && chown ${VM_USER}:${VM_USER} ${VM_DEPLOY_PATH}"

"${SCP[@]}" "${ROOT_DIR}/deploy/Caddyfile" "${ROOT_DIR}/deploy/docker-compose.prod.yml" \
  "${VM_USER}@${VM_HOST}:${VM_DEPLOY_PATH}/"

if [[ -f "${ROOT_DIR}/deploy/.secrets/vm.env" ]]; then
  "${SCP[@]}" "${ROOT_DIR}/deploy/.secrets/vm.env" "${VM_USER}@${VM_HOST}:${VM_DEPLOY_PATH}/.env"
  "${SSH[@]}" "chmod 600 ${VM_DEPLOY_PATH}/.env"
else
  echo "WARN: deploy/.secrets/vm.env нет — запустите build-vm-env.sh" >&2
fi

echo "Файлы на ${VM_USER}@${VM_HOST}:${VM_DEPLOY_PATH}"
