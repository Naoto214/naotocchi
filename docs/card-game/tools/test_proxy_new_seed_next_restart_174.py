import copy
import unittest

import proxy_new_seed_next_restart_174 as subject


class NextRestart174Test(unittest.TestCase):
    def test_two_partner_placements_and_closed_item_chain(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(3, report['new_events'])
        self.assertEqual(3, report['new_decisions'])
        self.assertTrue(all(not subject.validate_result(x) for x in report['results']))
        self.assertEqual('resolving', report['results'][-1]['final_continuation_state']
                         ['response_context']['chain_status'])

    def test_modified_hash_chain_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][-1])
        row['new_events'][0]['game_state_after_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
