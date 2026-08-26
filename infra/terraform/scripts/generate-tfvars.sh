#!/usr/bin/env bash
# Генерирует terraform.tfvars из окружения (файл gitignored).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT="${TF_DIR}/terraform.tfvars"

CLOUD_ID="${CLOUD_ID:-b1g40l910a4onvsk2ja2}"
FOLDER_ID="${FOLDER_ID:-b1gcdvf6jupvtiplmo6}"
DOMAIN="${DOMAIN:-zemledelpro.ru}"
CDN_DOMAIN="${CDN_DOMAIN:-cdn.zemledelpro.ru}"

if [[ -z "${OPERATOR_CIDR:-}" ]]; then
  PUBLIC_IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
  if [[ -n "${PUBLIC_IP}" ]]; then
    OPERATOR_CIDR="${PUBLIC_IP}/32"
    echo "OPERATOR_CIDR не задан — использую ${OPERATOR_CIDR}"
  else
    echo "Задайте OPERATOR_CIDR=ваш.ip.adress/32" >&2
    exit 1
  fi
fi

SSH_KEY="${SSH_PUBLIC_KEY_PATH:-${HOME}/.ssh/id_ed25519.pub}"
if [[ ! -f "${SSH_KEY}" ]]; then
  SSH_KEY="${HOME}/.ssh/id_rsa.pub"
fi
if [[ ! -f "${SSH_KEY}" ]]; then
  echo "SSH-ключ не найден. Задайте SSH_PUBLIC_KEY_PATH" >&2
  exit 1
fi

SSH_PUBLIC_KEY="$(cat "${SSH_KEY}")"

cat > "${OUT}" <<EOF
cloud_id       = "${CLOUD_ID}"
folder_id      = "${FOLDER_ID}"
domain         = "${DOMAIN}"
cdn_domain     = "${CDN_DOMAIN}"
operator_cidr  = "${OPERATOR_CIDR}"
ssh_public_key = "${SSH_PUBLIC_KEY}"
EOF
chmod 600 "${OUT}"

echo "Записан ${OUT}"
echo "Не забудьте: export TF_VAR_postgres_password='...'"
