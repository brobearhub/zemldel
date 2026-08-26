#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${TF_DIR}"

if [[ ! -f terraform.tfvars ]]; then
  echo "Сначала: ./scripts/generate-tfvars.sh" >&2
  exit 1
fi

if [[ -z "${TF_VAR_postgres_password:-}" ]]; then
  echo "Задайте: export TF_VAR_postgres_password='...'" >&2
  exit 1
fi

if [[ ! -f backend.hcl ]]; then
  echo "Сначала: ./scripts/bootstrap-state.sh" >&2
  exit 1
fi

terraform init -backend-config=backend.hcl
terraform plan -out=tfplan

echo ""
echo "Plan сохранён в tfplan. Для apply:"
echo "  CONFIRM_APPLY=1 ./scripts/apply.sh"
