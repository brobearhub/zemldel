"""Verify domain cutover without real API writes."""
import os
import unittest
from unittest.mock import patch

from test_helpers import load

domains = load("ensure-cdn-domains")


def configuration(aliases):
    return {"http_resource_configuration": {"domains": {"aliases": aliases}}}


@patch.dict(os.environ, {"CDN_ID": "123", "CDN_DOMAINS": '["cdn.example.com"]'})
class CdnDomainTests(unittest.TestCase):
    def test_replaces_previous_alias_but_keeps_technical_domain_first(self):
        expected = ["edge.example.net", "cdn.example.com"]
        responses = [
            {"http_resource": {"cdn_domain": "edge.example.net"}},
            configuration(["edge.example.net", "cdn.old.example"]),
            {},
            configuration(expected),
        ]
        with patch.object(domains, "api", side_effect=responses) as api:
            domains.main()
        self.assertEqual(api.call_args_list[2].args, (
            "/api/v1/cdn/http-resources/123", "PATCH",
            {"config": {"domains": {"aliases": expected}}},
        ))

    def test_matching_configuration_does_not_write(self):
        responses = [
            {"http_resource": {"cdn_domain": "edge.example.net"}},
            configuration(["edge.example.net", "cdn.example.com"]),
        ]
        with patch.object(domains, "api", side_effect=responses) as api:
            domains.main()
        self.assertTrue(all(len(call.args) == 1 for call in api.call_args_list))

    def test_unconfirmed_update_fails(self):
        responses = [
            {"http_resource": {"cdn_domain": "edge.example.net"}},
            configuration(["edge.example.net"]), {},
            configuration(["edge.example.net"]),
        ]
        with patch.object(domains, "api", side_effect=responses):
            with self.assertRaisesRegex(SystemExit, "not yet confirmed"):
                domains.main()

    def test_invalid_input_never_calls_api(self):
        with patch.dict(os.environ, {"CDN_DOMAINS": '["https://cdn.example.com"]'}), patch.object(domains, "api") as api:
            with self.assertRaises(SystemExit):
                domains.main()
        api.assert_not_called()


if __name__ == "__main__":
    unittest.main()
