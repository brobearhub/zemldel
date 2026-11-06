#!/usr/bin/env python3
"""Exercise passport storage using synthetic data and a short-lived runtime IAM token.

Requires the passport-terraform CLI profile and an applied Terraform root.
Only objects under a unique test prefix are touched; all their versions are removed.
No keys or tokens are printed or stored.
"""
import json
from pathlib import Path
import subprocess
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


# Python.org macOS installations may not include a CA bundle; use the OS bundle.
ca_file = "/etc/ssl/cert.pem" if sys.platform == "darwin" and Path("/etc/ssl/cert.pem").is_file() else None
TLS = ssl.create_default_context(cafile=ca_file)
HTTP = urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=TLS))


def request(method, url, token=None, body=None, headers=None):
    outgoing = dict(headers or {})
    if token:
        if not url.startswith("https://"):
            raise ValueError("Never send IAM credentials over HTTP")
        outgoing["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=outgoing, method=method)
    try:
        with HTTP.open(req, timeout=30) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)
    print(f"PASS: {message}", flush=True)


def main():
    settings = json.loads(subprocess.run(
        ["terraform", f"-chdir={ROOT}", "output", "-json", "passport_storage"],
        check=True, capture_output=True, text=True,
    ).stdout)
    admin = subprocess.run(
        ["yc", "--profile", "passport-terraform", "iam", "create-token"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    status, _, payload = request(
        "POST", "https://iam.api.cloud.yandex.net/iam/v1/tokens:createForServiceAccount",
        admin, json.dumps({"serviceAccountId": settings["service_account_id"]}).encode(),
        {"Content-Type": "application/json"},
    )
    require(status == 200, "short-lived runtime token issued")
    runtime = json.loads(payload)["iamToken"]
    base = f'{settings["endpoint"]}/{settings["bucket"]}'
    status, _, payload = request("GET", f"{base}?versioning", admin)
    require(status == 200, "bucket versioning configuration is readable")
    configuration = ET.fromstring(payload)
    for element in configuration.iter():
        element.tag = element.tag.rsplit("}", 1)[-1]
    require(configuration.findtext("Status") == "Suspended", "bucket versioning is suspended")
    run_id = uuid.uuid4().hex
    key = f"passports/_smoke/{run_id}/probe.json"
    outside = f"_smoke-outside/{run_id}/probe.json"
    headers = {
        "Content-Type": "application/json",
        "x-amz-server-side-encryption": "aws:kms",
        "x-amz-server-side-encryption-aws-kms-key-id": settings["kms_key_id"],
    }
    data = b'{"synthetic":true,"revision":1}'
    keys = [key, outside]

    def object_url(name):
        return f"{base}/{urllib.parse.quote(name, safe='/')}"

    def versions(token, name):
        query = urllib.parse.urlencode({"versions": "", "prefix": name})
        status, _, body = request("GET", f"{base}?{query}", token)
        if status != 200:
            raise RuntimeError(f"Version listing failed: HTTP {status}")
        tree = ET.fromstring(body)
        # The service may namespace the root but reset xmlns on individual entries.
        for element in tree.iter():
            element.tag = element.tag.rsplit("}", 1)[-1]
        if tree.tag != "ListVersionsResult":
            raise RuntimeError("Unexpected response to version listing")
        if tree.findtext("IsTruncated") != "false":
            raise RuntimeError("Unexpected pagination for isolated smoke-test objects")
        result = []
        for tag in ["Version", "DeleteMarker"]:
            for row in tree.findall(tag):
                object_key, version = row.findtext("Key"), row.findtext("VersionId")
                if not object_key or not version:
                    raise RuntimeError("Incomplete version listing entry")
                if object_key == name:
                    result.append((object_key, version))
        return result

    try:
        status, _, _ = request("PUT", object_url(key), runtime, data, {"Content-Type": "application/json"})
        require(status == 403, f"upload without encryption headers denied (HTTP {status})")
        wrong = dict(headers, **{"x-amz-server-side-encryption-aws-kms-key-id": "incorrect-key"})
        status, _, _ = request("PUT", object_url(key), runtime, data, wrong)
        require(status == 403, "upload with wrong KMS key denied")
        status, _, _ = request("PUT", object_url(outside), runtime, data, headers)
        require(status == 403, "runtime upload outside passports prefix denied")
        status, uploaded, _ = request("PUT", object_url(key), runtime, data, headers)
        require(status == 200, f"runtime encrypted upload succeeds (HTTP {status})")
        first_version = uploaded.get("x-amz-version-id")
        require(first_version in (None, "null"), "upload does not create a numbered version")
        require(versions(runtime, key) == [(key, "null")], "only the current null version exists")
        status, received, body = request("GET", object_url(key), runtime)
        require(status == 200 and body == data, "runtime download matches original JSON")
        require(received.get("x-amz-server-side-encryption") == "aws:kms"
                and received.get("x-amz-server-side-encryption-aws-kms-key-id") == settings["kms_key_id"],
                "object reports expected SSE-KMS key")
        require(request("GET", object_url(key))[0] == 403, "anonymous object access denied")
        require(request("GET", f"{base}?list-type=2")[0] == 403, "anonymous bucket listing denied")
        # Anonymous transport check only; never transmit a bearer token over HTTP.
        require(request("GET", object_url(key).replace("https://", "http://", 1))[0] == 403,
                "anonymous HTTP object access denied")
        replacement = b'{"synthetic":true,"revision":2}'
        status, updated, _ = request("PUT", object_url(key), runtime, replacement, headers)
        require(status == 200 and updated.get("x-amz-version-id") in (None, "null"),
                "overwrite does not create a numbered version")
        require(versions(runtime, key) == [(key, "null")], "overwrite retains no previous version")
        status, _, body = request("GET", object_url(key), runtime)
        require(status == 200 and body == replacement, "current object contains replacement JSON")
        require(request("DELETE", object_url(key), runtime)[0] == 204, "runtime can delete current object")
        require(request("GET", object_url(key), runtime)[0] == 404, "deleted object hidden by delete marker")
        saved_versions = versions(runtime, key)
        require(saved_versions == [(key, "null")], "only the null delete marker remains")
        for name, version in saved_versions:
            url = object_url(name) + "?" + urllib.parse.urlencode({"versionId": version})
            require(request("DELETE", url, runtime)[0] == 204, "runtime can erase a test version or delete marker")
        require(not versions(runtime, key), "all test versions and delete markers erased")
    finally:
        # Also clean any unexpected successful negative-test upload using the admin identity.
        for name in keys:
            for exact_key, version in versions(admin, name):
                url = object_url(exact_key) + "?" + urllib.parse.urlencode({"versionId": version})
                if request("DELETE", url, admin)[0] != 204:
                    raise RuntimeError("Failed to clean a synthetic test object version")
        require(all(not versions(admin, name) for name in keys), "test cleanup confirmed")


if __name__ == "__main__":
    main()
