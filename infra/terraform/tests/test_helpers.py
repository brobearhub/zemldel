"""Exercise asynchronous actions without cloud writes or credentials."""
import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch


def load(name):
    path = Path(__file__).resolve().parents[1] / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


tls = load("ensure-cdn-tls")
@patch.dict(os.environ, {"CDN_ID": "123", "CDN_DOMAIN": "cdn.example.com", "CDN_TARGET": "edge.example.net"})
class CdnTlsTests(unittest.TestCase):
    def dns(self, value="edge.example.net.\n"):
        return patch.object(tls.subprocess, "run", return_value=SimpleNamespace(stdout=value))

    def test_wrong_dns_never_calls_api(self):
        with self.dns("wrong.example.net.\n"), patch.object(tls, "api") as api:
            with self.assertRaisesRegex(SystemExit, "CNAME not propagated"):
                tls.main()
        api.assert_not_called()

    def test_existing_valid_certificate_is_not_reissued(self):
        responses = [
            {"http_resource_configuration": {"security": {"certificate_id": 7}}},
            {"certificates": [{"id": 7, "domains": ["cdn.example.com"], "expires_at": "2099-01-01T00:00:00Z"}]},
            {},
        ]
        with self.dns(), patch.object(tls, "api", side_effect=responses) as api:
            tls.main()
        self.assertFalse(any(len(c.args) > 1 and c.args[1] == "POST" for c in api.call_args_list))
        self.assertEqual(api.call_args_list[-1].args[1], "PATCH")

    def test_existing_task_is_not_reissued_and_failure_is_detected(self):
        no_cert = {"http_resource_configuration": {"security": {}}}
        responses = [no_cert,
                     {"certificate_tasks": [{"id": 1, "resource_id": 123, "status": "in_progress"}]},
                     no_cert,
                     {"certificate_tasks": [{"id": 1, "resource_id": 123, "status": "failed"}]}]
        with self.dns(), patch.object(tls, "api", side_effect=responses) as api:
            with self.assertRaisesRegex(SystemExit, "issuance failed"):
                tls.main()
        self.assertFalse(any(len(c.args) > 1 and c.args[1] == "POST" for c in api.call_args_list))

    def test_new_task_is_issued_once_and_waits_for_attachment(self):
        no_cert = {"http_resource_configuration": {"security": {}}}
        responses = [no_cert, {"certificate_tasks": []}, {}, no_cert,
                     {"certificate_tasks": [{"id": 2, "resource_id": 123, "status": "in_progress"}]},
                     {"http_resource_configuration": {"security": {"certificate_id": 7}}},
                     {"certificates": [{"id": 7, "domains": ["cdn.example.com"], "expires_at": "2099-01-01T00:00:00Z"}]}, {}]
        with self.dns(), patch.object(tls, "api", side_effect=responses) as api, patch.object(tls.time, "sleep"):
            tls.main()
        self.assertEqual(sum(len(c.args) > 1 and c.args[1] == "POST" for c in api.call_args_list), 1)


if __name__ == "__main__":
    unittest.main()
