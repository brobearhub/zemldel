#!/usr/bin/env bash
# terraform apply — только с CONFIRM_APPLY=1 (осознанное подтверждение).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${TF_DIR}/../.." && pwd)"
OUTPUTS_FILE="${ROOT_DIR}/deploy/terraform-outputs.env"
SECRETS_DIR="${ROOT_DIR}/deploy/.secrets"

if [[ "${CONFIRM_APPLY:-}" != "1" ]]; then
  echo "Отказ: для apply нужно CONFIRM_APPLY=1" >&2
  echo "Пример: CONFIRM_APPLY=1 ./scripts/apply.sh" >&2
  exit 1
fi

cd "${TF_DIR}"

if [[ ! -f tfplan ]]; then
  echo "Сначала: ./scripts/plan.sh" >&2
  exit 1
fi

terraform apply tfplan

terraform output -json > "${TF_DIR}/.terraform-outputs.json"
mkdir -p "${SECRETS_DIR}"
chmod 700 "${SECRETS_DIR}"

terraform output -raw postgres_database_url > "${SECRETS_DIR}/database.url" 2>/dev/null || true
terraform output -raw app_s3_access_key_id > "${SECRETS_DIR}/s3-access-key.id" 2>/dev/null || true
terraform output -raw app_s3_secret_key > "${SECRETS_DIR}/s3-secret.key" 2>/dev/null || true
chmod 600 "${SECRETS_DIR}/"* 2>/dev/null || true

{
  echo "# Сгенерировано $(date -u +%Y-%m-%dT%H:%M:%SZ) — не коммитить"
  echo "VM_PUBLIC_IP=$(terraform output -raw vm_public_ip 2>/dev/null || true)"
  echo "CR_REGISTRY=$(terraform output -raw container_registry_url 2>/dev/null || true)"
  echo "CDN_PROVIDER_CNAME=$(terraform output -raw cdn_provider_cname 2>/dev/null || true)"
  echo "LOCKBOX_SECRET_ID=$(terraform output -raw lockbox_secret_id 2>/dev/null || true)"
  echo "YA_S3_PUBLIC_BUCKET=$(terraform output -raw public_bucket_name 2>/dev/null || true)"
  echo "YA_S3_PRIVATE_BUCKET=$(terraform output -raw private_bucket_name 2>/dev/null || true)"
  echo "POSTGRES_RW_FQDN=$(terraform output -raw postgres_rw_fqdn 2>/dev/null || true)"
  if [[ -f "${SECRETS_DIR}/s3-access-key.id" ]]; then
    echo "YA_S3_KEY=$(cat "${SECRETS_DIR}/s3-access-key.id")"
  fi
  if [[ -f "${SECRETS_DIR}/s3-secret.key" ]]; then
    echo "YA_S3_SECRET=$(cat "${SECRETS_DIR}/s3-secret.key")"
  fi
} > "${OUTPUTS_FILE}"

chmod 600 "${OUTPUTS_FILE}"

echo ""
echo "Apply завершён."
echo "  ${OUTPUTS_FILE}"
echo "  ${SECRETS_DIR}/database.url (DATABASE_URL)"
echo ""
echo "Дальше:"
echo "  ${ROOT_DIR}/deploy/scripts/print-dns-instructions.sh"
echo "  ${ROOT_DIR}/deploy/scripts/generate-secrets.sh"
echo "  ${ROOT_DIR}/deploy/scripts/build-vm-env.sh"
