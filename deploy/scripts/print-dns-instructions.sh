#!/usr/bin/env bash
# Инструкции DNS после terraform apply.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUTS_JSON="${ROOT_DIR}/infra/terraform/.terraform-outputs.json"
OUTPUTS_ENV="${ROOT_DIR}/deploy/terraform-outputs.env"

if [[ -f "${OUTPUTS_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${OUTPUTS_ENV}"
fi

VM_IP="${VM_PUBLIC_IP:-}"
CDN_CNAME="${CDN_PROVIDER_CNAME:-}"

if [[ -z "${VM_IP}" && -f "${OUTPUTS_JSON}" ]]; then
  VM_IP="$(python3 -c "import json; d=json.load(open('${OUTPUTS_JSON}')); print(d.get('vm_public_ip',{}).get('value',''))" 2>/dev/null || true)"
  CDN_CNAME="$(python3 -c "import json; d=json.load(open('${OUTPUTS_JSON}')); print(d.get('cdn_provider_cname',{}).get('value',''))" 2>/dev/null || true)"
fi

if [[ -z "${VM_IP}" ]]; then
  echo "Нет outputs. Сначала: CONFIRM_APPLY=1 infra/terraform/scripts/apply.sh" >&2
  exit 1
fi

echo "=== DNS для zemledelpro.ru ==="
echo ""
echo "1. A-запись (сайт, Caddy + Let's Encrypt):"
echo "   zemledelpro.ru  ->  ${VM_IP}"
echo ""
echo "2. CDN — после выпуска сертификата Certificate Manager:"
echo "   cdn.zemledelpro.ru  CNAME  ${CDN_CNAME:-<cdn_provider_cname из terraform output>}"
echo ""
echo "3. DNS-challenge для CDN-сертификата:"
if [[ -f "${OUTPUTS_JSON}" ]]; then
  python3 <<'PY' "${OUTPUTS_JSON}" 2>/dev/null || echo "   terraform output cdn_certificate_dns_records"
import json, sys
d = json.load(open(sys.argv[1]))
ch = d.get("cdn_certificate_dns_records", {}).get("value", [])
if not ch:
    print("   (пусто — проверьте terraform output cdn_certificate_dns_records)")
else:
    for c in ch:
        print(f"   {c}")
PY
else
  echo "   cd infra/terraform && terraform output cdn_certificate_dns_records"
fi
echo ""
echo "Порядок: сначала A на ВМ, затем challenge + CNAME CDN."
echo "Старый cdn.zemledel.pro не затрагивается."
