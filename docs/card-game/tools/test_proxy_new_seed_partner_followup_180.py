import copy
import unittest

import proxy_new_seed_partner_followup_180 as subject


class PartnerFollowup180Test(unittest.TestCase):
    def test_three_unique_passes_one_held_turn_end(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(3, report['new_events'])
        self.assertEqual(3, report['new_decisions'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual('turn_end', report['results'][-1]['final_continuation_state']
                         ['game_state']['phase'])

    def test_modified_hash_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][-1])
        row['new_events'][0]['continuation_state_after_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
