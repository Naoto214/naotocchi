import copy
import unittest

import proxy_new_seed_r2_boundary_audit_182 as subject


class R2BoundaryAudit182Test(unittest.TestCase):
    def test_all_four_current_boundaries(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        for row in report['results']:
            self.assertEqual([], subject.validate_result(row))
            if row['next_opportunity'] == 'turn_end':
                self.assertTrue(row['turn_end_set_complete'])
                self.assertEqual([], row['contract_stop_codes'])
                self.assertTrue(all(row['completeness_checks'].values()))
            else:
                self.assertEqual(['response-pass'], row['candidate_ids'])
                self.assertTrue(row['candidate_set_complete'])
        self.assertEqual(2, sum(row['next_opportunity'] == 'turn_end' for row in report['results']))

    def test_modified_proof_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['source_game_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__':
    unittest.main()
