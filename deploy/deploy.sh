#!/usr/bin/env bash
# Фасад деплоя: сборка образов → push в Container Registry → pull/up на ВМ.
# Запуск: из корня репозитория, после заполнения deploy/.deploy.env (см. deploy/.deploy.env.example).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy"
CONFIG_FILE="${DEPLOY_DIR}/.deploy.env"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Создайте ${CONFIG_FILE} из deploy/.deploy.env.example" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${CONFIG_FILE}"

: "${CR_REGISTRY:?CR_REGISTRY обязателен}"
: "${VM_HOST:?VM_HOST обязателен}"
: "${VM_USER:=ubuntu}"
: "${VM_DEPLOY_PATH:=/opt/zemledel}"
: "${SSH_KEY_PATH:?SSH_KEY_PATH обязателен}"

GIT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
IMAGE_TAG="${IMAGE_TAG:-${GIT_SHA}}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

FRONTEND_IMAGE="${CR_REGISTRY}/prod-frontend"
BACKEND_IMAGE="${CR_REGISTRY}/prod-backend"

echo "==> Сборка образов (tag: ${IMAGE_TAG}, ${TIMESTAMP})"

if [[ -n "${YC_CR_TOKEN:-}" ]]; then
  echo "${YC_CR_TOKEN}" | docker login --username oauth --password-stdin cr.yandex
fi

docker build -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" -t "${FRONTEND_IMAGE}:latest" "${ROOT_DIR}/frontend"
docker build -t "${BACKEND_IMAGE}:${IMAGE_TAG}" -t "${BACKEND_IMAGE}:latest" "${ROOT_DIR}/backend"

echo "==> Push в Container Registry"
docker push "${FRONTEND_IMAGE}:${IMAGE_TAG}"
docker push "${FRONTEND_IMAGE}:latest"
docker push "${BACKEND_IMAGE}:${IMAGE_TAG}"
docker push "${BACKEND_IMAGE}:latest"

REMOTE_COMPOSE="cd ${VM_DEPLOY_PATH} && docker compose -f docker-compose.prod.yml"

echo "==> Деплой на ${VM_USER}@${VM_HOST}"
ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new "${VM_USER}@${VM_HOST}" bash -s <<EOF
set -euo pipefail
cd "${VM_DEPLOY_PATH}"
if [[ -f .env ]]; then
  if grep -q '^CR_REGISTRY=' .env; then
    sed -i "s|^CR_REGISTRY=.*|CR_REGISTRY=${CR_REGISTRY}|" .env
  else
    echo "CR_REGISTRY=${CR_REGISTRY}" >> .env
  fi
  if grep -q '^IMAGE_TAG=' .env; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" .env
  else
    echo "IMAGE_TAG=${IMAGE_TAG}" >> .env
  fi
else
  echo "Ошибка: ${VM_DEPLOY_PATH}/.env не найден. Создайте из env.prod.example + Lockbox." >&2
  exit 1
fi
if [[ -n "${YC_CR_TOKEN:-}" ]]; then
  echo "${YC_CR_TOKEN}" | docker login --username oauth --password-stdin cr.yandex
fi
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps
EOF

echo "==> Готово. Образы: ${IMAGE_TAG}"
