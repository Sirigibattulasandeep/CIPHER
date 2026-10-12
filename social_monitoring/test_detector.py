
import unittest

from detector import (
    BrandProfile,
    SocialAccount,
    assess_account,
    name_similarity,
    safe_external_domain,
    domain_matches_official,
)


class TestSentrixDetector(unittest.TestCase):

    def setUp(self):
        self.brand = BrandProfile(
            name="Northstar",
            official_handles=["@northstar"],
            official_domains=["northstar.example"],
        )

    def test_official_handle_has_zero_name_risk(self):
        account = SocialAccount(
            platform="DemoSocial",
            handle="@northstar",
            display_name="Northstar",
            urls=["https://northstar.example"],
        )

        result = assess_account(self.brand, account)

        self.assertEqual(result["risk_score"], 0)
        self.assertFalse(result["review_required"])

    def test_suspicious_account_is_flagged(self):
        account = SocialAccount(
            platform="DemoSocial",
            handle="@northstar_support24",
            display_name="Northstar Official Support",
            bio="Claim your prize after paying a processing fee.",
            urls=["https://northstar-rewards.example"],
            logo_similarity=0.94,
        )

        result = assess_account(self.brand, account)

        self.assertEqual(result["risk_level"], "high")
        self.assertTrue(result["review_required"])
        self.assertGreaterEqual(result["risk_score"], 70)

    def test_fan_account_remains_low_risk(self):
        account = SocialAccount(
            platform="DemoSocial",
            handle="@northstar_fan_club",
            display_name="Northstar Fan Club",
        )

        result = assess_account(self.brand, account)

        self.assertEqual(result["risk_level"], "low")
        self.assertFalse(result["review_required"])

    def test_official_domain_matches(self):
        self.assertTrue(
            domain_matches_official(
                "northstar.example",
                "northstar.example",
            )
        )

    def test_real_subdomain_matches(self):
        self.assertTrue(
            domain_matches_official(
                "shop.northstar.example",
                "northstar.example",
            )
        )

    def test_deceptive_domain_suffix_does_not_match(self):
        self.assertFalse(
            domain_matches_official(
                "northstar.example.attacker.test",
                "northstar.example",
            )
        )

    def test_url_parser_does_not_fetch_urls(self):
        self.assertEqual(
            safe_external_domain("https://example.com/page"),
            "example.com",
        )

        self.assertIsNone(
            safe_external_domain("javascript:alert(1)")
        )

    def test_name_similarity(self):
        self.assertEqual(
            name_similarity("Northstar", "Northstar"),
            1.0,
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
