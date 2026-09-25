import copy
import unittest

import proxy_new_seed_board_partner_audit_179 as subject


class BoardPartnerAudit179Test(unittest.TestCase):
    def test_partner_classification_and_current_routes(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual('response_window', report['results'][-1]['next_opportunity'])

    def test_mutated_source_hash_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][2])
        row['source_continuation_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
