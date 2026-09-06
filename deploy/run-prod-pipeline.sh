#!/usr/bin/env bash
# Полный пайплайн prod-деплоя (интерактивные шаги помечены).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "=== Zemledel prod deploy ==="
echo ""
echo "Шаг 0: yc init (если ещё не сделано)"
echo "  yc init"
echo ""
read -r -p "Bootstrap state? [y/N] " b
if [[ "${b}" =~ ^[Yy]$ ]]; then
  "${ROOT_DIR}/infra/terraform/scripts/bootstrap-state.sh"
fi

read -r -p "generate-tfvars? [y/N] " g
if [[ "${g}" =~ ^[Yy]$ ]]; then
  "${ROOT_DIR}/infra/terraform/scripts/generate-tfvars.sh"
fi

if [[ -z "${TF_VAR_postgres_password:-}" ]]; then
  echo "export TF_VAR_postgres_password='...' и перезапустите plan"
fi

read -r -p "terraform plan? [y/N] " p
if [[ "${p}" =~ ^[Yy]$ ]]; then
  "${ROOT_DIR}/infra/terraform/scripts/plan.sh"
fi

echo ""
echo "Apply (~18k ₽/мес): CONFIRM_APPLY=1 ${ROOT_DIR}/infra/terraform/scripts/apply.sh"
echo ""
echo "После apply:"
echo "  ${ROOT_DIR}/deploy/scripts/print-dns-instructions.sh"
echo "  ${ROOT_DIR}/deploy/scripts/generate-secrets.sh"
echo "  ${ROOT_DIR}/deploy/scripts/build-lockbox-payload.sh"
echo "  ${ROOT_DIR}/deploy/scripts/build-vm-env.sh"
echo "  ${ROOT_DIR}/deploy/scripts/setup-vm-files.sh"
echo "  ${ROOT_DIR}/deploy/deploy.sh"
echo "  ${ROOT_DIR}/deploy/scripts/post-deploy-data.sh   # db:seed"
echo "  # City: docs/cities.md — cities:restore с локальной машины"
echo "  ${ROOT_DIR}/deploy/scripts/smoke-check.sh"
