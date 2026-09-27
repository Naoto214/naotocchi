import unittest
import proxy_new_seed_mixed_audit_291 as subject


class MixedAudit291Tests(unittest.TestCase):
    def test_two_end_responses_and_two_six_stage_end_proofs(self):
        report = subject.build_report()
        rows = report['results']
        self.assertEqual(2, sum(x['next_opportunity'] == 'turn_end_response' for x in rows))
        self.assertEqual(2, sum(x['next_opportunity'] == 'turn_end' and x['turn_end_set_complete'] for x in rows))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
