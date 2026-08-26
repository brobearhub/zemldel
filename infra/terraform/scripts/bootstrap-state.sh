#!/usr/bin/env bash
# Bootstrap Object Storage bucket + SA для Terraform remote state.
# Запуск: FOLDER_ID=b1gcdvf6jupvtiplmo6 ./scripts/bootstrap-state.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

FOLDER_ID="${FOLDER_ID:-b1gcdvf6jupvtiplmo6}"
STATE_BUCKET="${STATE_BUCKET:-prod-zemledel-terraform-state}"
SA_NAME="${SA_NAME:-prod-zemledel-terraform}"

echo "==> Проверка yc CLI"
if ! command -v yc >/dev/null 2>&1; then
  echo "Установите YC CLI: https://yandex.cloud/ru/docs/cli/quickstart" >&2
  exit 1
fi

if ! yc iam service-account list --folder-id "${FOLDER_ID}" --format json >/dev/null 2>&1; then
  echo "Ошибка доступа к folder ${FOLDER_ID}. Выполните: yc init" >&2
  exit 1
fi

echo "==> Сервисный аккаунт ${SA_NAME}"
if yc iam service-account get "${SA_NAME}" --folder-id "${FOLDER_ID}" >/dev/null 2>&1; then
  SA_ID="$(yc iam service-account get "${SA_NAME}" --folder-id "${FOLDER_ID}" --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
  echo "    уже существует: ${SA_ID}"
else
  yc iam service-account create --name "${SA_NAME}" --folder-id "${FOLDER_ID}"
  SA_ID="$(yc iam service-account get "${SA_NAME}" --folder-id "${FOLDER_ID}" --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
  echo "    создан: ${SA_ID}"
fi

echo "==> Роль storage.admin на каталог"
yc resource-manager folder add-access-binding "${FOLDER_ID}" \
  --role storage.admin \
  --subject "serviceAccount:${SA_ID}" \
  2>/dev/null || true

echo "==> Бакет ${STATE_BUCKET}"
if yc storage bucket get "${STATE_BUCKET}" >/dev/null 2>&1; then
  echo "    уже существует"
else
  yc storage bucket create --name "${STATE_BUCKET}" --default-storage-class standard --max-size 1073741824
  echo "    создан"
fi

KEY_FILE="${TF_DIR}/.terraform-state-key.json"
if [[ -f "${KEY_FILE}" ]]; then
  echo "==> Ключ SA уже сохранён в ${KEY_FILE} (не коммитить)"
else
  echo "==> Статический ключ для state backend"
  yc iam access-key create --service-account-id "${SA_ID}" --description "terraform-state" --format json > "${KEY_FILE}"
  chmod 600 "${KEY_FILE}"
  echo "    сохранён: ${KEY_FILE}"
fi

ACCESS_KEY="$(python3 -c "import json; print(json.load(open('${KEY_FILE}'))['access_key']['key_id'])")"
SECRET_KEY="$(python3 -c "import json; print(json.load(open('${KEY_FILE}'))['secret'])")"

BACKEND_HCL="${TF_DIR}/backend.hcl"
cat > "${BACKEND_HCL}" <<EOF
bucket                      = "${STATE_BUCKET}"
key                         = "prod/terraform.tfstate"
region                      = "ru-central1"
endpoint                    = "https://storage.yandexcloud.net"
access_key                  = "${ACCESS_KEY}"
secret_key                  = "${SECRET_KEY}"
skip_region_validation      = true
skip_credentials_validation = true
EOF
chmod 600 "${BACKEND_HCL}"

echo "==> backend.hcl записан: ${BACKEND_HCL}"
echo "==> terraform init -backend-config=backend.hcl"

cd "${TF_DIR}"
terraform init -backend-config=backend.hcl -reconfigure

echo ""
echo "Bootstrap готов. Дальше:"
echo "  ./scripts/generate-tfvars.sh"
echo "  export TF_VAR_postgres_password='...'"
echo "  ./scripts/plan.sh"
