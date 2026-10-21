import unittest

import proxy_new_seed_mixed_audit_309 as subject


class MixedAudit309Tests(unittest.TestCase):
    def test_resolution_response_and_end_proofs(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('resolve_board_ability', rows['probe-01-a-first']['next_opportunity'])
        self.assertTrue(rows['probe-02-b-first']['turn_end_set_complete'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
