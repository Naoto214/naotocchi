import hashlib
import unittest

import proxy_new_seed_mixed_audit_268 as subject


class MixedAudit268Tests(unittest.TestCase):
    def test_saved_boundary_and_correction(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('A', rows['probe-02-b-first']['priority_actor'])
        self.assertEqual('building', rows['probe-02-b-first']['chain_status'])
        self.assertEqual('activation_zone', rows['probe-02-b-first']['coin_source_zone'])
        self.assertEqual('requires_own_discarded_companion', rows['probe-02-b-first']['shogi_exclusion'])
        self.assertEqual('board_only_ability_source_in_hand', rows['probe-02-b-first']['box_exclusion'])
        self.assertEqual(['response-pass'], rows['probe-01-b-first']['candidate_ids'])
        for path in ('probe-01-a-first', 'probe-02-a-first'):
            self.assertTrue(rows[path]['turn_end_set_complete'])
            self.assertTrue(all(rows[path]['completeness_checks'].values()))
        self.assertEqual(subject.SOURCE_RAW_SHA256, hashlib.sha256(subject.SOURCE.read_bytes()).hexdigest())
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
