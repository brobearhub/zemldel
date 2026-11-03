import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch


path = Path(__file__).resolve().parents[1] / "scripts" / "wait-database-public.py"
spec = importlib.util.spec_from_file_location("wait_database_public", path)
waiter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(waiter)


class DatabaseTlsReadinessTest(unittest.TestCase):
    @patch.dict(os.environ, {"CLUSTER_ID": "123", "TWC_TOKEN": "test-token", "REQUIRE_TLS": "true"})
    def test_waits_until_api_confirms_tls(self):
        responses = [
            SimpleNamespace(returncode=0, stdout='{"db":{"status":"started","is_enabled_public_network":true,"is_secure_connection_enabled":false}}'),
            SimpleNamespace(returncode=0, stdout='{"db":{"status":"started","is_enabled_public_network":true,"is_secure_connection_enabled":true}}'),
        ]
        with patch.object(waiter.subprocess, "run", side_effect=responses) as run, patch.object(waiter.time, "sleep"):
            waiter.main()
        self.assertEqual(run.call_count, 2)
        self.assertNotIn("test-token", " ".join(run.call_args.args[0]))

    @patch.dict(os.environ, {"CLUSTER_ID": "123", "TWC_TOKEN": "test-token", "REQUIRE_TLS": "true"})
    def test_fails_when_tls_remains_disabled(self):
        response = SimpleNamespace(returncode=0, stdout='{"db":{"status":"started","is_enabled_public_network":true,"is_secure_connection_enabled":false}}')
        with patch.object(waiter.subprocess, "run", return_value=response), patch.object(waiter.time, "sleep"), patch.object(waiter.time, "monotonic", side_effect=[0, 1, 121]):
            with self.assertRaisesRegex(SystemExit, "TLS"):
                waiter.main()


if __name__ == "__main__":
    unittest.main()
