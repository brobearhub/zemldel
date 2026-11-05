#!/usr/bin/env python3
"""Set current CDN aliases in place, keeping the technical hostname."""
import json
import os
import re
import runpy
from pathlib import Path

# Reuse the token-safe HTTP client. run_path does not execute its main().
api = runpy.run_path(str(Path(__file__).with_name("ensure-cdn-tls.py")))["api"]


def main():
    resource_id = int(os.environ["CDN_ID"])
    domains = json.loads(os.environ["CDN_DOMAINS"])
    if (not isinstance(domains, list) or not domains
            or any(not isinstance(d, str) or not re.fullmatch(r"[a-z0-9.-]+", d) for d in domains)):
        raise SystemExit("CDN_DOMAINS must contain hostname strings")
    base = f"/api/v1/cdn/http-resources/{resource_id}"
    technical = api(base)["http_resource"]["cdn_domain"]
    config = api(base + "/configuration")["http_resource_configuration"]
    existing = (config.get("domains") or {}).get("aliases") or []
    aliases = list(dict.fromkeys([technical, *domains]))
    if len(aliases) > 3:
        raise SystemExit("CDN allows three aliases including the technical hostname. No changes were made.")
    if aliases == existing:
        print("CDN aliases already configured")
        return
    api(base, "PATCH", {"config": {"domains": {"aliases": aliases}}})
    actual = api(base + "/configuration")["http_resource_configuration"]
    actual_aliases = (actual.get("domains") or {}).get("aliases") or []
    if set(aliases) != set(actual_aliases) or actual_aliases[0] != technical:
        raise SystemExit("CDN alias update is not yet confirmed. Inspect the resource before retrying.")
    print("CDN aliases updated")


if __name__ == "__main__":
    main()
