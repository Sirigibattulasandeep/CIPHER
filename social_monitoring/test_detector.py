"""Tests for deterministic social monitoring analysis and import filters."""

import unittest

from social_monitoring.detector import (
    BrandProfile,
    CandidateProfile,
    OfficialAccount,
    RecordSource,
    SocialPost,
    analyze_candidate,
)
from social_monitoring.scanner import (
    ImportErrorDetail,
    demo_candidates,
    filter_findings,
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
        )

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


if __name__ == "__main__":
    unittest.main(verbosity=2)
