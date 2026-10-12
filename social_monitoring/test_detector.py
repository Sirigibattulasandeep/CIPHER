"""Tests for deterministic social monitoring analysis and import filters."""

import unittest

from social_monitoring.app_detector import AppCandidate, analyze_app_candidate, scan_app_candidates
from social_monitoring.detector import (
    BrandProfile,
    CandidateProfile,
    OfficialApp,
    OfficialAccount,
    RecordSource,
    SocialPost,
    analyze_candidate,
)
from social_monitoring.scanner import (
    ImportErrorDetail,
    demo_app_candidates,
    demo_candidates,
    filter_findings,
    parse_imported_apps_json,
    parse_imported_json,
    scan_candidates,
)


class TestSocialMonitoring(unittest.TestCase):
    def setUp(self):
        self.brand = BrandProfile(
            id="brand-northstar",
            name="Northstar",
            official_accounts=(OfficialAccount("DemoSocial", "@northstar"),),
            official_domains=("northstar.example",),
            aliases=("North Star",),
            industry="FinTech",
            official_apps=(OfficialApp(
                store="DemoStore", app_id="com.northstar.bank",
                name="Northstar Banking", publisher="Northstar Labs",
                store_url="https://store.example/northstar-bank",
                description="Manage your Northstar account and banking services.",
            ),),
        )

    def test_brand_profile_validation_accepts_configured_assets(self):
        self.assertEqual(self.brand.validation_errors(), ())

    def test_brand_profile_validation_reports_bad_assets_and_duplicates(self):
        invalid = BrandProfile(
            id="", name="",
            official_accounts=(OfficialAccount("", ""), OfficialAccount("", "")),
            official_domains=("https://bad domain", "https://bad domain"),
            official_apps=(OfficialApp("", "", ""), OfficialApp("", "", "")),
        )
        errors = invalid.validation_errors()
        self.assertIn("Brand ID is required.", errors)
        self.assertIn("Brand name is required.", errors)
        self.assertTrue(any("Invalid official domain" in error for error in errors))
        self.assertTrue(any("official social account" in error for error in errors))
        self.assertTrue(any("official app" in error for error in errors))

    def test_exact_official_handle_is_not_flagged_for_identity_alone(self):
        candidate = CandidateProfile(
            id="official-1", platform="DemoSocial", handle="@northstar",
            display_name="Northstar", profile_url="https://social.example/northstar",
        )
        finding = analyze_candidate(self.brand, candidate)
        self.assertEqual(finding.assessment.severity, "low")
        self.assertNotIn("handle_similarity", finding.indicators)
        self.assertEqual(finding.brand_id, "brand-northstar")

    def test_similar_handle_and_name_produce_explainable_evidence(self):
        candidate = CandidateProfile(
            id="lookalike-1", platform="DemoSocial", handle="@northstar",
            display_name="Northstar Support", profile_url="https://social.example/northstar-help",
        )
        # A punctuation-only exact handle is normalized as the configured handle.
        self.assertNotIn("handle_similarity", analyze_candidate(self.brand, candidate).indicators)

        candidate = CandidateProfile(
            id="lookalike-2", platform="DemoSocial", handle="@northstarr",
            display_name="Northstar Official Support", profile_url="https://social.example/northstarr",
        )
        finding = analyze_candidate(self.brand, candidate)
        self.assertIn("handle_similarity", finding.indicators)
        self.assertIn("support_language", finding.indicators)
        self.assertTrue(all(item.summary and item.detail for item in finding.evidence))

    def test_benign_fan_profile_remains_low_priority(self):
        candidate = CandidateProfile(
            id="fan-1", platform="DemoSocial", handle="@northstar_fan_club",
            display_name="Northstar Fan Club", bio="Unofficial community for fans.",
        )
        finding = analyze_candidate(self.brand, candidate)
        self.assertEqual(finding.assessment.severity, "low")
        self.assertEqual(finding.assessment.score, 0)

    def test_scam_post_and_typosquat_link_are_corroborated(self):
        candidate = CandidateProfile(
            id="scam-1", platform="DemoSocial", handle="@northstar_help24",
            display_name="Northstar Official Support",
            profile_url="https://social.example/northstar_help24",
            links=("https://northstarr.example.invalid/login",),
            posts=(SocialPost(
                "Claim your prize by paying a processing fee.",
                "https://social.example/post/123", "123",
            ),),
            avatar_similarity=0.91,
            source=RecordSource.IMPORTED,
        )
        finding = analyze_candidate(self.brand, candidate)
        self.assertIn("brand_domain_lookalike", finding.indicators)
        self.assertIn("payment_request", finding.indicators)
        self.assertGreaterEqual(finding.assessment.score, 70)
        self.assertEqual(finding.assessment.severity, "high")
        self.assertTrue(all(e.source_url or e.indicator in {"support_language", "official_affiliation_claim"}
                            for e in finding.evidence))

    def test_one_weak_signal_cannot_raise_severity(self):
        candidate = CandidateProfile(
            id="weak-1", platform="DemoSocial", handle="@northstar_fan", display_name="Fan",
            links=("https://unrelated.example/path",),
        )
        finding = analyze_candidate(self.brand, candidate)
        self.assertEqual(finding.assessment.severity, "low")

    def test_invalid_and_unlisted_urls_do_not_make_requests(self):
        candidate = CandidateProfile(
            id="url-1", platform="DemoSocial", handle="@someone",
            links=("javascript:alert(1)", "https://northstar.example.attacker.test"),
        )
        finding = analyze_candidate(self.brand, candidate)
        self.assertIn("invalid_url", finding.indicators)
        self.assertIn("unlisted_domain", finding.indicators)
        self.assertNotIn("brand_domain_lookalike", finding.indicators)

    def test_import_accepts_incomplete_records_and_marks_import_source(self):
        records = parse_imported_json('{"profiles":[{"platform":"DemoSocial"}]}')
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].handle, "")
        self.assertEqual(records[0].source, RecordSource.IMPORTED)
        self.assertIsNotNone(records[0].id)
        finding = analyze_candidate(self.brand, records[0])
        self.assertIn("record_completeness", finding.indicators)
        self.assertLess(finding.assessment.confidence, 0.5)

    def test_import_reports_bad_shape(self):
        with self.assertRaises(ImportErrorDetail):
            parse_imported_json('{"profiles":{"bad":"shape"}}')
        with self.assertRaises(ImportErrorDetail):
            parse_imported_json('{')

    def test_filters_apply_to_actual_scanned_findings(self):
        findings = scan_candidates(self.brand, demo_candidates())
        suspicious = filter_findings(findings, severity="high", source=RecordSource.DEMO)
        self.assertTrue(suspicious)
        self.assertTrue(all(f.source == RecordSource.DEMO for f in suspicious))
        self.assertTrue(all(f.assessment.severity == "high" for f in suspicious))
        self.assertTrue(filter_findings(findings, query="fan"))

    def test_profile_and_post_evidence_keep_timestamps_and_provenance(self):
        candidate = CandidateProfile(
            id="trace-1", platform="DemoSocial", handle="@northstar-help",
            profile_url="https://social.example/northstar-help",
            observed_at=demo_candidates()[0].observed_at,
            posts=(SocialPost("Send your OTP", "https://social.example/post/otp", "otp-1"),),
        )
        finding = analyze_candidate(self.brand, candidate)
        item = next(e for e in finding.evidence if e.indicator == "credential_request")
        self.assertEqual(item.source_url, "https://social.example/post/otp")
        self.assertIsNotNone(item.observed_at)
        self.assertEqual(finding.affected_profile_id, candidate.id)

    def test_exact_official_app_is_excluded(self):
        candidate = AppCandidate(
            id="official-app", store="DemoStore", app_id="com.northstar.bank",
            name="Northstar Banking", publisher="Northstar Labs",
            description="Manage your Northstar account and banking services.",
            store_url="https://store.example/northstar-bank",
        )
        finding = analyze_app_candidate(self.brand, candidate)
        self.assertEqual(finding.assessment.score, 0)
        self.assertEqual(finding.assessment.severity, "low")
        self.assertEqual(finding.asset_type, "mobile_app")
        self.assertEqual(finding.affected_asset_id, candidate.id)

    def test_app_name_spacing_and_character_swap_variants_are_detectable(self):
        spaced = AppCandidate(
            id="spaced-app", store="DemoStore", app_id="com.example.other",
            name="North Star Banking", publisher="Northstar Labs",
        )
        swapped = AppCandidate(
            id="swapped-app", store="DemoStore", app_id="com.example.other2",
            name="Northstar Bankign", publisher="Northstar Labs",
        )
        self.assertIn("app_name_similarity", analyze_app_candidate(self.brand, spaced).indicators)
        self.assertIn("app_name_similarity", analyze_app_candidate(self.brand, swapped).indicators)

    def test_app_added_words_are_combined_with_publisher_evidence(self):
        candidate = AppCandidate(
            id="added-word-app", store="DemoStore", app_id="com.example.support",
            name="Northstar Banking Support", publisher="Different Publisher",
            store_url="https://store.example/apps/support",
        )
        finding = analyze_app_candidate(self.brand, candidate)
        self.assertIn("app_name_similarity", finding.indicators)
        self.assertIn("publisher_mismatch", finding.indicators)
        self.assertEqual(finding.assessment.severity, "medium")

    def test_app_with_unrelated_name_stays_low_risk(self):
        candidate = AppCandidate(
            id="unrelated-app", store="DemoStore", app_id="com.example.sky",
            name="Stargazer Sky Guide", publisher="Open Sky Apps",
            description="Explore constellations and learn astronomy.",
        )
        finding = analyze_app_candidate(self.brand, candidate)
        self.assertEqual(finding.assessment.score, 0)
        self.assertEqual(finding.assessment.severity, "low")

    def test_suspicious_app_uses_multiple_explained_signals(self):
        candidate = AppCandidate(
            id="suspect-app", store="DemoStore", app_id="com.example.northstarr",
            name="Northstar Banking Support", publisher="Unknown Publisher",
            description="Official Northstar support. Claim your prize by paying a processing fee.",
            store_url="https://store.example/apps/northstarr",
            links=("https://northstarr.example.invalid/login",), logo_similarity=0.92,
            source=RecordSource.IMPORTED,
        )
        finding = analyze_app_candidate(self.brand, candidate)
        self.assertEqual(finding.assessment.severity, "high")
        self.assertIn("publisher_mismatch", finding.indicators)
        self.assertIn("official_affiliation_claim", finding.indicators)
        self.assertIn("payment_request", finding.indicators)
        self.assertIn("brand_domain_lookalike", finding.indicators)
        self.assertTrue(all(e.summary and e.detail for e in finding.evidence))

    def test_app_import_and_demo_source_labels(self):
        imported = parse_imported_apps_json('{"apps":[{"store":"DemoStore","name":"Example App"}]}')
        self.assertEqual(imported[0].source, RecordSource.IMPORTED)
        demo_results = [analyze_app_candidate(self.brand, app) for app in demo_app_candidates()]
        self.assertTrue(all(f.source == RecordSource.DEMO for f in demo_results))
        official_demo = next(f for f in demo_results if f.affected_asset_id == "demo-official-app")
        self.assertEqual(official_demo.assessment.score, 0)

    def test_app_batch_scan_feeds_the_same_finding_filters(self):
        findings = scan_app_candidates(self.brand, demo_app_candidates())
        high_priority = filter_findings(findings, platform="DemoStore", severity="high")
        self.assertTrue(high_priority)
        self.assertTrue(all(f.asset_type == "mobile_app" for f in high_priority))


if __name__ == "__main__":
    unittest.main(verbosity=2)
