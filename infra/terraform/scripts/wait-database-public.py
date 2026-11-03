#!/usr/bin/env python3
"""Wait for the managed database to report an active public connection."""
import json
import os
import subprocess
import time


def main():
    cluster_id = os.environ["CLUSTER_ID"]
    token = os.environ["TWC_TOKEN"]
    if not cluster_id.isdecimal() or any(c in token for c in '\r\n"\\'):
        raise SystemExit("Invalid cluster ID or token format")
    require_tls = os.environ.get("REQUIRE_TLS") == "true"
    deadline = time.monotonic() + (120 if require_tls else 1800)
    while time.monotonic() < deadline:
        result = subprocess.run(
            ["curl", "--silent", "--show-error", "--fail", "--max-time", "30",
             "--config", "-", f"https://api.timeweb.cloud/api/v1/databases/{cluster_id}"],
            input=f'header = "Authorization: Bearer {token}"\n',
            text=True, capture_output=True, check=False,
        )
        if result.returncode:
            raise SystemExit(f"Database status request failed (curl code {result.returncode})")
        database = json.loads(result.stdout)["db"]
        public_ready = database.get("is_enabled_public_network") is True
        tls_ready = not require_tls or database.get("is_secure_connection_enabled") is True
        if database["status"] == "started" and public_ready and tls_ready:
            print("Database public network and requested security are ready")
            return
        if database["status"] in {"error", "blocked", "no_paid", "stopped"}:
            raise SystemExit(f"Database cannot proceed: {database['status']}")
        print("Waiting for the database public network and requested security", flush=True)
        time.sleep(15)
    raise SystemExit("Timed out waiting for database public network or TLS; inspect Timeweb panel")


if __name__ == "__main__":
    main()
