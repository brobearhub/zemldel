#!/usr/bin/env python3
"""Issue/attach Timeweb-managed CDN TLS after DNS is ready. Run by second apply."""
import json
import os
import subprocess
import time
from datetime import datetime, timezone


def api(path, method="GET", data=None):
    token = os.environ["TWC_TOKEN"]
    if any(char in token for char in '\r\n"\\'):
        raise SystemExit("Invalid token format")
    args = ["curl", "--silent", "--show-error", "--fail", "--max-time", "60",
            "--config", "-", "--request", method, "https://api.timeweb.cloud" + path]
    if data is not None:
        args += ["--header", "Content-Type: application/json", "--data", json.dumps(data)]
    result = subprocess.run(args, input=f'header = "Authorization: Bearer {token}"\n',
                            text=True, capture_output=True, check=False)
    if result.returncode:
        raise SystemExit(f"Timeweb {method} failed (curl code {result.returncode}); inspect the CDN panel")
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main():
    resource_id = int(os.environ["CDN_ID"])
    domain = os.environ["CDN_DOMAIN"]
    target = os.environ["CDN_TARGET"].rstrip(".")
    dns = subprocess.run(["dig", "+short", "CNAME", domain],
                         text=True, capture_output=True, check=True)
    if target not in [line.rstrip(".") for line in dns.stdout.splitlines()]:
        raise SystemExit("CDN CNAME not propagated. Finish DNS delegation before enabling TLS.")

    base = f"/api/v1/cdn/http-resources/{resource_id}"

    def certificate_ready():
        config = api(base + "/configuration")["http_resource_configuration"]
        # A replacement certificate must keep all custom aliases working.
        aliases = (config.get("domains") or {}).get("aliases") or []
        required_domains = {domain, *(alias for alias in aliases if alias.rstrip(".") != target)}
        certificate_id = (config.get("security") or {}).get("certificate_id")
        if not certificate_id:
            return False
        certificates = api("/api/v1/cdn/certificates")["certificates"]
        return any(c["id"] == certificate_id and required_domains.issubset(set(c["domains"]))
                   and datetime.fromisoformat(c["expires_at"].replace("Z", "+00:00")) > datetime.now(timezone.utc)
                   for c in certificates)

    if not certificate_ready():
        tasks = api("/api/v1/cdn/certificates/tasks")["certificate_tasks"]
        active = [t for t in tasks if t["resource_id"] == resource_id and t["status"] == "in_progress"]
        active_ids = {t["id"] for t in active}
        previous_ids = {t["id"] for t in tasks}
        if not active:
            # No automatic retry of POST: a timeout may still have created a task.
            api("/api/v1/cdn/certificates/issue", "POST", {"resource_id": resource_id})
        deadline = time.monotonic() + 1800
        while not certificate_ready():
            tasks = api("/api/v1/cdn/certificates/tasks")["certificate_tasks"]
            failed = [t for t in tasks if t["resource_id"] == resource_id
                      and (t["id"] not in previous_ids or t["id"] in active_ids) and t["status"] == "failed"]
            if failed:
                raise SystemExit("CDN certificate issuance failed; inspect Timeweb certificate task")
            if time.monotonic() >= deadline:
                raise SystemExit("Timed out waiting for CDN certificate; inspect panel before retrying")
            print("Waiting for CDN certificate", flush=True)
            time.sleep(15)
    api(base, "PATCH", {"config": {"security": {"redirect": True}}})
    print("CDN certificate attached; HTTPS redirect enabled")


if __name__ == "__main__":
    main()
