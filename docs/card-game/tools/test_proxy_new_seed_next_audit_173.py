import copy
import unittest

import proxy_new_seed_next_audit_173 as subject


class NextAudit173Test(unittest.TestCase):
    def test_two_safe_partner_decisions_and_chain_response(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual(2, sum(bool(row['selected_decision']) for row in report['results']))
        self.assertEqual(1, sum(row['next_opportunity'] == 'response_window' for row in report['results']))

    def test_corrupted_source_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['source_game_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
