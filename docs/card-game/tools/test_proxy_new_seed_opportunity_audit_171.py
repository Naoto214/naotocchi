import copy
import unittest

import proxy_new_seed_opportunity_audit_171 as subject


class OpportunityAudit171Test(unittest.TestCase):
    def test_saved_four_states_are_independently_audited(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual({'normal_action': 3, 'response_window': 1},
                         {kind: sum(row['next_opportunity'] == kind for row in report['results'])
                          for kind in ('normal_action', 'response_window')})

    def test_mutated_source_hash_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['source_continuation_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__':
    unittest.main()
